// ★키워드 광고 단가 조회(2026-08-05 유저 지시).
//
//  유저 원문: "마지막에 태그 넣는 부분 있잖아요. 이거 1개만 대표 키워드 광고단가 높은 걸 넣을 거예요. 글에 맞는."
//  근거로 준 방법: 네이버 검색광고 > 키워드도구 > 월간 예상 실적 > '예상 평균 클릭 비용'을 보고
//   글과 연관된 범위에서 단가가 가장 높은 키워드를 태그 맨 앞에 하나 넣는다.
//   그러면 글 하단 파워링크가 그 키워드 계열 광고로 바뀌어 애드포스트 단가가 오른다.
//
//  ★그 '예상 클릭 비용'을 API로 직접 잰다(실호출 확인 2026-08-05):
//    POST /estimate/average-position-bid/keyword → 1위 노출 입찰가
//    암보험 66,420 · 자동차보험 39,210 · 주택담보대출 17,420 · 연금저축 6,480 · 전기요금 330
//   ★156배 차이다. 이걸 안 재고 카테고리 지수를 손으로 매기는 건 추측이다.
//
//  ★★안전선(유저가 함께 준 주의사항): 글 내용과 무관한 고단가 태그는 넣지 않는다.
//   광고주가 의도한 타겟과 달라져 신고·애드포스트 정지 위험이 있다.
//   그래서 후보는 '본문에 실제로 등장하는 말'로만 만든다 — 이건 취향이 아니라 계정 안전 문제다.
import crypto from "node:crypto";

const BASE_URL = "https://api.searchad.naver.com";
const PATH = "/estimate/average-position-bid/keyword";

function authHeaders(method: string, path: string): Record<string, string> {
  const ts = String(Date.now());
  const sig = crypto.createHmac("sha256", process.env.NAVER_AD_SECRET_KEY ?? "")
    .update(`${ts}.${method}.${path}`).digest("base64");
  return {
    "X-Timestamp": ts,
    "X-API-KEY": process.env.NAVER_AD_ACCESS_LICENSE ?? "",
    "X-Customer": process.env.NAVER_AD_CUSTOMER_ID ?? "",
    "X-Signature": sig,
    "Content-Type": "application/json",
  };
}

const norm = (s: string) => String(s || "").replace(/\s+/g, "").toLowerCase();

/**
 * 키워드별 1위 노출 예상 입찰가(원). 조회 실패·미등록 키워드는 맵에 없다.
 * ★자격증명이 없으면 빈 맵 — 태그 선정은 그냥 기존 방식으로 간다(파이프 무영향).
 */
export async function fetchKeywordBids(keywords: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const uniq = [...new Set(keywords.map((k) => k.trim()).filter((k) => k.length >= 2))].slice(0, 20);
  if (!uniq.length) return out;
  if (!process.env.NAVER_AD_SECRET_KEY || !process.env.NAVER_AD_ACCESS_LICENSE || !process.env.NAVER_AD_CUSTOMER_ID) return out;
  try {
    const res = await fetch(`${BASE_URL}${PATH}`, {
      method: "POST",
      headers: authHeaders("POST", PATH),
      body: JSON.stringify({ device: "PC", keywordplus: false, items: uniq.map((k) => ({ key: k, position: 1 })) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) { console.error(`[ad-bid] HTTP ${res.status}`); return out; }
    const j = (await res.json()) as { estimate?: { keyword?: string; bid?: number }[] };
    for (const e of j.estimate ?? []) {
      const k = norm(e.keyword ?? "");
      const b = Number(e.bid ?? 0);
      if (k && Number.isFinite(b) && b > 0) out.set(k, b);
    }
  } catch (e) {
    console.error("[ad-bid] 조회 실패:", e instanceof Error ? e.message : e);
  }
  return out;
}

// ★후보를 만들 때 빼는 말 — 어디에나 붙어 단가만 높고 글과의 연결은 약하다.
const CAND_STOP = new Set(["방법", "조건", "기준", "신청", "정리", "총정리", "확인", "안내", "정보", "이유", "경우", "지금", "올해", "내년"]);
// ★조사·어미가 붙은 어절은 태그가 아니다(2026-08-05 실측: 근로장려금 글에서 '자격을'이 뽑혔다).
//  사람은 태그에 '자격을'이라고 쓰지 않는다 — 광고도 그 말로는 안 붙는다.
const CAND_JOSA = /(은|는|이|가|을|를|의|도|만|에|에서|으로|로|과|와|께|부터|까지|보다|처럼|이나|나|든지|라도)$/;
const CAND_VERB = /(합니다|입니다|됩니다|하는|되는|있는|없는|같은|위해|통해|따라|대한|관한|하세요|하면|해도|한다|된다|했다|이다)$/;
/** 어절에서 조사·어미를 털어 '태그로 쓸 수 있는 말'만 남긴다. 못 만들면 빈 문자열. */
function tagWord(w: string): string {
  let x = w.replace(/[^가-힣a-zA-Z0-9]/g, "");
  if (CAND_VERB.test(x)) return "";
  const bare = x.replace(CAND_JOSA, "");
  // ★조사를 떼고 2자 미만이면 원래 말이 조사 덩어리였다는 뜻이다
  if ([...bare].length < 2) return "";
  x = bare;
  return CAND_STOP.has(x) ? "" : x;
}

/**
 * 본문에서 대표 태그 후보를 뽑는다.
 * ★반드시 '본문에 실제로 등장하는 말'만 — 무관한 고단가 태그는 계정 위험이다(유저가 준 주의사항).
 */
export function bidCandidates(bodyText: string, seedKeyword?: string | null, extra: string[] = []): string[] {
  const text = String(bodyText || "").replace(/<[^>]+>/g, " ");
  const words = text.split(/[\s,·"'"'()[\]{}<>|/]+/)
    .map(tagWord)
    .filter((w) => w.length > 0 && !/^\d+$/.test(w));

  const cands = new Set<string>();
  // 단어 단독 + 인접 2어절 조합(‘암 보험’처럼 붙어 쓰는 말을 잡는다)
  for (let i = 0; i < words.length; i++) {
    cands.add(words[i]!);
    if (i + 1 < words.length) cands.add(`${words[i]} ${words[i + 1]}`);
  }
  // ★씨앗은 이 글의 주제 그 자체라 후보로 받는다.
  //  ★그 외(모델이 만든 태그 등)는 '본문에 실제로 나오는 말'만 받는다 —
  //   유저 주의사항: 글과 무관한 고단가 태그는 광고주 타겟과 어긋나 신고·정지 위험이다.
  if (seedKeyword && seedKeyword.trim().length >= 2) cands.add(seedKeyword.trim());
  for (const e of extra) {
    const t = (e ?? "").trim();
    if (t.length >= 2 && text.includes(t)) cands.add(t);
  }
  // 빈도 상위부터 — 자주 나온 말일수록 이 글의 주제다
  const freq = new Map<string, number>();
  for (const c of cands) freq.set(c, (text.match(new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length);
  return [...cands].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0)).slice(0, 18);
}

export interface BidPick { keyword: string; bid: number; runnerUp: { keyword: string; bid: number } | null }

/**
 * 후보 중 단가가 가장 높은 하나를 고른다.
 * @param minBid 이 값 미만이면 고르지 않는다 — 단가가 고만고만하면 태그 순서를 흔들 이유가 없다.
 */
export async function pickTopBidTag(
  bodyText: string,
  seedKeyword?: string | null,
  extra: string[] = [],
  minBid = 1000,
): Promise<BidPick | null> {
  const cands = bidCandidates(bodyText, seedKeyword, extra);
  if (!cands.length) return null;
  const bids = await fetchKeywordBids(cands);
  if (!bids.size) return null;

  // ★★주제와 묶인 말만 고른다(2026-08-05 유저 강조: 주의사항 4번).
  //  실측이 왜 이 게이트가 필요한지 보여줬다:
  //   근로장려금 글에서 주제어 '근로장려금'은 70원인데 일반 명사 '자격'이 4,110원이었다.
  //   단가만 보면 '자격'을 고르게 되는데, 그 태그가 부르는 건 자격증 광고다 — 글과 무관하다.
  //   ★광고주가 의도한 타겟과 어긋나면 신고·애드포스트 정지 위험이다. 수익보다 계정이 먼저다.
  //  판정: 씨앗 키워드의 말 조각을 하나라도 품고 있어야 '이 글의 주제'로 인정한다.
  const seedToks = String(seedKeyword ?? "").split(/\s+/)
    .map((w) => w.replace(/[^가-힣a-zA-Z0-9]/g, ""))
    .filter((w) => [...w].length >= 2);
  const onTopic = (k: string) => {
    if (!seedToks.length) return true; // 씨앗이 없으면 판정 근거가 없다 — 막지 않는다
    const n = norm(k);
    return seedToks.some((t) => n.includes(norm(t)) || norm(t).includes(n));
  };

  const scored = cands.map((k) => ({ keyword: k, bid: bids.get(norm(k)) ?? 0, on: onTopic(k) }));
  const ranked = scored.filter((x) => x.on && x.bid >= minBid).sort((a, b) => b.bid - a.bid);
  if (!ranked.length) {
    // ★주제와 묶인 말 중에 쓸 만한 단가가 없으면 넣지 않는다.
    //  억지로 넣는 순간 '무관한 고단가 태그'가 되고, 그건 우리가 막기로 한 그것이다.
    const best = scored.filter((x) => x.bid >= minBid).sort((a, b) => b.bid - a.bid)[0];
    if (best) console.log(`[ad-bid] 대표 태그 없음 — 주제 밖 '${best.keyword}'(${best.bid.toLocaleString()}원)은 쓰지 않는다(씨앗 '${seedKeyword}')`);
    return null;
  }
  return { keyword: ranked[0]!.keyword, bid: ranked[0]!.bid, runnerUp: ranked[1] ?? null };
}
