import LandingHeader from "./LandingHeader";
import Hero from "./Hero";
import Problem from "./Problem";
import SearchPsychology from "./SearchPsychology";
import KakaoNotify from "./KakaoNotify";
import Pricing from "./Pricing";
import SiteFooter from "@/components/SiteFooter";

// 새 랜딩(단일) — 헤더 + 히어로 + 문제공감 + 검색심리 + 카톡알림 + 가격 + 푸터.
export default function NewLanding() {
  return (
    <div className="overflow-x-hidden bg-white text-neutral-900 antialiased">
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
