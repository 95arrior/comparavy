import type { Metadata } from "next";
import NewLanding from "@/components/landing/NewLanding";

// 새 랜딩 미리보기 — 라이브와 동일 컴포넌트.
export const metadata: Metadata = { title: "미리보기 — 새 랜딩", robots: { index: false } };

export default function PreviewPage() {
  return <NewLanding />;
}
