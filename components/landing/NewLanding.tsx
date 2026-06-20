import LandingHeader from "./LandingHeader";
import HeroNew from "./HeroNew";
import Showcase from "./Showcase";
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

// 새 랜딩 — 일반 스크롤(윈도우 스크롤). 각 섹션이 화면을 꽉 채워 풀스크린 느낌.
// ★root에 overflow-x-hidden·h-screen 두지 않음 — 그러면 root가 스크롤 컨테이너가 돼
//  헤더의 window.scrollY 감지가 깨짐. 가로 넘침은 각 섹션이 자체 overflow-hidden 처리.
export default function NewLanding() {
  return (
    <div className="select-none bg-white text-neutral-900 antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSONLD).replace(/</g, "\\u003c") }} />
      <LandingHeader />
      <HeroNew />
      <Showcase />
      <FinalHook />
      <div className="pb-24 sm:pb-0">
        <SiteFooter />
      </div>
    </div>
  );
}
