"use client";

import DemoStream from "@/components/DemoStream";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";

// 새 랜딩 히어로 — 메인 포지셔닝: "키워드 하나 → 세 곳(워드프레스·네이버·스레드) 글이 한 번에".
// 자영업자 결핍(채널마다 따로 쓰기 벅참) → WOW(3곳 한번에). 토스식 절제·여백·#1D75F7.

// 채널 칩 — 균일한 높이/패딩의 텍스트 칩(이미지 X). 각각 다르게 둥실 요동 + 파스텔 글로우(매직).
// 색: 워드프레스=블루 · 네이버=그린 · 스레드=블랙(그레이).
// 칩은 고정, 내부 오로라만 3개 다 다르게 움직임(랜덤 번짐).
// 밝은 파스텔이 여러 색 매끄럽게 섞인 오로라(동그란 형태 X). 채널별 dominant만 다름.
// 워드프레스=블루 위주 · 네이버=그린 위주 · 스레드=전 파스텔 완전 혼합.
// 칩 고정, 내부 오로라만 3개 다 다르게 번짐. 채널 중심색 dominant(흰 글씨 가독 위해 중간 파스텔).
// 채널 중심색 dominant(진한 파스텔, 흰 글씨). 깃발 출렁임(바깥)+오로라 번짐(안), 칩마다 속도 달라 랜덤.
const CHIPS = [
  {
    label: "워드프레스", // 블루 중심
    bg: "radial-gradient(140% 160% at 15% 20%,#6aa6ff,transparent 74%),radial-gradient(150% 170% at 86% 80%,#2f78ea,transparent 76%),radial-gradient(160% 180% at 55% 46%,#8fbcf2,transparent 80%)",
    base: "#3f86ec", dur: 7, flag: 4.2, delay: 0,
  },
  {
    label: "네이버", // 그린 중심
    bg: "radial-gradient(140% 160% at 18% 22%,#4cd190,transparent 74%),radial-gradient(150% 170% at 84% 78%,#089453,transparent 76%),radial-gradient(160% 180% at 56% 46%,#74d3a4,transparent 80%)",
    base: "#0c9d5b", dur: 9, flag: 4.8, delay: -3,
  },
  {
    label: "스레드", // 블랙 중심(슬레이트)
    bg: "radial-gradient(140% 160% at 16% 20%,#7c8799,transparent 74%),radial-gradient(150% 170% at 86% 80%,#39414f,transparent 76%),radial-gradient(160% 180% at 55% 48%,#8b97ab,transparent 80%)",
    base: "#454e5e", dur: 8, flag: 4.5, delay: -5,
  },
];
function ChannelChip({ i }: { i: number }) {
  const c = CHIPS[i];
  // 바깥=깃발 출렁(transform), 안=오로라 번짐(background) — 분리해 충돌 방지
  return (
    <div className="ateflo-flag" style={{ animationDuration: `${c.flag}s`, animationDelay: `${c.delay}s` }}>
      <span
        className="ateflo-chip-bloom inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-bold text-white shadow-[0_4px_14px_-7px_rgba(20,40,90,0.3)] ring-1 ring-white/25 sm:text-sm"
        style={{ backgroundImage: c.bg, backgroundColor: c.base, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
      >
        {c.label}
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
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 lg:justify-start">
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
