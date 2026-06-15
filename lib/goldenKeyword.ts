/**
 * 황금 키워드 필터·스코어링.
 *
 * 네이버 연관키워드(lib/naverKeyword.ts에서 받음)를 4단계로 거른다:
 *   필터1 검색량 / 필터2 경쟁도  → 순수 로직(AI 無, 즉시·무료)
 *   필터3 검색 의도 / 필터4 주제 일관성 → haiku 배치 1회(필터1·2로 줄인 뒤에만 호출 = 비용 통제)
 *
 * 전략: 신규·소규모 블로그용 → "검색은 되는데 경쟁 낮은" 키워드 우선.
 *       그래서 정렬은 경쟁도(낮음 먼저)를 1순위로 두고, 같은 경쟁도 안에서 검색량으로 줄세운다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { parseCount, type NaverKeyword } from "./naverKeyword";

// 필터1 임계값
const MIN_MOBILE_SEARCHES = 100; // 월 모바일 검색 100 미만 = 써도 방문 거의 없음 → 제외
const HIGH_VOLUME_THRESHOLD = 10_000; // 초과 시 제외 아님 — 대형 블로그 경쟁 가능성 '경고'만

// 필터2: 경쟁도 등급(낮을수록 신규 블로그에 유리). "높음"은 제외.
const COMP_TIER: Record<string, number> = { 낮음: 0, 중간: 1 };

// 거래/조회형 사전 필터(무료·규칙, AI 호출 전): 블로그로 유입이 안 되는 키워드를 미리 뺀다.
// → AI(필터3·4)에 보낼 후보를 줄여 비용을 낮추고, 정보형이 상위로 올라오게 한다.
// (티커·주가·환율 같은 '숫자 조회' 검색은 애드센스 수익이 안 됨)
const TRANSACTIONAL_WORDS = [
  "주가", "시세", "환율", "증시", "실시간", "차트", "배당금", "공모주", "청약",
  "상장일", "매매", "분양", "최저가", "중고", "렌트", "예약", "쿠팡", "직구", "할인",
];
// 정보형으로 통하는 한국 금융 약어(영문이라도 살린다)
const ACRONYM_ALLOWLIST = new Set([
  "ETF", "ETN", "CMA", "ISA", "IRP", "P2P", "ELS", "DLS", "REITS", "ROE", "PER", "PBR", "GDP",
]);

/** 거래/조회형으로 보이면 true(제외 대상). 티커(KODEX200·SOXL 등)와 'OO주가/환율' 류를 무료로 거른다. */
function isTransactionalKeyword(keyword: string): boolean {
  if (TRANSACTIONAL_WORDS.some((w) => keyword.includes(w))) return true;
  // 한글이 전혀 없고 짧은 영문/숫자 = 티커 가능성(단, 정보형 약어는 허용)
  const hasHangul = /[가-힣]/.test(keyword);
  if (!hasHangul) {
    const upper = keyword.replace(/\s+/g, "").toUpperCase();
    if (ACRONYM_ALLOWLIST.has(upper)) return false;
    // 영문/숫자/기호로만 이뤄진 7자 이하 토큰(KODEX200, SOXL, SPY 등)
    if (/^[A-Z0-9.\-]{2,7}$/.test(upper)) return true;
  }
  return false;
}

/** 필터1·2 통과 + 점수가 매겨진 후보. (score·tier는 내부 정렬용 — 화면 비노출) */
export interface ScoredKeyword {
  keyword: string;
  monthlyMobileQcCnt: number; // 파싱된 숫자(모바일)
  monthlyPcQcCnt: number;
  compIdx: string; // 낮음/중간
  adDepth: number; // plAvgDepth
  highVolume: boolean; // >10,000 경고 플래그
}

/** 화면·API로 내보내는 최종 형태. */
export interface GoldenKeyword {
  keyword: string;
  monthlyMobileQcCnt: number;
  compIdx: string;
  highVolume: boolean;
}

/**
 * 필터1(검색량) + 필터2(경쟁도) 적용 후 점수순 정렬.
 * 정렬: 경쟁도 낮음 우선(1순위) → 같은 등급 내에서 검색량 많은 순(2순위, 광고 적을수록 가산).
 */
export function filterAndScore(list: NaverKeyword[]): ScoredKeyword[] {
  const seen = new Set<string>();
  const candidates: ScoredKeyword[] = [];

  for (const k of list) {
    const keyword = String(k.relKeyword ?? "").trim();
    if (!keyword || seen.has(keyword)) continue;

    const mobile = parseCount(k.monthlyMobileQcCnt);
    // 필터1: 너무 적은 검색량 제외
    if (mobile < MIN_MOBILE_SEARCHES) continue;

    // 거래/조회형 사전 제외(무료 규칙) — AI에 보내기 전에 티커·주가·환율 류를 뺀다
    if (isTransactionalKeyword(keyword)) continue;

    // 필터2: 높음(또는 알 수 없는 등급) 제외
    const compIdx = String(k.compIdx ?? "");
    if (!(compIdx in COMP_TIER)) continue;

    seen.add(keyword);
    candidates.push({
      keyword,
      monthlyMobileQcCnt: mobile,
      monthlyPcQcCnt: parseCount(k.monthlyPcQcCnt),
      compIdx,
      adDepth: typeof k.plAvgDepth === "number" ? k.plAvgDepth : parseCount(k.plAvgDepth as never),
      highVolume: mobile > HIGH_VOLUME_THRESHOLD,
    });
  }

  // 경쟁도 낮음 먼저 → 광고 적을수록 살짝 가산한 검색량 점수 내림차순
  candidates.sort((a, b) => {
    const tierA = COMP_TIER[a.compIdx];
    const tierB = COMP_TIER[b.compIdx];
    if (tierA !== tierB) return tierA - tierB; // 낮음(0)이 위로
    return scoreWithin(b) - scoreWithin(a);
  });

  return candidates;
}

/** 같은 경쟁등급 내 정렬용 점수: 검색량 ÷ (광고 많을수록 페널티). 내부 전용. */
function scoreWithin(k: ScoredKeyword): number {
  return k.monthlyMobileQcCnt / (1 + k.adDepth * 0.2);
}

export interface ClassifyResult {
  keep: Set<string>; // 통과한 키워드
  usage: { inputTokens?: number; outputTokens?: number } | null;
  usedAi: boolean; // 실제 AI를 탔는지(false = fail-open으로 전량 통과)
}

/**
 * 필터3(검색 의도: 정보형만) + 필터4(주제 일관성)를 haiku 배치 1회로 판별.
 * - 정보형(방법·이유·증상·후기·추천·차이·효과) 통과 / 거래형(구매·분양·가격·최저가·쿠팡·할인) 제외
 * - 입력 주제와 의미적으로 동떨어진 것 제거
 * - fail-open: 키 없음/오류/파싱 실패 시 전량 통과(제품이 멈추지 않게). usedAi=false.
 *
 * @param topic 입력 주제
 * @param keywords 필터1·2로 이미 줄인 후보(수십 개 권장 — 비용 통제)
 */
export async function classifyInformational(topic: string, keywords: string[]): Promise<ClassifyResult> {
  if (keywords.length === 0) return { keep: new Set(), usage: null, usedAi: false };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { keep: new Set(keywords), usage: null, usedAi: false };

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content:
            `주제 "${topic}"에 대한 블로그 키워드 후보 목록이야. 아래 두 조건을 **모두** 만족하는 키워드만 골라줘.\n\n` +
            `[조건1) 검색 의도가 '정보형']\n` +
            `- 통과: 방법·이유·증상·후기·추천·비교·차이·효과·원인·주의점 등 '정보를 찾는' 검색 (블로그로 유입돼 애드센스 수익이 됨)\n` +
            `- 제외: 구매·분양·최저가·가격·쿠팡·할인·중고·매매·예약 등 '거래/구매' 검색 (블로그로 안 들어옴)\n\n` +
            `[조건2) 주제 관련성]\n` +
            `- 입력 주제 "${topic}"와 의미적으로 관련된 것만. 동떨어진 키워드(광고주가 묶어놓은 무관한 것)는 제외.\n\n` +
            `후보:\n${keywords.map((k, i) => `${i + 1}. ${k}`).join("\n")}\n\n` +
            `통과한 키워드만 JSON 문자열 배열로만 출력. 설명·번호 없이. 예: ["강아지 분리불안 증상","강아지 사료 추천 기준"]`,
        },
      ],
    });

    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      // 파싱 실패 → fail-open(전량 통과)이되 비용은 기록되게 usage는 반환
      return { keep: new Set(keywords), usage: usageOf(res), usedAi: false };
    }
    const arr = JSON.parse(match[0]);
    const input = new Set(keywords);
    const keep = new Set<string>();
    if (Array.isArray(arr)) {
      for (const x of arr) {
        const s = typeof x === "string" ? x.trim() : "";
        if (s && input.has(s)) keep.add(s); // 모델이 임의로 만든 키워드는 무시(후보 안의 것만)
      }
    }
    return { keep, usage: usageOf(res), usedAi: true };
  } catch {
    return { keep: new Set(keywords), usage: null, usedAi: false }; // fail-open
  }
}

function usageOf(res: Anthropic.Message): { inputTokens?: number; outputTokens?: number } {
  return { inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens };
}
