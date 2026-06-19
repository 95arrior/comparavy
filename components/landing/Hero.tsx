"use client";

import DemoStream from "@/components/DemoStream";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";

// 새 랜딩 — 히어로 섹션(1단계). 토스식: 절제된 모션·충분한 여백·#1D75F7·Pretendard.
// 진짜 제품(DemoStream)을 비주얼로. 데스크탑 2열 / 모바일 스택 + 하단 고정 CTA.
export default function Hero() {
  // 버튼 클릭 → 신청 인풋에 포커스(모바일 키보드까지) + 부드럽게 스크롤.
  // iOS는 키보드가 뜨려면 클릭 제스처 안에서 동기적으로 focus 해야 함.
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
    <div className="overflow-x-hidden bg-white text-neutral-900 antialiased">
      {/* 히어로 */}
      <section className="mx-auto grid max-w-6xl gap-12 overflow-x-hidden px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-16 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
        {/* 카피 (모바일: 제목·부제·신청폼) */}
        <Reveal className="text-center lg:text-left">
          <p className="text-sm font-semibold tracking-tight text-[#1D75F7]">검색되는 블로그</p>
          <h1 className="font-pretendard mt-3 whitespace-nowrap text-[clamp(21px,6.7vw,52px)] font-bold leading-[1.14] tracking-tight">
            자는 사이에도 손님이 와요
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-lg lg:mx-0">
            좋은 글이 검색되고, 검색이 손님이 돼요.<br />
            사장님은 키워드만 고르면 돼요.
            <span className="ml-1 inline-flex align-middle">
              <span className="ateflo-holo ateflo-twinkle text-[0.9em] leading-none">✦</span>
              <span className="ateflo-holo ateflo-twinkle text-[0.7em] leading-none" style={{ animationDelay: "0.55s" }}>✦</span>
            </span>
          </p>

          <div id="signup" className="mt-9 scroll-mt-24 lg:max-w-md">
            <WaitlistForm source="hero" inputId="hero-email" />
          </div>
        </Reveal>

        {/* 진짜 제품 데모 — 모바일에선 신청폼 아래에 */}
        <Reveal delay={120} className="min-w-0 lg:pl-4">
          <DemoStream />
        </Reveal>
      </section>

      {/* 모바일 하단 고정 CTA (앱 느낌) — 아이폰 홈 인디케이터(safe-area)만큼 위로 */}
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
