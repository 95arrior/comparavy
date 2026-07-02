// 네이버 발행 복사 모드 설정. 스마트에디터ONE의 외부 이미지 자동 업로드 여부는 수동 실측 대상이라
// 두 모드를 모두 구현하고 이 상수 하나로 전환한다.
export const PASTE_MODE: "rich" | "marker" = "rich"; // 실측 후 확정

// 네이버 글쓰기 진입 기준 URL(데스크톱). 모바일은 lib/naverApp의 앱 우선 열기를 쓴다.
export const NAVER_WRITE_URL = "https://blog.naver.com";

// 본문 정렬 — 모바일 리듬을 위해 가운데 기본. 나중에 사용자 옵션으로 뺄 수 있게 분리(지금 옵션 UI 없음).
export const BODY_ALIGN: "center" | "left" = "center";
