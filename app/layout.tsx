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
  viewportFit: "cover", // iPhone safe-area(env(safe-area-inset-*)) 적용
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `에이트플로(${SITE_NAME}) — 네이버 블로그 수익화, 매일 글 하나면 끝`,
    template: `%s | 에이트플로`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["에이트플로", "AteFlo", "네이버 블로그 수익화", "애드포스트 승인", "네이버 블로그 글쓰기", "블로그 부업", "AI 블로그 글 생성"],
  // 네이버 서치어드바이저 사이트 소유확인
  verification: { other: { "naver-site-verification": "da709303c197a62948b2ca78035db689574b8666" } },
  openGraph: {
    title: "에이트플로",
    description: "네이버 블로그 수익화, 매일 글 하나면 끝",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    images: [{ url: `${SITE_URL}/og-v2.jpg`, width: 1672, height: 941, alt: "에이트플로 AteFlo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "에이트플로",
    description: "네이버 블로그 수익화, 매일 글 하나면 끝",
    images: [`${SITE_URL}/og-v2.jpg`],
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
              logo: `${SITE_URL}/apple-icon.png`,
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
