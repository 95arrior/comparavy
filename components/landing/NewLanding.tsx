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

// 새 랜딩(단일) — 헤더 + 히어로 + 문제공감 + 검색심리 + 카톡알림 + 신뢰 + 푸터.
export default function NewLanding() {
  return (
    // ★ root에 overflow-x-hidden 두지 않음 — 그러면 스크롤 컨테이너가 되어 sticky 헤더가 깨짐.
    //   가로 넘침은 각 섹션이 자체적으로 overflow-x-hidden 처리함.
    // 풀페이지 스크롤 — root가 스크롤 컨테이너(snap). 헤더는 fixed라 영향 없음.
    // proximity = 가까울 때만 스냅(긴 섹션에서 안 갇힘).
    <div className="h-[100dvh] select-none snap-y snap-mandatory overflow-x-hidden overflow-y-scroll scroll-smooth bg-white text-neutral-900 antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSONLD).replace(/</g, "\\u003c") }} />
      <LandingHeader />
      {/* 풀페이지 — 섹션마다 화면 꽉(h-dvh) + 항상 스냅 → 한 번에 한 섹션씩 이동 */}
      <div className="h-[100dvh] snap-start snap-always overflow-hidden"><HeroNew /></div>
      <div className="h-[100dvh] snap-start snap-always overflow-hidden"><Showcase /></div>
      <div className="h-[100dvh] snap-start snap-always overflow-hidden"><FinalHook /></div>
      <div className="snap-start snap-always pb-24 sm:pb-0">
        <SiteFooter />
      </div>
    </div>
  );
}
