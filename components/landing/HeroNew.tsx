"use client";

import { useEffect, useState } from "react";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";

// 헤드라인 업종 룰렛 — 3초마다 위로 슬라이드(매장→병원→학원→카페). 2글자·포괄적.
const ROLES = ["매장", "병원", "학원", "업체"];
function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((p) => (p + 1) % ROLES.length), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block h-[1.1em] overflow-hidden align-bottom">
      <span key={i} className="ateflo-slot-up block leading-[1.1]">
        {ROLES[i]}
      </span>
    </span>
  );
}

// 새 히어로 — 토스플레이스st: 크게·심플·시네마틱. 큰 한 문장 + 짧은 서브 + 사전신청. 군더더기 0.
export default function HeroNew() {
  const toForm = () => {
    const input = document.getElementById("hero-email") as HTMLInputElement | null;
    if (input) {
      input.focus({ preventScroll: true });
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      document.getElementById("signup")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-white">
      {/* 시네마틱 무빙 오로라 — 1섹션 전체를 덮음(풀스크린) */}
      <div
        className="ateflo-hero-aurora pointer-events-none absolute inset-0"
        style={{
          backgroundColor: "#c9e3ff",
          backgroundImage:
            "radial-gradient(60% 70% at 12% 16%,#fdf3bf,transparent 60%)," +
            "radial-gradient(70% 80% at 86% 78%,#84c2ff,transparent 62%)," +
            "radial-gradient(66% 76% at 58% 40%,#d6ecff,transparent 66%)," +
            "radial-gradient(60% 70% at 28% 92%,#b8f0e2,transparent 60%)",
        }}
      />
      {/* 하단 화이트 페이드(길게) — 오로라가 다음 섹션으로 매끄럽게 녹아들게 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] bg-gradient-to-b from-transparent via-white/70 to-white" />
      <section className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <Reveal>
          <p className="text-sm font-semibold tracking-tight text-[#1D75F7] sm:text-base">검색되는 블로그, 한 번에</p>
          <h1 className="font-pretendard mt-4 text-[clamp(32px,8vw,56px)] font-bold leading-[1.12] tracking-[-0.02em]">
            똑똑한 <RotatingWord /> 블로그 마케팅
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <div id="signup" className="mx-auto mt-11 max-w-md scroll-mt-24">
            <WaitlistForm source="hero" inputId="hero-email" />
          </div>
        </Reveal>

        {/* 하단 미리보기 이미지 — 더 내리고, 하단(신발)은 투명 흘림으로 가림. 모바일 풀블리드 */}
        <Reveal delay={220} className="-mx-6 mt-16 sm:mx-0 sm:mt-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero.png"
            alt="에이트플로 미리보기"
            className="mx-auto w-full max-w-5xl"
            style={{
              maskImage: "linear-gradient(to bottom, #000 54%, transparent 88%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 54%, transparent 88%)",
            }}
          />
        </Reveal>
      </section>

      {/* 모바일 하단 고정 CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 px-4 pt-3 backdrop-blur sm:hidden"
        style={{ paddingBottom: "calc(0.9rem + env(safe-area-inset-bottom))" }}
      >
        <button onClick={toForm} className="w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.99]">
          무료로 사전신청하기
        </button>
      </div>
    </div>
  );
}
