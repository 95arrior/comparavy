"use client";

import { useEffect, useRef, useState } from "react";
import LandingHeader from "./LandingHeader";
import HeroNew from "./HeroNew";
import Showcase from "./Showcase";
import WriteModeSection from "./WriteModeSection";
import FinalHook from "./FinalHook";
import SiteFooter from "@/components/SiteFooter";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

const LANDING_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}#org`, name: `에이트플로(${SITE_NAME})`, url: SITE_URL, logo: `${SITE_URL}/ateflo-logo.png`, description: SITE_DESCRIPTION },
    { "@type": "WebSite", "@id": `${SITE_URL}#site`, name: `에이트플로(${SITE_NAME})`, url: SITE_URL, publisher: { "@id": `${SITE_URL}#org` }, inLanguage: "ko-KR" },
    { "@type": "SoftwareApplication", name: `에이트플로(${SITE_NAME})`, applicationCategory: "BusinessApplication", operatingSystem: "Web", description: SITE_DESCRIPTION, url: SITE_URL, publisher: { "@id": `${SITE_URL}#org` } },
  ],
};

// 페이지 인덱스: 0 히어로 · 1 업종칩 · 2 글감 · 3 토글 · 4 피날레 · 5 푸터
const CHIPS = 1;
const TOPICS = 2;
const TOGGLE = 3;

// 풀페이지 컨트롤러 — 휠/터치/키 가로채 한 섹션씩(위·아래). 게이트 섹션(칩/토글)은 동작 먼저.
export default function NewLanding() {
  const [catSel, setCatSel] = useState<number | null>(null);
  const [info, setInfo] = useState(false);
  const idx = useRef(0);
  const lock = useRef(false);
  const catRef = useRef<number | null>(null);
  const toggledRef = useRef(false);

  const pages = () => Array.from(document.querySelectorAll<HTMLElement>("[data-page]"));

  const animate = (top: number, after?: () => void) => {
    const start = window.scrollY;
    const dist = top - start;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduce ? 0 : 640;
    if (dur === 0) { window.scrollTo(0, top); after?.(); return; }
    let t0 = 0;
    const ease = (p: number) => 1 - Math.pow(1 - p, 3);
    const step = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      window.scrollTo(0, start + dist * ease(p));
      if (p < 1) requestAnimationFrame(step);
      else after?.();
    };
    requestAnimationFrame(step);
  };

  const goTo = (i: number) => {
    const els = pages();
    const clamped = Math.max(0, Math.min(els.length - 1, i));
    const t = els[clamped];
    if (!t) return;
    lock.current = true;
    idx.current = clamped;
    animate(Math.round(t.getBoundingClientRect().top + window.scrollY), () => setTimeout(() => { lock.current = false; }, 90));
  };

  // 칩 클릭 — 바로 글감으로
  const onSelectCat = (i: number) => { setCatSel(i); catRef.current = i; goTo(TOPICS); };
  // 토글 클릭 — 이동만(다음 스크롤이 다음 섹션)
  const onToggle = () => { setInfo((v) => !v); toggledRef.current = true; };

  useEffect(() => {
    // 로드 시 맨 위(히어로)부터 시작
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    idx.current = 0;

    const down = () => {
      if (lock.current) return;
      const i = idx.current;
      // 칩: 선택 전이면 병원·약국 자동선택 → 2초 뒤 글감
      if (i === CHIPS && catRef.current === null) {
        setCatSel(0); catRef.current = 0; lock.current = true;
        setTimeout(() => { lock.current = false; goTo(TOPICS); }, 2000);
        return;
      }
      // 토글: 한 번 안 움직였으면 토글만(이동 X)
      if (i === TOGGLE && !toggledRef.current) {
        setInfo(true); toggledRef.current = true;
        lock.current = true; setTimeout(() => { lock.current = false; }, 500);
        return;
      }
      goTo(i + 1);
    };
    const up = () => { if (lock.current) return; goTo(idx.current - 1); };

    const onWheel = (e: WheelEvent) => { e.preventDefault(); if (Math.abs(e.deltaY) < 4) return; e.deltaY > 0 ? down() : up(); };
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = startY - (e.changedTouches[0]?.clientY ?? 0);
      if (Math.abs(dy) < 30) return;
      dy > 0 ? down() : up();
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); down(); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); up(); }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="select-none bg-white text-neutral-900 antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSONLD).replace(/</g, "\\u003c") }} />
      <LandingHeader />
      <HeroNew />
      <Showcase sel={catSel} onSelect={onSelectCat} />
      <WriteModeSection info={info} onToggle={onToggle} />
      <FinalHook />
      <div data-page className="pb-24 sm:pb-0">
        <SiteFooter />
      </div>
    </div>
  );
}
