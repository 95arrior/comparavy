"use client";

import Brand from "@/components/Brand";
import DemoStream from "@/components/DemoStream";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";

// 새 랜딩 — 히어로 섹션(1단계). 토스식: 절제된 모션·충분한 여백·#1D75F7·Pretendard.
// 진짜 제품(DemoStream)을 비주얼로. 데스크탑 2열 / 모바일 스택 + 하단 고정 CTA.
export default function Hero() {
  const toForm = () => document.getElementById("signup")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-white text-neutral-900 antialiased">
      {/* 헤더 — 로고 확실히 상단 */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
        <Brand size={24} />
        <button onClick={toForm} className="rounded-full bg-[#1D75F7] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95">
          사전신청
        </button>
      </header>

      {/* 히어로 */}
      <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-32 pt-8 sm:px-8 sm:pt-16 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
        {/* 카피 */}
        <Reveal className="text-center lg:text-left">
          <p className="text-sm font-semibold tracking-tight text-[#1D75F7]">워드프레스 블로그 글쓰기</p>
          <h1
            className="font-pretendard mt-3 whitespace-nowrap font-bold leading-[1.12] tracking-tight"
            style={{ fontSize: "clamp(22px, 7.4vw, 56px)" }}
          >
            똑똑한 사장님들의 선택
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-lg lg:mx-0">
            24시간 일하는 직원이 필요하신가요?<br />
            좋은 글로 사장님이 자는 사이, 블로그로 손님들을 모아봐요
            <span className="ml-1 inline-flex align-middle">
              <span className="ateflo-holo ateflo-twinkle text-[0.9em] leading-none">✦</span>
              <span className="ateflo-holo ateflo-twinkle text-[0.7em] leading-none" style={{ animationDelay: "0.55s" }}>✦</span>
            </span>
          </p>

          <div id="signup" className="mt-9 scroll-mt-24 lg:max-w-md">
            <WaitlistForm source="hero" />
          </div>
        </Reveal>

        {/* 진짜 제품 데모 */}
        <Reveal delay={120} className="lg:pl-4">
          <DemoStream />
        </Reveal>
      </section>

      {/* 모바일 하단 고정 CTA (앱 느낌) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
        <button onClick={toForm} className="w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.99]">
          무료로 사전신청하기
        </button>
      </div>
    </div>
  );
}
