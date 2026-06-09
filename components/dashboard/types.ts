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
  char_count: number;
  status: "draft" | "published" | "future";
  wp_link: string | null;
  /** 발행된 워드프레스 글 ID — 있으면 재발행 시 새 글이 아니라 이 글을 수정 */
  wp_post_id: number | null;
  featured_image: string | null;
  original_html: string | null;
  /** 무료 한도 초과 시 만든 미리보기(티저). true면 상단만 보이고 하단 블러 + 결제 유도. 프로 결제 시 해제. */
  locked?: boolean;
  /** 글쓴이용 메모: 검색 의도·구성 이유 (본문 아님, FAQ 위에 표시) */
  write_note?: string | null;
  created_at: string;
}

export interface DashboardProps {
  email: string;
  plan: PlanKey;
  articlesUsed: number;
  articlesLimit: number;
  subStatus?: string | null;
  initialArticles: Article[];
  wpSiteUrl: string | null;
  isAdmin?: boolean;
  adminStats?: import("@/lib/adminStats").AdminStats | null;
}
