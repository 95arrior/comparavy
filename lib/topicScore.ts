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

// ★밴드 문서수 컷(2026-08-04 유저 실측·확정) — 신생 보드에 문서수 29,407·40,867·49,280 카드가 섰다.
//  원인: 밴드 상한은 쿼리에만 있었고(미측정 null은 통과), 서빙 직전에 측정된 값은 별점 '정렬'에만 쓰였다.
//  측정해 놓고 안 거르면 재는 의미가 없다 — 측정값은 컷이어야 한다.
//  ★정책: 상한 초과는 탈락. 단 자리가 남으면 '문서수 적은 순'으로만 보충한다(보드를 비우지 않는다).
//   절대 상한(hardMax) 위는 보충 대상도 아니다 — 신생 계정이 못 이기는 판은 자리를 채울 값어치가 없다.
//  ★미측정(null)은 통과 — 모르는 것을 벌하지 않는다(대신 백필로 미측정을 줄이는 게 정공법).
export const DOC_HARD_MAX = 10_000;
export function applyDocCut<T>(
  items: T[],
  docTotal: (x: T) => number | null | undefined,
  opts: { docMax: number; need: number; hardMax?: number },
): { kept: T[]; within: number; over: number; refilled: number; dropped: number } {
  const hardMax = opts.hardMax ?? DOC_HARD_MAX;
  const within = items.filter((x) => docTotal(x) == null || (docTotal(x) as number) < opts.docMax);
  const over = items
    .filter((x) => { const d = docTotal(x); return d != null && d >= opts.docMax && d < hardMax; })
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
