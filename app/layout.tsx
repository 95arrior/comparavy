import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comparavy | AI Tool Decision Engine",
  description: "Find the right AI tool for your exact workflow in 60 seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
