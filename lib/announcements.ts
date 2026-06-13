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
    id: "2026-06-09-publish",
    date: "2026.06.09",
    title: "워드프레스 원클릭 발행 + 모바일 개선",
    body: "글을 쓰고 버튼 하나로 워드프레스에 바로 올릴 수 있어요. 모바일 화면도 더 깔끔해졌어요.",
  },
  {
    id: "2026-06-09-welcome",
    date: "2026.06.09",
    title: "AteFlo에 오신 걸 환영해요 👋",
    body: "키워드 하나만 넣으면 검색에 뜨는 한국어 블로그 글이 완성돼요. 무료 3편으로 먼저 써보세요.",
  },
];

export const LATEST_ANNOUNCEMENT_ID = ANNOUNCEMENTS[0]?.id ?? "";
