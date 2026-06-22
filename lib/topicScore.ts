// 글감 박스 공용 점수·표현 — 랜딩(Showcase)과 앱(Home)이 동일하게 쓴다.
export type Comp = "low" | "mid" | "high";

// 경쟁 상태 → 감정 표현(숫자 대신 빈자리 메타포).
// 주의: 현재 comp는 네이버 '광고 경쟁'(compIdx) 기반 — 콘텐츠(블로그) 경쟁이 아님.
// 그래서 "아무도 안 썼다"는 단정 대신 '기회' 톤으로. (검색 API 연동 후 블로그 total로 진짜 경쟁 반영 예정)
export const EMOTION: Record<Comp, string> = {
  low: "노려볼 만한 키워드예요",
  mid: "해볼 만해요",
  high: "이미 많이들 써요",
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
