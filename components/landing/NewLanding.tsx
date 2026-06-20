"use client";

import { useEffect, useRef } from "react";
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

export default function NewLanding() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 데스크탑: 휠 한 번 → 다음 섹션으로 '부드럽게 미끄러지듯'(easeInOutCubic) 이동. (모바일은 native 스크롤)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // 터치(모바일)는 native

    let animating = false;
    let raf = 0;
    const sectionsTop = () =>
      Array.from(el.querySelectorAll<HTMLElement>("[data-snap]")).map((s) => s.offsetTop);

    const currentIndex = (tops: number[]) => {
      const mid = el.scrollTop + el.clientHeight / 2;
      let idx = 0;
      tops.forEach((t, i) => { if (t <= mid) idx = i; });
      return idx;
    };

    const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

    const glideTo = (top: number) => {
      animating = true;
      const start = el.scrollTop;
      const dist = top - start;
      const dur = 750;
      let t0 = 0;
      const step = (t: number) => {
        if (!t0) t0 = t;
        const p = Math.min(1, (t - t0) / dur);
        el.scrollTop = start + dist * easeInOutCubic(p);
        if (p < 1) raf = requestAnimationFrame(step);
        else setTimeout(() => { animating = false; }, 80); // 관성 폭주 방지 쿨다운
      };
      raf = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 3) return;
      e.preventDefault();
      if (animating) return;
      const tops = sectionsTop();
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(tops.length - 1, currentIndex(tops) + dir));
      if (tops[next] !== undefined) glideTo(tops[next]);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const isDown = e.key === "ArrowDown" || e.key === "PageDown";
      const isUp = e.key === "ArrowUp" || e.key === "PageUp";
      if (!isDown && !isUp) return;
      e.preventDefault();
      if (animating) return;
      const tops = sectionsTop();
      const next = Math.max(0, Math.min(tops.length - 1, currentIndex(tops) + (isDown ? 1 : -1)));
      if (tops[next] !== undefined) glideTo(tops[next]);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    // 데스크탑=휠 글라이드(JS), 모바일=native 스크롤 + proximity 스냅(부드럽게).
    <div
      ref={scrollRef}
      className="h-[100dvh] select-none snap-y snap-proximity overflow-x-hidden overflow-y-scroll scroll-smooth bg-white text-neutral-900 antialiased"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSONLD).replace(/</g, "\\u003c") }} />
      <LandingHeader />
      <div data-snap className="h-[100dvh] snap-start overflow-hidden"><HeroNew /></div>
      <div data-snap className="h-[100dvh] snap-start overflow-hidden"><Showcase /></div>
      <div data-snap className="h-[100dvh] snap-start overflow-hidden"><FinalHook /></div>
      <div data-snap className="snap-start pb-24 sm:pb-0">
        <SiteFooter />
      </div>
    </div>
  );
}
