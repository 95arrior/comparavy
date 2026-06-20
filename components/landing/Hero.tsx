"use client";

import DemoStream from "@/components/DemoStream";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";

// 새 랜딩 히어로 — 메인 포지셔닝: "키워드 하나 → 세 곳(워드프레스·네이버·스레드) 글이 한 번에".
// 자영업자 결핍(채널마다 따로 쓰기 벅참) → WOW(3곳 한번에). 토스식 절제·여백·#1D75F7.

// 채널 칩 — 균일한 높이/패딩의 텍스트 칩(이미지 X). 각각 다르게 둥실 요동 + 파스텔 글로우(매직).
// 색: 워드프레스=블루 · 네이버=그린 · 스레드=블랙(그레이).
const FLOAT = ["ateflo-ch1", "ateflo-ch2", "ateflo-ch3"];
// 로고 X(회색지대) → 칩 내부에 채널색 파스텔 오로라가 '물감 번지듯' 방랑. 이름은 한글.
// 방울(radial) 3개가 제각각 경로로 떠다님 + 채널마다 속도/위상 달라 랜덤하게 보임.
const CHIPS = [
  {
    label: "워드프레스", // 파스텔 블루
    bg: "radial-gradient(45% 60% at 25% 30%,#93c5fd,transparent 60%),radial-gradient(50% 65% at 80% 65%,#bfdbfe,transparent 62%),radial-gradient(42% 56% at 60% 92%,#c7d2fe,transparent 58%)",
    base: "#eef4ff", dur: 7, delay: 0,
  },
  {
    label: "네이버", // 파스텔 그린
    bg: "radial-gradient(45% 60% at 22% 35%,#6ee7b7,transparent 60%),radial-gradient(50% 65% at 82% 60%,#a7f3d0,transparent 62%),radial-gradient(42% 56% at 58% 92%,#99f6e4,transparent 58%)",
    base: "#ecfdf3", dur: 9, delay: -3,
  },
  {
    label: "스레드", // 파스텔 블랙(그레이)
    bg: "radial-gradient(45% 60% at 24% 32%,#b8bfc9,transparent 60%),radial-gradient(50% 65% at 80% 64%,#d1d5db,transparent 62%),radial-gradient(42% 56% at 60% 90%,#cbd5e1,transparent 58%)",
    base: "#f1f3f5", dur: 8, delay: -5,
  },
];
function ChannelChip({ i }: { i: number }) {
  const c = CHIPS[i];
  return (
    // 둥실(transform)은 바깥, 오로라(background-position)는 안 — 애니메이션 충돌 방지
    <div className={FLOAT[i]}>
      <span
        className="ateflo-chip-bloom inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold text-neutral-800 shadow-[0_4px_14px_-6px_rgba(20,40,90,0.25)] ring-1 ring-black/[0.06] sm:text-sm"
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
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 lg:justify-start">
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
