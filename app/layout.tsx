import type { Metadata } from "next";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import RouteScrollManager from "@/components/RouteScrollManager";
import SiteFooter from "@/components/SiteFooter";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const DEFAULT_TITLE = "AteFlo | AI Workflow Kits for Real Work";
const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  verification: {
    google: "3vjt4EUdAHqSiMyGG-6rrR9uq0XfQEbV5ANIBlxAj6s",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
        />
        <RouteScrollManager />
        <GoogleAnalytics />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
