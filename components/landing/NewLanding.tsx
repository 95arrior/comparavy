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
  const [detail, setDetail] = useState(false); // 업종 글감(B) 펼침 여부
  const [detailCard, setDetailCard] = useState(0); // 기타: '자세히' 누른 서브카드 인덱스
  const idx = useRef(0);
  const lock = useRef(false);
  const catRef = useRef<number | null>(null);
  const toggledRef = useRef(false);
  const detailRef = useRef(false);
  const etcActiveRef = useRef(0); // 기타 캐러셀 현재 카드(스와이프로 글감 펼칠 때 사용)
  const pagesRef = useRef<HTMLElement[]>([]);
  const reduceRef = useRef(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dim, setDim] = useState(false);

  // '깜빡 컷' — 슬라이드 대신 짧게 페이드아웃 → 그 순간 즉시 전환 → 페이드인. (슬라이드 렉이 안 보임)
  const goTo = (i: number) => {
    const els = pagesRef.current.length ? pagesRef.current : Array.from(document.querySelectorAll<HTMLElement>("[data-page]"));
    const clamped = Math.max(0, Math.min(els.length - 1, i));
    const t = els[clamped];
    if (!t) return;
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null; }
    lock.current = true;
    idx.current = clamped;
    if (reduceRef.current) { t.scrollIntoView({ behavior: "auto", block: "start" }); lock.current = false; return; }
    setDim(true);
    setTimeout(() => {
      t.scrollIntoView({ behavior: "auto", block: "start" }); // 깜빡인 순간 즉시 전환
      setDim(false);
      setTimeout(() => { lock.current = false; }, 110);
    }, 110);
  };

  // 칩 클릭 — 업종 소개(A)로. 글감 펼침·서브카드 리셋(항상 소개부터)
  const onSelectCat = (i: number) => { setCatSel(i); catRef.current = i; setDetail(false); detailRef.current = false; etcActiveRef.current = 0; setDetailCard(0); goTo(TOPICS); };
  const openDetail = (card = 0) => { setDetail(true); detailRef.current = true; setDetailCard(card); };
  const closeDetail = () => { setDetail(false); detailRef.current = false; };
  // 토글 클릭 — 이동만(다음 스크롤이 다음 섹션)
  const onToggle = () => { setInfo((v) => !v); toggledRef.current = true; };

  useEffect(() => {
    // 로드 시 맨 위(히어로)부터 시작 + 페이지 캐싱
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    idx.current = 0;
    pagesRef.current = Array.from(document.querySelectorAll<HTMLElement>("[data-page]"));
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const refresh = () => { pagesRef.current = Array.from(document.querySelectorAll<HTMLElement>("[data-page]")); };
    window.addEventListener("resize", refresh);

    const down = () => {
      if (lock.current) return;
      const i = idx.current;
      // 칩: 선택 전이면 병원·약국 자동선택. 2초 무반응이면 글감으로, 그 전에 한 번 더 스크롤하면 바로 이동
      if (i === CHIPS && catRef.current === null) {
        setCatSel(0); catRef.current = 0;
        lock.current = true; setTimeout(() => { lock.current = false; }, 450);
        autoTimer.current = setTimeout(() => goTo(TOPICS), 2000);
        return;
      }
      // 글감(B)은 '자세히' 버튼으로만 — 소개(A)에서 스와이프하면 다음 섹션(블로그 누구나)으로.
      // 글감 보는 중 아래로 스와이프하면 소개로 리셋하며 다음 섹션으로.
      if (i === TOPICS && detailRef.current) { setDetail(false); detailRef.current = false; }
      // 토글: 한 번 안 움직였으면 토글만(이동 X)
      if (i === TOGGLE && !toggledRef.current) {
        setInfo(true); toggledRef.current = true;
        lock.current = true; setTimeout(() => { lock.current = false; }, 500);
        return;
      }
      goTo(i + 1);
    };
    const up = () => {
      if (lock.current || idx.current <= 0) return;
      // 글감(B)에서 위로 → 소개(A)로 닫기(이전 섹션으로 안 감)
      if (idx.current === TOPICS && detailRef.current) {
        setDetail(false); detailRef.current = false;
        lock.current = true; setTimeout(() => { lock.current = false; }, 450);
        return;
      }
      goTo(idx.current - 1);
    };

    // 마지막 풀페이지 섹션(피날레) 아래 = 푸터 영역 → 풀페이지 해제(일반 스크롤)
    const lastIdx = () => pagesRef.current.length - 1;
    const finaleTop = () => { const el = pagesRef.current[lastIdx()]; return el ? el.getBoundingClientRect().top + window.scrollY : Infinity; };
    const inFooterZone = () => window.scrollY >= finaleTop() - 2;
    const atFinaleTop = () => window.scrollY <= finaleTop() + 4;

    const onWheel = (e: WheelEvent) => {
      if (inFooterZone()) {
        // 푸터 영역: 일반 스크롤. 단 피날레 최상단에서 위로 가면 풀페이지 재개
        if (e.deltaY < 0 && atFinaleTop()) { e.preventDefault(); idx.current = lastIdx(); up(); }
        return;
      }
      e.preventDefault();
      if (Math.abs(e.deltaY) < 4) return;
      e.deltaY > 0 ? down() : up();
    };
    let startY = 0, startX = 0, inHScroll = false, hScrollHoriz = false;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startY = t?.clientY ?? 0;
      startX = t?.clientX ?? 0;
      // 가로 캐러셀(data-hscroll) 안에서 시작한 터치인지
      inHScroll = Boolean((e.target as HTMLElement)?.closest?.("[data-hscroll]"));
      hScrollHoriz = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (inFooterZone()) return;
      // 캐러셀 안 '가로' 제스처면 네이티브 스크롤 허용(페이지 컨트롤러가 안 가로챔)
      if (inHScroll && !hScrollHoriz) {
        const t = e.touches[0];
        const dx = Math.abs((t?.clientX ?? 0) - startX);
        const dy = Math.abs((t?.clientY ?? 0) - startY);
        if (dx > dy && dx > 6) hScrollHoriz = true;
      }
      if (inHScroll && hScrollHoriz) return;
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (inHScroll && hScrollHoriz) return; // 가로 스와이프는 페이지 이동 안 함
      const dy = startY - (e.changedTouches[0]?.clientY ?? 0);
      if (Math.abs(dy) < 30) return;
      if (inFooterZone()) {
        if (dy < 0 && atFinaleTop()) { idx.current = lastIdx(); up(); }
        return;
      }
      dy > 0 ? down() : up();
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const isDown = e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ";
      const isUp = e.key === "ArrowUp" || e.key === "PageUp";
      if (!isDown && !isUp) return;
      if (inFooterZone()) {
        if (isUp && atFinaleTop()) { e.preventDefault(); idx.current = lastIdx(); up(); }
        return;
      }
      e.preventDefault();
      isDown ? down() : up();
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
      window.removeEventListener("resize", refresh);
    };
  }, []);

  // 사전신청 CTA — 히어로(맨 위)로 가서 이메일 포커스.
  // 모바일 키보드는 '사용자 제스처 안에서 동기 focus'라야 떠서, goTo 전에 먼저 focus한다.
  const toForm = () => {
    const el = document.getElementById("hero-email") as HTMLInputElement | null;
    el?.focus({ preventScroll: true }); // 탭 제스처 컨텍스트 유지 → 모바일 키보드 올라옴
    goTo(0);
    setTimeout(() => el?.focus({ preventScroll: true }), 320); // 전환 후 포커스 재보장
  };

  return (
    <div className="select-none bg-white text-neutral-900 antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSONLD).replace(/</g, "\\u003c") }} />
      {/* nav — 깜빡 제외 */}
      <LandingHeader />
      {/* 섹션 콘텐츠만 깜빡(컷) */}
      <div style={{ opacity: dim ? 0.06 : 1, transition: "opacity 0.11s ease-in-out" }}>
        <HeroNew />
        <Showcase sel={catSel} onSelect={onSelectCat} detail={detail} detailCard={detailCard} onDetail={openDetail} onBack={closeDetail} onEtcActive={(i) => { etcActiveRef.current = i; }} />
        <WriteModeSection info={info} onToggle={onToggle} />
        <FinalHook onCTA={toForm} />
        <div className="pb-24 sm:pb-0">
          <SiteFooter />
        </div>
      </div>
      {/* 모바일 하단 고정 CTA — 깜빡 제외 */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 px-4 pt-3 backdrop-blur sm:hidden"
        style={{ paddingBottom: "calc(0.9rem + env(safe-area-inset-bottom))" }}
      >
        <button onClick={toForm} className="w-full rounded-xl tk-grad-cta py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.99]">
          무료로 사전신청하기
        </button>
      </div>
    </div>
  );
}
