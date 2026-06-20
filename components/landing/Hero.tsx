"use client";

import { useState } from "react";
import DemoStream from "@/components/DemoStream";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";

// 새 랜딩 히어로 — 메인 포지셔닝: "키워드 하나 → 세 곳(워드프레스·네이버·스레드) 글이 한 번에".
// 자영업자 결핍(채널마다 따로 쓰기 벅참) → WOW(3곳 한번에). 토스식 절제·여백·#1D75F7.

// 채널 배지 — 커스텀 아이콘(브랜드 로고 사칭 회피). 각각 다르게 둥실 요동 + 오로라 글로우(매직).
const FLOAT = ["ateflo-ch1", "ateflo-ch2", "ateflo-ch3"];
const GLOW = ["#5b9bff", "#3ecf8e", "#9aa3b2"]; // 워드프레스=파스텔 블루 · 네이버=파스텔 그린 · 스레드=파스텔 블랙(소프트 그레이)
function ChannelBadge({ src, label, i }: { src: string; label: string; i: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {/* 오로라 글로우 — 이미지 뒤에서 부드럽게 호흡 */}
      <div
        className="ateflo-chglow pointer-events-none absolute left-1/2 top-1 h-10 w-10 rounded-full blur-xl sm:h-12 sm:w-12"
        style={{ background: GLOW[i], animationDelay: `${i * -1.3}s` }}
      />
      <div className={FLOAT[i]}>
        {ok ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} onError={() => setOk(false)} className="relative h-11 w-11 rounded-xl object-contain sm:h-12 sm:w-12" />
        ) : (
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-sm font-bold text-neutral-400 sm:h-12 sm:w-12">{label[0]}</div>
        )}
      </div>
      <span className="text-[12px] font-medium text-neutral-500">{label}</span>
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

          {/* 3채널 배지 */}
          <div className="mt-5 flex items-center justify-center gap-5 sm:gap-7 lg:justify-start">
            <ChannelBadge src="/channel-wordpress.png" label="워드프레스" i={0} />
            <ChannelBadge src="/channel-naver.png" label="네이버" i={1} />
            <ChannelBadge src="/channel-threads.png" label="스레드" i={2} />
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
