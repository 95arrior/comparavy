import LandingHeader from "./LandingHeader";
import Hero from "./Hero";
import Problem from "./Problem";
import SearchPsychology from "./SearchPsychology";
import FinalHook from "./FinalHook";
import SiteFooter from "@/components/SiteFooter";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// 우리 랜딩도 SEO/AEO 최적화 — 구조화 데이터(JSON-LD): Organization + WebSite + SoftwareApplication.
const LANDING_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#org`,
      name: `에이트플로(${SITE_NAME})`,
      url: SITE_URL,
      logo: `${SITE_URL}/ateflo-logo.png`,
      description: SITE_DESCRIPTION,
    },
    { "@type": "WebSite", "@id": `${SITE_URL}#site`, name: `에이트플로(${SITE_NAME})`, url: SITE_URL, publisher: { "@id": `${SITE_URL}#org` }, inLanguage: "ko-KR" },
    {
      "@type": "SoftwareApplication",
      name: `에이트플로(${SITE_NAME})`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}#org` },
    },
  ],
};

// 새 랜딩(단일) — 헤더 + 히어로 + 문제공감 + 검색심리 + 카톡알림 + 신뢰 + 푸터.
export default function NewLanding() {
  return (
    <div className="overflow-x-hidden bg-white text-neutral-900 antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSONLD).replace(/</g, "\\u003c") }} />
      <LandingHeader />
      <Hero />
      <Problem />
      <SearchPsychology />
      <FinalHook />
      {/* 모바일 하단 고정 CTA가 푸터를 가리지 않게 여백 */}
      <div className="pb-24 sm:pb-0">
        <SiteFooter />
      </div>
    </div>
  );
}
