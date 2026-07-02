// 공지·업데이트 소식. 새 소식은 배열 맨 앞에 추가하세요(최신순).
// MVP는 코드 배열 — 나중에 관리자 DB 편집으로 확장 가능.
export type Announcement = {
  id: string; // 고유 + 정렬용. 날짜-슬러그 권장
  date: string; // 표시용 (예: 2026.06.09)
  title: string;
  body: string;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "2026-07-03-naver-focus",
    date: "2026.07.03",
    title: "네이버 블로그 수익화에 집중해요",
    body: "에이트플로가 새로워졌어요. 매일 준비되는 '오늘의 글', 20일 승인 준비 코스, 사진 자리를 채워주는 AI 이미지까지. 글은 복사해서 붙여넣기만 하면 돼요.",
  },
  {
    id: "2026-07-03-welcome",
    date: "2026.07.03",
    title: "에이트플로에 오신 걸 환영해요 👋",
    body: "네이버 블로그로 수익을 만드는 가장 쉬운 길이에요. 홈에서 오늘의 글을 눌러 첫 글(D-1)을 시작해 보세요. 발행한 글이 검색에 잡히는지도 내 글에서 알려드려요.",
  },
];

export const LATEST_ANNOUNCEMENT_ID = ANNOUNCEMENTS[0]?.id ?? "";
