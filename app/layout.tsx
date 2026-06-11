import type { Metadata, Viewport } from "next";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import RouteScrollManager from "@/components/RouteScrollManager";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `에이트플로(${SITE_NAME}) — 블로그 글쓰기, 키워드 하나면 끝`,
    template: `%s | 에이트플로`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["에이트플로", "AteFlo", "워드프레스 AI 글쓰기", "한국어 SEO 글", "AI 블로그 자동 발행", "블로그 글 자동 생성"],
  openGraph: {
    title: "에이트플로",
    description: "글쓰기, 키워드 하나면 끝",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/og.jpg", width: 1672, height: 941, alt: "에이트플로 AteFlo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "에이트플로",
    description: "글쓰기, 키워드 하나면 끝",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body>
        {/* 구조화 데이터 — 구글이 브랜드의 한글명(에이트플로)을 인식하도록 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_NAME,
              alternateName: "에이트플로",
              url: SITE_URL,
            }),
          }}
        />
        <RouteScrollManager />
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
