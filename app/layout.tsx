import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comparavy | AI Tool Decision Engine",
  description: "Find the right AI tool for your exact workflow in 60 seconds.",
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
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
