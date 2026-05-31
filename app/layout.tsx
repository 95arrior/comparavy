import type { Metadata } from "next";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import RouteScrollManager from "@/components/RouteScrollManager";
import SiteFooter from "@/components/SiteFooter";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const DEFAULT_TITLE = "AteFlo | AI Shortcuts for Real Work";

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
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/apple-icon.png",
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
        <RouteScrollManager />
        <GoogleAnalytics />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
