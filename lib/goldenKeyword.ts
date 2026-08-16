/**
 * 황금 키워드 — B 구조 (AI 재구성 + 재검증).
 *
 *   1) 네이버 시드(단어) 수집 → 2) 시드 정제(filterAndScore)
 *   3) AI 재구성(reconstructKeywords, haiku 1회): 단어 → 정보형 롱테일 '구'
 *   4) 재검증(네이버 fetchKeywordStats): 실제 검색량 없는 '가짜' 제거
 *   5) 스위트스팟 스코어(scoreValidated): 검색 500~5,000 우대 + 경쟁 낮음 우선
 *
 * 전략: 신규·소규모 블로그용 → "검색은 되는데 경쟁 낮은" 정보형 글감 우선.
 */
import Anthropic from "@anthropic-ai/sdk";
import { parseCount, normalizeKey, type NaverKeyword, type KeywordStat } from "./naverKeyword";

// 검색량 임계값
const MIN_MOBILE_SEARCHES = 100; // 시드 정제용 하한
const HIGH_VOLUME_THRESHOLD = 10_000; // 초과 = 대형 블로그 경쟁 가능성 '경고'(제외 아님)

// 경쟁도 등급(낮을수록 신규 블로그에 유리). "높음"은 제외.
const COMP_TIER: Record<string, number> = { 낮음: 0, 중간: 1 };

// 거래/조회형 사전 필터(무료·규칙): 블로그로 유입이 안 되는 키워드를 미리 뺀다(티커·주가·환율 등).
const TRANSACTIONAL_WORDS = [
  "주가", "시세", "환율", "증시", "실시간", "차트", "배당금", "공모주", "청약",
  "상장일", "매매", "분양", "최저가", "중고", "렌트", "예약", "쿠팡", "직구", "할인",
];
const ACRONYM_ALLOWLIST = new Set([
  "ETF", "ETN", "CMA", "ISA", "IRP", "P2P", "ELS", "DLS", "REITS", "ROE", "PER", "PBR", "GDP",
]);

/** 거래/조회형으로 보이면 true(제외). 티커(KODEX200·SOXL)와 'OO주가/환율' 류를 무료로 거른다. */
export function isTransactionalKeyword(keyword: string): boolean {
  if (TRANSACTIONAL_WORDS.some((w) => keyword.includes(w))) return true;
  const hasHangul = /[가-힣]/.test(keyword);
  if (!hasHangul) {
    const upper = keyword.replace(/\s+/g, "").toUpperCase();
    if (ACRONYM_ALLOWLIST.has(upper)) return false;
    if (/^[A-Z0-9.\-]{2,7}$/.test(upper)) return true; // 짧은 영문/숫자 = 티커 가능성
  }
  return false;
}

/** 시드 정제 결과(내부 — AI 재료/폴백용). */
export interface ScoredKeyword {
  keyword: string;
  monthlyMobileQcCnt: number;
  compIdx: string;
  highVolume: boolean;
}

/** 화면·API로 내보내는 최종 형태. */
export interface GoldenKeyword {
  keyword: string;
  monthlyMobileQcCnt: number;
  compIdx: string;
  highVolume: boolean;
  /** true = 정확 검색량이 없어 '핵심(2단어)' 검색량으로 추정한 값(자연 질문형). 화면에 '추정' 표시 */
  estimated: boolean;
}

/**
 * 시드 정제: 네이버 연관키워드에서 거래형·저검색·고경쟁을 제거하고 검색량순으로 추린다.
 * → AI 재구성에 넣을 '재료 단어'(상위 N) 추출 + 폴백 후보로 사용.
 */
export function filterAndScore(list: NaverKeyword[]): ScoredKeyword[] {
  const seen = new Set<string>();
  const out: ScoredKeyword[] = [];
  for (const k of list) {
    const keyword = String(k.relKeyword ?? "").trim();
    if (!keyword || seen.has(keyword)) continue;
    const mobile = parseCount(k.monthlyMobileQcCnt);
    if (mobile < MIN_MOBILE_SEARCHES) continue;
    if (isTransactionalKeyword(keyword)) continue;
    const compIdx = String(k.compIdx ?? "");
    if (!(compIdx in COMP_TIER)) continue;
    seen.add(keyword);
    out.push({ keyword, monthlyMobileQcCnt: mobile, compIdx, highVolume: mobile > HIGH_VOLUME_THRESHOLD });
  }
  // 검색량 많은 순(재료는 풍부한 단어 위주)
  out.sort((a, b) => b.monthlyMobileQcCnt - a.monthlyMobileQcCnt);
  return out;
}

export interface ReconstructResult {
  phrases: string[];
  usage: { inputTokens?: number; outputTokens?: number } | null;
  usedAi: boolean; // false = 키 없음/오류(폴백으로 진행)
}

/**
 * AI 재구성(haiku 1회): 시드 단어 + 주제 → 사람들이 실제 검색할 '정보형 롱테일 구' 30~40개.
 * - 2~3단어 구 우선(4단어+는 네이버 데이터가 없어 재검증서 탈락), 단일 명사 단독 금지
 * - 거래형 금지, 정보형만, 같은 소재 각도 다양화
 * - fail-open: 키/오류/파싱 실패 시 빈 배열(라우트가 폴백)
 */
export async function reconstructKeywords(topic: string, seeds: string[]): Promise<ReconstructResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { phrases: [], usage: null, usedAi: false };

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1600,
      messages: [
        {
          role: "user",
          content:
            `'${topic}' 주제로 한국어 블로그 글을 쓰려고 해. 아래는 네이버 연관 검색어(단어 위주)야.\n` +
            `이 단어들을 재료 삼아, **사람들이 실제로 검색할 만한 정보형 롱테일 키워드(구)** 40~45개를 만들어줘.\n\n` +
            `규칙:\n` +
            `- 2~3단어로 된 '구' 형태. 단일 명사 한 단어(예: "사료","명견")만 있는 건 금지.\n` +
            `- **각도를 골고루 펼쳐라(가장 중요).** 아래 각 묶음에서 비슷한 개수씩:\n` +
            `  · 건강/증상/질병: 설사·구토·피부병·슬개골·심장사상충·예방접종 …\n` +
            `  · 먹이/사료/간식: 사료 추천·안 먹을 때·양 조절·수제 간식 …\n` +
            `  · 행동/훈련: 분리불안·배변 훈련·짖음·물어뜯기·사회화 …\n` +
            `  · 미용/관리: 목욕 주기·양치·발톱·털 관리·귀 청소 …\n` +
            `  · 입양/돌봄/생활: 입양 준비·실내 온도·산책·여름 더위 …\n` +
            `  · 특징/품종/수명: — 이 묶음은 **전체의 1/5 이하**로만. "OO 수명"은 최대 2개.\n` +
            `- 같은 끝말(예: "…수명","…종류","…방법")이 3개 넘게 반복되지 않게.\n` +
            `- 정보형만(추천·방법·증상·원인·효과·비교·주의점 등). 거래형 금지(분양·가격·최저가·중고·구매·예약).\n` +
            `- 주제 '${topic}'와 관련된 것만. 무관한 재료 단어는 버려.\n` +
            `- 4단어 이상으로 너무 길게 만들지 마(실제 검색량이 잡히는 2~3단어 위주). 연도(2024 등) 넣지 마.\n\n` +
            `재료 단어: ${seeds.join(", ")}\n\n` +
            `출력: JSON 문자열 배열만. 설명·번호 없이.\n` +
            `예: ["강아지 설사 원인","강아지 사료 안 먹을 때","강아지 분리불안 해결","강아지 양치 방법","강아지 여름 더위"]`,
        },
      ],
    });

    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const usage = { inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens };
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return { phrases: [], usage, usedAi: true };

    const arr = JSON.parse(match[0]);
    const seen = new Set<string>();
    const phrases: string[] = [];
    if (Array.isArray(arr)) {
      for (const x of arr) {
        const s = (typeof x === "string" ? x : "").trim().replace(/^["'#\-•\d.\s]+/, "").slice(0, 60);
        const norm = normalizeKey(s);
        if (s && norm && !seen.has(norm)) {
          seen.add(norm);
          phrases.push(s);
        }
      }
    }
    return { phrases: phrases.slice(0, 45), usage, usedAi: true };
  } catch {
    return { phrases: [], usage: null, usedAi: false };
  }
}

/** 스위트스팟 검색량 점수(0~1): 500~5,000 최고, 양 끝 감소. (>5,000은 경쟁↑로 감점) */
function volumeScore(mobile: number): number {
  if (mobile < 500) return 0.5 + (0.5 * (mobile - 300)) / 200; // 300→0.5, 500→1.0
  if (mobile <= 5000) return 1;
  return Math.max(0.3, 5000 / mobile); // 10,000→0.5, 더 크면 더 낮게
}

/** 황금 점수: 스위트스팟 검색량 × 경쟁도(낮음 우대) × 광고수(적을수록 가산). 내부 정렬 전용. */
function goldenScore(stat: KeywordStat): number {
  const compW = stat.compIdx === "낮음" ? 1 : 0.7; // 낮음 우대(높음은 호출 전에 제외됨)
  const adW = 1 / (1 + stat.adDepth * 0.1);
  return volumeScore(stat.mobile) * compW * adW;
}

/** 구의 '핵심' = 앞 2단어(예: "강아지 사료 안 먹을 때" → "강아지 사료"). 정규화 키 반환. */
export function headKey(phrase: string): string {
  const parts = phrase.trim().split(/\s+/);
  return normalizeKey(parts.slice(0, 2).join(" "));
}

/**
 * 재검증·스코어링 (하이브리드): AI 구를 네이버 풀에서 조회.
 *  - 정확 일치 있으면 그 검색량 사용(estimated=false)
 *  - 없으면 '핵심(앞 2단어)' 검색량으로 검증·대체(estimated=true) → 자연 질문형도 살림
 *  - 정확/핵심 둘 다 없거나 검색량 미달이면 제외(가짜 컷)
 * @param minMobile 정확 일치 시 모바일 하한
 * @param headMinMobile 핵심 검증 시 하한(핵심은 더 넓으므로 약간 높게)
 */
export function scoreValidated(
  phrases: string[],
  pool: Map<string, KeywordStat>,
  minMobile: number,
  headMinMobile: number,
  limit: number,
): GoldenKeyword[] {
  const seen = new Set<string>();
  const cands: { g: GoldenKeyword; score: number }[] = [];
  for (const p of phrases) {
    const key = normalizeKey(p);
    if (!key || seen.has(key)) continue;

    let stat: KeywordStat | undefined;
    let estimated = false;
    const exact = pool.get(key);
    if (exact && exact.mobile >= minMobile && exact.compIdx in COMP_TIER) {
      stat = exact;
    } else {
      const hKey = headKey(p);
      const head = hKey && hKey !== key ? pool.get(hKey) : undefined;
      if (head && head.mobile >= headMinMobile && head.compIdx in COMP_TIER) {
        stat = head;
        estimated = true; // 정확 검색량 없음 → 핵심 기준 추정
      }
    }
    if (!stat) continue; // 정확·핵심 둘 다 검증 실패 = 수요 근거 없음 → 제외

    seen.add(key);
    cands.push({
      g: {
        keyword: p.trim(), // 화면엔 읽기 좋은 AI 구(공백 포함)로 노출
        monthlyMobileQcCnt: stat.mobile,
        compIdx: stat.compIdx,
        highVolume: stat.mobile > HIGH_VOLUME_THRESHOLD,
        estimated,
      },
      score: goldenScore(stat) * (estimated ? 0.9 : 1), // 정확검증을 살짝 우대
    });
  }
  // 정렬: 경쟁 '낮음'을 상위로(신규 블로그 우대) → 같은 등급 안에서 황금 점수순
  cands.sort((a, b) => {
    const ta = COMP_TIER[a.g.compIdx] ?? 9;
    const tb = COMP_TIER[b.g.compIdx] ?? 9;
    if (ta !== tb) return ta - tb; // 낮음(0)이 보통(1)보다 위
    return b.score - a.score;
  });

  // 다양성 캡: 같은 끝말(예: "…수명","…종류")이 화면을 도배하지 않게 끝말당 최대 N개
  const MAX_PER_TAIL = 2;
  const tailCount = new Map<string, number>();
  const picked: GoldenKeyword[] = [];
  const overflow: GoldenKeyword[] = [];
  for (const c of cands) {
    const parts = c.g.keyword.trim().split(/\s+/);
    const tail = parts.length > 1 ? parts[parts.length - 1] : c.g.keyword;
    const n = tailCount.get(tail) ?? 0;
    if (n < MAX_PER_TAIL) {
      tailCount.set(tail, n + 1);
      picked.push(c.g);
    } else {
      overflow.push(c.g); // 캡 초과분은 뒤로 미룬다(부족하면 채움)
    }
    if (picked.length >= limit) break;
  }
  // 캡 때문에 limit을 못 채우면 미뤘던 것으로 보충
  for (const g of overflow) {
    if (picked.length >= limit) break;
    picked.push(g);
  }
  return picked;
}
