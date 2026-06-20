"use client";

import { useState } from "react";
import DemoStream from "@/components/DemoStream";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";

// 새 랜딩 히어로 — 메인 포지셔닝: "키워드 하나 → 세 곳(워드프레스·네이버·스레드) 글이 한 번에".
// 자영업자 결핍(채널마다 따로 쓰기 벅참) → WOW(3곳 한번에). 토스식 절제·여백·#1D75F7.

// 채널 = 실제 앱 로고(공식 PNG). 흰 박스 + 드롭섀도(앱스토어 스타일). 호버 시 한글 라벨 툴팁.
// ★로고 PNG는 저작권상 직접 생성 불가 → public/에 공식 로고를 직접 넣어야 함. 없으면 폴백.
const FLOAT = ["ateflo-ch1", "ateflo-ch2", "ateflo-ch3"];
const APPS = [
  { src: "/app-wordpress.png", label: "워드프레스" },
  { src: "/app-naver.png", label: "네이버 블로그" },
  { src: "/app-threads.png", label: "스레드" },
];
function AppIcon({ i }: { i: number }) {
  const [ok, setOk] = useState(true);
  const a = APPS[i];
  return (
    <div className={`${FLOAT[i]} group relative`}>
      <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-[14px] bg-white p-1.5 shadow-[0_8px_20px_-6px_rgba(20,40,90,0.3)] ring-1 ring-black/[0.06] sm:h-[58px] sm:w-[58px]">
        {ok ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.src} alt={a.label} onError={() => setOk(false)} className="h-full w-full rounded-[10px] object-contain" />
        ) : (
          <span className="text-sm font-bold text-neutral-300">{a.label[0]}</span>
        )}
      </div>
      {/* 호버 툴팁 — 한글 라벨 */}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
        {a.label}
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
            <AppIcon i={0} />
            <AppIcon i={1} />
            <AppIcon i={2} />
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
