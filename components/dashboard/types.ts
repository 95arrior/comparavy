export interface FaqItem {
  question: string;
  answer: string;
}

export interface Article {
  id: string;
  keyword: string;
  title: string;
  meta_title: string;
  meta_description: string;
  body_html: string;
  faq: FaqItem[];
  /** 워드프레스 태그 (3~5개) */
  tags?: string[];
  /** 워드프레스 카테고리(분류) 이름 */
  category?: string | null;
  char_count: number;
  status: "draft" | "copied" | "pending_verify" | "verified" | "published" | "future" | "generating" | "deleted"; // published=자기신고 레거시(verified 동급)
  /** AI 이미지 URL — {"0":url,...} (계정 저장, 웹·모바일 동기화) */
  images?: Record<string, string> | null;
  /** 색인 상태 — 크론이 기록 (indexed | pending | unknown | null=미검사) */
  indexed_status?: string | null;
  wp_link: string | null;
  /** 발행된 워드프레스 글 ID — 있으면 재발행 시 새 글이 아니라 이 글을 수정 */
  wp_post_id: number | null;
  featured_image: string | null;
  original_html: string | null;
  /** 무료 한도 초과 시 만든 미리보기(티저). true면 상단만 보이고 하단 블러 + 결제 유도. 프로 결제 시 해제. */
  locked?: boolean;
  /** 글쓴이용 메모: 검색 의도·구성 이유 (본문 아님, FAQ 위에 표시) */
  write_note?: string | null;
  /** 글 유형: 'promo'(홍보용 — 업장 연결) | 'info'(정보성 — 순수 정보). 정보성은 섹션 추천 숨김. */
  article_type?: string | null;
  /** 발행 채널 — wp(워드프레스 자동발행) | naver(복붙). 없으면 유저 타입으로 추론 */
  channel?: string | null;
  /** 발행/예약 일시 — 콘텐츠 캘린더 표시용 (예약=예약 시각, 발행=발행 시각) */
  publish_at?: string | null;
  created_at: string;
  verify_attempts?: number | null;
  naver_url?: string | null;
}

/** 키워드 발굴 결과 한 건 (서버 lib/goldenKeyword.ts의 GoldenKeyword와 동일 — 클라 번들에 서버 모듈 안 끌리게 별도 선언) */
export interface KeywordResult {
  keyword: string;
  monthlyMobileQcCnt: number;
  compIdx: string; // 낮음 / 중간
  highVolume: boolean;
  estimated?: boolean;
}

export type KeywordStatus = "idle" | "loading" | "done" | "error";

export interface DashboardProps {
  email: string;
  /** 크레딧 잔액 — 글 생성 1편 = 1크레딧 (플랜 모델 폐기, 2026-07) */
  credits: number;
  initialArticles: Article[];
  isAdmin?: boolean;
  adminStats?: import("@/lib/adminStats").AdminStats | null;
}
