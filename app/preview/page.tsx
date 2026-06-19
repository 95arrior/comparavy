import type { Metadata } from "next";
import LandingHeader from "@/components/landing/LandingHeader";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import SearchPsychology from "@/components/landing/SearchPsychology";
import KakaoNotify from "@/components/landing/KakaoNotify";
import Pricing from "@/components/landing/Pricing";
import SiteFooter from "@/components/SiteFooter";

// 새 랜딩 미리보기 — 라이브 '/'에 영향 없이 섹션별로 확인하는 임시 라우트.
export const metadata: Metadata = { title: "미리보기 — 새 랜딩", robots: { index: false } };

export default function PreviewPage() {
  return (
    <div className="overflow-x-hidden">
      <LandingHeader />
      <Hero />
      <Problem />
      <SearchPsychology />
      <KakaoNotify />
      <Pricing />
      {/* 모바일 하단 고정 CTA가 푸터를 가리지 않게 여백 */}
      <div className="pb-24 sm:pb-0">
        <SiteFooter />
      </div>
    </div>
  );
}
