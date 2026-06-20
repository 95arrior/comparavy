"use client";

import DemoStream from "@/components/DemoStream";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";

// 새 랜딩 히어로 — 메인 포지셔닝: "키워드 하나 → 세 곳(워드프레스·네이버·스레드) 글이 한 번에".
// 자영업자 결핍(채널마다 따로 쓰기 벅참) → WOW(3곳 한번에). 토스식 절제·여백·#1D75F7.

// 채널 = 텍스트 칩(브랜드 이름·색). 로고 마크 X(가장 안전). 영문 표기 + 호버 시 한글 툴팁.
// 입체 깃발 출렁임(연속 loop), 칩마다 속도 달라 랜덤.
const CHANNELS = [
  { en: "WordPress", ko: "워드프레스", color: "#7159e8", flag: 4.2, delay: 0 }, // 보라
  { en: "NAVER", ko: "네이버 블로그", color: "#03C75A", flag: 4.8, delay: -2 }, // 그린
  { en: "Threads", ko: "스레드", color: "#0b0b0c", flag: 4.5, delay: -4 }, // 블랙
];
function ChannelChip({ i }: { i: number }) {
  const c = CHANNELS[i];
  return (
    <div className="ateflo-flag group relative" style={{ animationDuration: `${c.flag}s`, animationDelay: `${c.delay}s` }}>
      <span
        className="inline-flex items-center whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_6px_18px_-7px_rgba(20,40,90,0.4)]"
        style={{ backgroundColor: c.color }}
      >
        {c.en}
      </span>
      {/* 호버 툴팁 — 한글 */}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
        {c.ko}
      </span>
    </div>
  );
}

export default function Hero() {
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
        {/* 카피 */}
        <Reveal className="min-w-0 text-center lg:text-left">
          <p className="text-sm font-semibold tracking-tight text-[#1D75F7]">채널마다 글 따로 쓰기, 벅차죠?</p>
          <h1 className="font-pretendard mt-3 text-[clamp(23px,6.6vw,42px)] font-bold leading-[1.18] tracking-tight">
            키워드 하나면,<br />
            세 곳 글이 <span className="text-[#1D75F7]">한 번에</span>
          </h1>

          {/* 3채널 칩 */}
          <div className="mt-6 flex items-center justify-center gap-4 sm:gap-5 lg:justify-start">
            <ChannelChip i={0} />
            <ChannelChip i={1} />
            <ChannelChip i={2} />
          </div>

          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-lg lg:mx-0">
            사장님은 키워드만 고르면 끝.<br />
            블로그도, 네이버도, 스레드도 맞춰서 뽑아드려요.
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
