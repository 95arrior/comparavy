// 네이버 발행 복사 모드 설정. 스마트에디터ONE의 외부 이미지 자동 업로드 여부는 수동 실측 대상이라
// 두 모드를 모두 구현하고 이 상수 하나로 전환한다.
export const PASTE_MODE: "rich" | "marker" = "rich"; // 실측 후 확정

// 네이버 글쓰기 진입 기준 URL(데스크톱). 모바일은 lib/naverApp의 앱 우선 열기를 쓴다.
export const NAVER_WRITE_URL = "https://blog.naver.com";

// 본문 정렬 — ★실기기 모바일 관찰 기반 최종 결정: 왼쪽 정렬로 통일(포맷 챕터 동결).
//  본문·소제목·데이터줄·리스트 전부 왼쪽 단일 세계. 중앙/왼쪽 혼용·데이터박스 폐기.
//  변경은 실사용 데이터(체류·이탈) 근거 있을 때만 재론.
export const BODY_ALIGN: "center" | "left" = "left";
