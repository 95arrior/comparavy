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
