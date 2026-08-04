// 글감 박스 공용 점수·표현 — 랜딩(Showcase)과 앱(Home)이 동일하게 쓴다.
export type Comp = "low" | "mid" | "high";

// 경쟁 상태 → 감정 표현(숫자 대신 빈자리 메타포).
// comp는 '블로그 글 수(콘텐츠 경쟁)' 기반(compFromBlogTotal)이면 진짜 경쟁 → 정직한 문구.
// blog_total이 없을 때만 광고경쟁(compFromLabel)로 폴백.
export const EMOTION: Record<Comp, string> = {
  low: "아직 글이 많지 않아요",
  mid: "해볼 만해요",
  high: "이미 글이 많아요",
};

// 네이버 블로그 글 수 → 콘텐츠 경쟁 등급(진짜 선점 신호). EMOTION·싹 배지용.
export const BLOG_LOW = 15000;   // 미만 = 글 적음 = 선점 기회(싹)
export const BLOG_HIGH = 150000; // 이상 = 글 많음 = 레드오션
export const compFromBlogTotal = (blogTotal: number): Comp => {
  if (blogTotal < BLOG_LOW) return "low";
  if (blogTotal < BLOG_HIGH) return "mid";
  return "high";
};

// ★ 부드러운 선점 점수 — 블로그 글수(진짜 콘텐츠 경쟁) 기반. 경쟁 비중 75%로(저경쟁 롱테일·지역이 살게).
// 등급(저/중/고)이 거칠어 다 1~2개로 깔리던 문제 해결. blog_total 있을 때 사용.
export const filledStarsFromData = (vol: number, blogTotal: number): number => {
  const demand = Math.min(1, Math.log10(vol + 1) / 4);             // 검색 1만 → 1
  const competition = Math.min(1, Math.log10(blogTotal + 1) / 5.3); // 글 ~20만 → 1(포화)
  const score = (1 - competition) * 0.75 + demand * 0.25;
  return Math.max(1, Math.min(5, 1 + Math.round(score * 4)));
};

// 선점 점수(폴백) — 광고경쟁 등급 기반. blog_total 없을 때.
export const sakScore = (vol: number, comp: Comp): number => {
  const c = comp === "low" ? 1 : comp === "mid" ? 0.6 : 0.35;
  return Math.round((c * 0.7 + Math.min(1, vol / 2500) * 0.3) * 100);
};

// 채워진 별 개수(1~5). blog_total 있으면 부드러운 데이터 점수 우선.
export const filledStars = (vol: number, comp: Comp, blogTotal?: number | null): number => {
  if (blogTotal != null) return filledStarsFromData(vol, blogTotal);
  return Math.max(1, Math.min(5, Math.round(sakScore(vol, comp) / 20)));
};

// 선점 별점(★/☆ 5칸) 문자열.
export const starsFor = (vol: number, comp: Comp): string => {
  const filled = filledStars(vol, comp);
  return "★".repeat(filled) + "☆".repeat(5 - filled);
};

// ★문서수 순위(2026-08-05 개정 — 유저: "문서수 상한율 폐지하세요").
//  연혁: 2026-08-04에는 '상한 초과 탈락'이었다(신생 보드에 4만짜리가 서던 사고 대응).
//  ★그런데 하루 만에 반대 문제가 드러났다 — 상한이 열을 비우고, 실제 유입이 나는 구간을 통째로 배제했다.
//   유저 판단: 지금 네이버는 홈판 때문에 신생 블로그도 상위 노출이 잘 된다. 검색량·문서수로 미리 겁먹지 않는다.
//  ★그래서 막지 않고 '순서로 말한다': 문서 적은 자리가 먼저 서고, 모자라면 큰 자리도 선다.
//   문서수는 카드 배지에 그대로 적히므로 최종 판단은 유저가 카드를 보고 한다.
//  ★미측정(null)은 앞줄 — 모르는 것을 벌하지 않는다.
export const DOC_HARD_MAX = 10_000;
export function applyDocCut<T>(
  items: T[],
  docTotal: (x: T) => number | null | undefined,
  opts: { docMax: number; need: number; hardMax?: number },
): { kept: T[]; within: number; over: number; refilled: number; dropped: number } {
  // ★상한 폐지(2026-08-05 유저 확정: "문서수 상한율 폐지하세요").
  //  이유(유저): 지금 네이버는 홈판 때문에 신생 블로그도 상위 노출이 잘 된다.
  //  ★그래서 '탈락'이 아니라 '뒤로 밀기'로 바꾼다 — 좋은 자리(문서 적은 것)가 먼저 서고,
  //   그게 모자라면 큰 자리도 선다. 막지 않고 순서로 말한다.
  //   문서수는 카드 배지에 그대로 적히므로, 최종 판단은 유저가 카드를 보고 한다.
  void opts.hardMax; // 절대 상한 없음(하위 호환으로 받기만)
  const within = items.filter((x) => docTotal(x) == null || (docTotal(x) as number) < opts.docMax);
  const over = items
    .filter((x) => { const d = docTotal(x); return d != null && d >= opts.docMax; })
    .sort((a, b) => (docTotal(a) ?? 0) - (docTotal(b) ?? 0)); // 그나마 이길 만한 순
  const refill = over.slice(0, Math.max(0, opts.need - within.length));
  return { kept: [...within, ...refill], within: within.length, over: over.length, refilled: refill.length, dropped: items.length - within.length - refill.length };
}

// 네이버 경쟁도 라벨(낮음/중간/높음) → Comp.
export const compFromLabel = (label: string | null | undefined): Comp => {
  const s = (label ?? "").trim();
  if (s === "낮음") return "low";
  if (s === "높음") return "high";
  return "mid";
};
