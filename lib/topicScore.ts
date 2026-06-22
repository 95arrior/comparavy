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

// 네이버 블로그 글 수 → 콘텐츠 경쟁 등급(진짜 선점 신호). 임계값은 데이터 보며 튜닝.
export const BLOG_LOW = 5000;   // 미만 = 글 적음 = 선점 기회
export const BLOG_HIGH = 50000; // 이상 = 글 많음 = 레드오션
export const compFromBlogTotal = (blogTotal: number): Comp => {
  if (blogTotal < BLOG_LOW) return "low";
  if (blogTotal < BLOG_HIGH) return "mid";
  return "high";
};

// 선점 점수 — 경쟁 낮을수록·검색 많을수록 ↑(검색↔경쟁 갭이 핵심).
export const sakScore = (vol: number, comp: Comp): number => {
  const c = comp === "low" ? 1 : comp === "mid" ? 0.55 : 0.25;
  return Math.round((c * 0.7 + Math.min(1, vol / 2500) * 0.3) * 100);
};

// 채워진 별 개수(1~5).
export const filledStars = (vol: number, comp: Comp): number =>
  Math.max(1, Math.min(5, Math.round(sakScore(vol, comp) / 20)));

// 선점 별점(★/☆ 5칸) 문자열.
export const starsFor = (vol: number, comp: Comp): string => {
  const filled = filledStars(vol, comp);
  return "★".repeat(filled) + "☆".repeat(5 - filled);
};

// 네이버 경쟁도 라벨(낮음/중간/높음) → Comp.
export const compFromLabel = (label: string | null | undefined): Comp => {
  const s = (label ?? "").trim();
  if (s === "낮음") return "low";
  if (s === "높음") return "high";
  return "mid";
};
