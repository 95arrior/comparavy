// 3유형 블로거 모델 — 온보딩 '유형 선택'의 단일 소스.
// blogger_type은 별도 컬럼 없이 vertical로 인코딩:
//   local  = medical/academy/professional/general (기존, 지역·규제 있음)
//   online = vertical "online" (수익형·n잡, 지역 X, 규제 최소)
//   hobby  = vertical "hobby"  (취미·기록, 지역 X, 규제 X)
export type BloggerType = "local" | "online" | "hobby";

export const LOCAL_VERTICALS = new Set(["medical", "academy", "professional", "general", "b2b"]);
export const ONLINE_VERTICAL = "online";
export const HOBBY_VERTICAL = "hobby";

/** vertical → 블로거 유형. */
export function bloggerType(vertical: string | null | undefined): BloggerType {
  if (vertical === ONLINE_VERTICAL) return "online";
  if (vertical === HOBBY_VERTICAL) return "hobby";
  return "local";
}

/** 지역(주소·동네글감)을 쓰는 유형인가. online/hobby는 전국형이라 false. */
export function usesRegion(vertical: string | null | undefined): boolean {
  return bloggerType(vertical) === "local";
}

// 유형 카드 — 온보딩 첫 화면(2글자 톤 통일).
export const BLOGGER_TYPE_CARDS: { type: BloggerType; vertical: string | null; label: string; desc: string }[] = [
  { type: "local", vertical: null, label: "동네 사장님", desc: "가게·병원·학원 — 손님이 찾아오게" },
  { type: "online", vertical: ONLINE_VERTICAL, label: "수익형 블로거", desc: "n잡·애드센스 — 검색으로 수익을" },
  { type: "hobby", vertical: HOBBY_VERTICAL, label: "취미·기록", desc: "여행·취미 — 좋아하는 걸 기록" },
];

// online(수익형) 카테고리 — 검색량·애드센스 단가 높은 군.
export const ONLINE_CATEGORIES = [
  "재테크·투자", "IT·디지털·리뷰", "건강·다이어트", "부업·N잡", "여행",
  "자기계발", "쇼핑·제품리뷰", "교육·정보", "살림·인테리어", "자동차",
];

// hobby(취미·기록) 카테고리 — 수익·손님 압박 없는 기록형.
export const HOBBY_CATEGORIES = [
  "여행", "요리·베이킹", "육아", "게임", "책·영화",
  "운동·등산", "반려동물", "사진", "음악", "일상·에세이",
];

/** 유형별 세부 카테고리 선택지(local은 기존 VERTICAL_SUBS 사용). */
export function categoriesFor(type: BloggerType): string[] {
  if (type === "online") return ONLINE_CATEGORIES;
  if (type === "hobby") return HOBBY_CATEGORIES;
  return [];
}
