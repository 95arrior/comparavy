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
  char_count: number;
  status: "draft" | "published" | "future";
  wp_link: string | null;
  featured_image: string | null;
  original_html: string | null;
  /** 무료 한도 초과 시 만든 미리보기(티저). true면 상단만 보이고 하단 블러 + 결제 유도. 프로 결제 시 해제. */
  locked?: boolean;
  created_at: string;
}

export interface DashboardProps {
  email: string;
  plan: PlanKey;
  articlesUsed: number;
  articlesLimit: number;
  initialArticles: Article[];
  wpSiteUrl: string | null;
}
