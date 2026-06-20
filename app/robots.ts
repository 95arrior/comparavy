import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/dashboard", "/login", "/pricing/success", "/auth/", "/api/"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // AI 검색엔진(ChatGPT·Claude·Perplexity·Gemini) 명시 허용 → 우리 콘텐츠가 AI 답변에 인용되게(GEO/AEO)
      {
        userAgent: [
          "GPTBot", "ChatGPT-User", "OAI-SearchBot", // OpenAI
          "ClaudeBot", "Claude-Web", "anthropic-ai", // Anthropic
          "PerplexityBot", "Perplexity-User", // Perplexity
          "Google-Extended", // Gemini/AI Overviews
        ],
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
