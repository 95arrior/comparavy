import type { Metadata } from "next";
import LandingHeader from "@/components/landing/LandingHeader";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import SearchPsychology from "@/components/landing/SearchPsychology";
import KakaoNotify from "@/components/landing/KakaoNotify";
import Pricing from "@/components/landing/Pricing";

// 새 랜딩 미리보기 — 라이브 '/'에 영향 없이 섹션별로 확인하는 임시 라우트.
export const metadata: Metadata = { title: "미리보기 — 새 랜딩", robots: { index: false } };

export default function PreviewPage() {
  return (
    <>
      <LandingHeader />
      <Hero />
      <Problem />
      <SearchPsychology />
      <KakaoNotify />
      <Pricing />
    </>
  );
}
