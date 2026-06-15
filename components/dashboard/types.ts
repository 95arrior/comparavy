import type { PlanKey } from "@/lib/plans";

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
  status: "draft" | "published" | "future" | "generating";
  wp_link: string | null;
  /** 발행된 워드프레스 글 ID — 있으면 재발행 시 새 글이 아니라 이 글을 수정 */
  wp_post_id: number | null;
  featured_image: string | null;
  original_html: string | null;
  /** 무료 한도 초과 시 만든 미리보기(티저). true면 상단만 보이고 하단 블러 + 결제 유도. 프로 결제 시 해제. */
  locked?: boolean;
  /** 글쓴이용 메모: 검색 의도·구성 이유 (본문 아님, FAQ 위에 표시) */
  write_note?: string | null;
  /** 발행/예약 일시 — 콘텐츠 캘린더 표시용 (예약=예약 시각, 발행=발행 시각) */
  publish_at?: string | null;
  created_at: string;
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
  plan: PlanKey;
  articlesUsed: number;
  articlesLimit: number;
  periodStart?: string | null;
  subStatus?: string | null;
  nextBillingAt?: string | null;
  currentPeriodEnd?: string | null;
  initialArticles: Article[];
  wpSiteUrl: string | null;
  isAdmin?: boolean;
  adminStats?: import("@/lib/adminStats").AdminStats | null;
}
