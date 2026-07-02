// ★네이버 수익형 단일 피벗(2026-07) — 신규 온보딩은 vertical="online" 하나만 만든다.
// local/hobby는 '레거시 프로필(DB에 남은 옛 vertical)'을 서버 코드(키워드풀·지역 등)가 계속 읽을 수 있게만 유지.
// UI(온보딩·홈·글쓰기)는 더 이상 유형 분기하지 않는다.
// blogger_type은 별도 컬럼 없이 vertical로 인코딩:
//   local  = medical/academy/professional/general (레거시)
//   online = vertical "online" (수익형·n잡 — 현재 유일한 신규 유형)
//   hobby  = vertical "hobby"  (레거시)
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

// online(수익형) 카테고리 — 검색량·수익 단가 높은 군. 온보딩 주제 선택의 단일 소스.
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
