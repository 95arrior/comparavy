// ★결핍 레이더(2026-08-10) — 지식iN 최신 질문 + 카페 버즈에서 '돈 결핍' 소재를 수확한다.
//
//  왜 이 소스인가(유저: "어드바이저 정보 별로야, 다른 아이디어"):
//   어드바이저 인기유입검색어는 후행지표다 — 남들이 이미 유입을 먹은 뒤에 보인다.
//   지식iN 질문은 결핍의 직접 실측이고(몰라서 묻는 사람 = 우리 글의 독자 그 자체),
//   카페 버즈는 앱테크·이벤트가 검색보다 먼저 도는 곳이다. 사다리 위쪽에서 잡는다.
//  실물 근거(2026-08-10 실측): 지식iN 최신순에서 "청년미래적금 갈아타기 후 해지 방법" 같은
//   즉시 글감이 되는 질문이 실시간으로 올라온다.
//
//  판정 뼈대는 답안지 레인과 동일: 결핍 정규화 → 안전 게이트 → 이미 심은 것 제외 → 문서수 실측(1만 컷).

import Anthropic from "@anthropic-ai/sdk";
import { fetchBlogTotalDetailed } from "./naverBlogSearch";
import { isUnsafeKeyword } from "./keywordSafety";
import { DOC_HARD_MAX } from "./topicScore";
import { logUsage } from "./usageLog";

// 결핍 축 — 돈이 들어오거나(지원금·이벤트·금리) 나가는(세금·보험료·연체) 자리만.
const KIN_QUERIES = [
  "지원금 신청", "적금 금리", "환급 받는법", "연말정산", "청약 조건",
  "대출 금리", "퇴직금 세금", "건강보험료", "포인트 현금화",
];
const CAFE_QUERIES = ["은행 이벤트", "앱테크 이벤트", "적금 특판", "카드 혜택"];
// ★돈 뉴스(포모) 축(2026-08-10 유저: "포모 오는 돈 뉴스가 없는데") — '지금 터진 돈 사건'.
//  단, 예고형 대형 발표 추격은 함정이다(부동산 공급대책 3일 6회 실측) — 마감·특판·출시·공시형만 담는다.
const NEWS_QUERIES = ["적금 특판 출시", "지원금 신청 마감", "무상증자 결정", "환급 신청 시작", "은행 이벤트 선착순", "금리 인상 예금"];
// ★분야 정합 코드 게이트(2026-08-10 유저: "폭스바겐 아틀라스가 왜 나오지, 난 경제 블로그인데") —
//  결핍 판정을 모델에만 맡기면 '할인=돈'으로 자동차·여행 프로모션이 샌다. 판단은 코드가 한다:
//  경제·재테크 신호어가 하나도 없는 키워드는 후보 자격이 없다(포지티브 게이트 — 블랙리스트는 늘 뚫린다).
export const MONEY_SIGNAL_RE = /(금리|적금|예금|대출|보험료|연금|국민연금|퇴직|세금|소득세|재산세|종부세|공제|연말정산|환급|절세|지원금|보조금|장려금|수당|바우처|급여|계좌|통장|청약|분양|전세|월세|등기|무상증자|유상증자|배당|공모주|권리락|주식|증권|isa|etf|채무|회생|파산|신용|카드|캐시백|페이|포인트|앱테크|패스|민생|건강보험|국민취업|실업급여|재테크)/i;

export interface RawBuzz { title: string; src: "kin" | "cafe" | "news" }
export interface RadarCandidate { keyword: string; src: "kin" | "cafe" | "news"; heat: number }

const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

async function searchNaver(kind: "kin" | "cafearticle" | "news", query: string, display: number): Promise<string[]> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID;
  const secret = process.env.NAVER_DATALAB_SECRET;
  if (!id || !secret) return [];
  try {
    const res = await fetch(`https://openapi.naver.com/v1/search/${kind}.json?query=${encodeURIComponent(query)}&sort=date&display=${display}`, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: { title?: string }[] };
    return (data.items ?? []).map((i) => strip(String(i.title ?? ""))).filter((t) => t.length >= 6);
  } catch { return []; }
}

/** 원료 수확 — 지식iN·카페 최신글 제목. 실패한 쿼리는 조용히 건너뛴다(부분 수확이 0 수확보다 낫다). */
export async function harvestBuzz(): Promise<RawBuzz[]> {
  const out: RawBuzz[] = [];
  for (const q of KIN_QUERIES) {
    for (const t of await searchNaver("kin", q, 8)) out.push({ title: t, src: "kin" });
    await new Promise((r) => setTimeout(r, 120));
  }
  for (const q of CAFE_QUERIES) {
    for (const t of await searchNaver("cafearticle", q, 8)) out.push({ title: t, src: "cafe" });
    await new Promise((r) => setTimeout(r, 120));
  }
  for (const q of NEWS_QUERIES) {
    for (const t of await searchNaver("news", q, 6)) out.push({ title: t, src: "news" });
    await new Promise((r) => setTimeout(r, 120));
  }
  // 제목 중복 제거(같은 질문이 여러 쿼리에 걸림)
  const seen = new Set<string>();
  return out.filter((b) => { const k = b.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

/**
 * 결핍 정규화 — 원료 제목 더미를 '검색형 키워드'로 압축한다(haiku 1회).
 *  같은 소재의 질문이 몰리면 heat가 올라간다 = 결핍이 뜨겁다는 실측.
 *  ★돈이 걸리지 않은 것(스포츠·가십·사건사고·광고성)은 여기서 떨어진다 — 결핍 검사의 코드화 1단계.
 */
export async function condenseBuzz(raw: RawBuzz[], userId?: string | null): Promise<RadarCandidate[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || raw.length === 0) return [];
  const kinList = raw.filter((r) => r.src === "kin").map((r) => `- ${r.title}`).join("\n").slice(0, 6000);
  const cafeList = raw.filter((r) => r.src === "cafe").map((r) => `- ${r.title}`).join("\n").slice(0, 4000);
  const newsList = raw.filter((r) => r.src === "news").map((r) => `- ${r.title}`).join("\n").slice(0, 4000);
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 900,
    messages: [{
      role: "user",
      content: [
        "아래는 방금 수확한 네이버 지식iN 최신 질문(kin)·카페 최신글(cafe)·돈 뉴스(news) 제목이다.",
        "돈 벌고 싶거나 돈 나갈까 걱정하는 사람이 실제로 검색할 '검색형 키워드'(명사구, 2~5어절)로 압축해라.",
        "★이 블로그는 경제·재테크 전문이다. 금융·세금·정부지원·연금·부동산·주식·앱테크 소재만 남겨라.",
        "  자동차·여행·쇼핑·가전 같은 소비 프로모션은 돈이 걸려 있어도 전부 버려라(할인은 재테크가 아니다).",
        "★규칙:",
        "- 돈이 들어오거나 나가는 소재만(지원금·금리·이벤트·환급·세금·보험료·연금·청약·앱테크). 스포츠·가십·사건사고·구인·광고·스캠 뉴스는 버려라.",
        "- 특정 개인 이름·상호가 주어인 것은 버려라.",
        "- 같은 소재의 항목은 하나로 묶고 개수를 n에 적어라(몇 건이 몰렸는지가 신호다).",
        "- 키워드는 사람들이 검색창에 칠 법한 자연스러운 말로(질문문 금지, 예: '청년미래적금 중도 해지').",
        "★가장 중요: 일반명사 하나로 뭉개지 마라. 질문에 든 구체 상황·조건을 꼬리로 반드시 유지해라 —",
        "  '청년미래적금 갈아타기 후 해지 방법'은 '청년미래적금'(대형 키워드, 못 이김)이 아니라",
        "  '청년미래적금 갈아타기 해지'(그 상황을 검색할 사람이 실제로 있는 롱테일)다.",
        "  상황 꼬리가 없는 한 단어짜리 대형 키워드는 아예 내지 마라.",
        "★news는 '놓치면 손해'(포모)만 골라라: 특판 출시·신청 마감·선착순·무상증자·환급 시작처럼 기한이나 한정이 걸린 것.",
        "  정부 대책·시장 전망 같은 대형 헤드라인 뉴스는 버려라 — 언론이 점령해서 블로그가 못 이긴다.",
        "  news 키워드에는 대상 이름을 살려라(예: '○○은행 특판 적금 조건', '○○ 무상증자 일정').",
        '출력은 JSON 배열만: [{"k":"청년미래적금 중도 해지","src":"kin","n":2}]. 최대 15개.',
        "",
        "[kin]", kinList, "", "[cafe]", cafeList, "", "[news]", newsList,
      ].join("\n"),
    }],
  });
  void logUsage({ userId, model: "claude-haiku-4-5", kind: "lack_radar", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
  const t = res.content.find((b) => b.type === "text");
  const m = /\[[\s\S]*\]/.exec(t && t.type === "text" ? t.text : "");
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]) as { k?: string; src?: string; n?: number }[];
    return arr
      .map((x) => ({ keyword: String(x.k ?? "").trim().slice(0, 40), src: (x.src === "cafe" || x.src === "news" ? x.src : "kin") as "kin" | "cafe" | "news", heat: Math.max(1, Math.min(20, Number(x.n) || 1)) }))
      .filter((x) => x.keyword.length >= 2)
      .filter((x) => MONEY_SIGNAL_RE.test(x.keyword)) // ★분야 게이트 — 모델이 봐줘도 코드가 자른다
      .slice(0, 15);
  } catch { return []; }
}

export interface RadarItem { keyword: string; src: "kin" | "cafe" | "news"; heat: number; docs: number | null; verdict: "direct" | "variant" | "written" | "unmeasured" | "blocked"; reason?: string }

/** 후보 → 판정(답안지 레인과 같은 뼈대). written/브랜드 허용은 호출측이 프로필로 만든 걸 받는다. */
export async function judgeCandidates(cands: RadarCandidate[], opts: { written: Set<string>; normalize: (k: string) => string; allowFinanceBrand: boolean; budgetMs?: number }): Promise<RadarItem[]> {
  const items: RadarItem[] = [];
  const startedAt = Date.now();
  const budget = opts.budgetMs ?? 30_000;
  let measured = 0;
  let backedOff = false;
  for (const c of cands) {
    if (opts.written.has(opts.normalize(c.keyword))) {
      items.push({ ...c, docs: null, verdict: "written", reason: "이미 심은 키워드" });
      continue;
    }
    if (isUnsafeKeyword(c.keyword, { allowFinanceBrand: opts.allowFinanceBrand })) {
      items.push({ ...c, docs: null, verdict: "blocked", reason: "업체명·가십·상품명 차단" });
      continue;
    }
    if (backedOff || measured >= 15 || Date.now() - startedAt > budget) {
      items.push({ ...c, docs: null, verdict: "unmeasured" });
      continue;
    }
    const r = await fetchBlogTotalDetailed(c.keyword);
    measured += 1;
    if (r.status === 429) backedOff = true;
    if (r.total == null) items.push({ ...c, docs: null, verdict: "unmeasured", reason: r.reason ?? undefined });
    else if (r.total === 0) items.push({ ...c, docs: 0, verdict: "unmeasured", reason: "글 0편 — 실존 의심" });
    else if (r.total < DOC_HARD_MAX) items.push({ ...c, docs: r.total, verdict: "direct" });
    else items.push({ ...c, docs: r.total, verdict: "variant" });
    await new Promise((r2) => setTimeout(r2, 120));
  }
  const rank: Record<RadarItem["verdict"], number> = { direct: 0, variant: 1, written: 2, unmeasured: 3, blocked: 4 };
  // 직행 안에서는 열기(몰린 건수) 큰 순 → 문서 적은 순
  items.sort((a, b) => rank[a.verdict] - rank[b.verdict] || b.heat - a.heat || (a.docs ?? Infinity) - (b.docs ?? Infinity));
  return items;
}
