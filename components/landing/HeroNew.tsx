"use client";

import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";

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
      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <Reveal>
          <p className="text-sm font-semibold tracking-tight text-[#1D75F7] sm:text-base">검색되는 블로그, 한 번에</p>
          <h1 className="font-pretendard mt-4 text-[clamp(34px,8.4vw,62px)] font-bold leading-[1.1] tracking-[-0.02em]">
            키워드 하나로,
            <br />
            검색되는 글이 나와요
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-neutral-500 sm:text-xl">
            워드프레스 · 네이버 · 스레드까지,
            <br className="sm:hidden" /> 채널마다 딱 맞게.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <div id="signup" className="mx-auto mt-11 max-w-md scroll-mt-24">
            <WaitlistForm source="hero" inputId="hero-email" />
          </div>
          <p className="mt-3 text-xs text-neutral-400">오픈하면 가장 먼저 알려드릴게요 · 스팸 없어요</p>
        </Reveal>

        {/* 하단 미리보기 이미지 — 블랙 배경을 screen 블렌드로 날려 오로라 위에 자연스럽게 */}
        <Reveal delay={220} className="mt-10 w-full sm:mt-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero.png"
            alt="에이트플로 미리보기"
            className="mx-auto w-full max-w-2xl"
            style={{ mixBlendMode: "screen" }}
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
