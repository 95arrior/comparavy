"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DemoStream from "@/components/DemoStream";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";

// 새 랜딩 히어로 — 메인 포지셔닝: "키워드 하나 → 세 곳(워드프레스·네이버·스레드) 글이 한 번에".
// 자영업자 결핍(채널마다 따로 쓰기 벅참) → WOW(3곳 한번에). 토스식 절제·여백·#1D75F7.

// 채널 = 텍스트 칩(브랜드 이름·색). 로고 마크 X(가장 안전).
// 자동 시퀀스: 워드프레스→네이버→스레드 하나씩 켜지고 나머진 디세이블 + 하단 부제로 특징 설명 → 마지막 다 켜짐.
const CHANNELS = [
  { en: "WordPress", color: "#7159e8", feature: "구글 검색에 걸리는 SEO 장문으로 써드려요" },
  { en: "NAVER", color: "#03C75A", feature: "네이버 블로그에 맞춰 깔끔하게 정리해요" },
  { en: "Threads", color: "#0b0b0c", feature: "스레드에선 짧고 후킹되게 바꿔드려요" },
];
const ALL_FEATURE = "키워드 하나면, 채널마다 딱 맞는 글 3개가 나와요";

function ChannelShowcase() {
  const [phase, setPhase] = useState(0); // 0·1·2=각 채널, 3=전체 켜짐
  const wrapRef = useRef<HTMLDivElement>(null);
  const c0 = useRef<HTMLSpanElement>(null);
  const c1 = useRef<HTMLSpanElement>(null);
  const c2 = useRef<HTMLSpanElement>(null);
  const chipRefs = [c0, c1, c2];
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(3);
      return;
    }
    const durs = [1900, 1900, 1900, 2400];
    let p = 0;
    let to: ReturnType<typeof setTimeout>;
    const tick = () => {
      p = (p + 1) % 4;
      setPhase(p);
      to = setTimeout(tick, durs[p]);
    };
    to = setTimeout(tick, durs[0]);
    return () => clearTimeout(to);
  }, []);

  // 활성 칩 위치로 슬라이딩 필 이동(띠용) — phase 3(전체)에선 숨김
  const measure = useCallback(() => {
    const el = chipRefs[Math.min(phase, 2)].current;
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const isAll = phase === 3;
  const feature = isAll ? ALL_FEATURE : CHANNELS[phase].feature;
  const activeColor = CHANNELS[Math.min(phase, 2)].color;

  return (
    <>
      <div ref={wrapRef} className="relative mt-6 inline-flex gap-2">
        {/* 슬라이딩 필 — 칩→칩으로 쓱(스프링/띠용) 이동 */}
        <span
          aria-hidden
          className="absolute inset-y-0 rounded-full"
          style={{
            left: pill.left,
            width: pill.width,
            backgroundColor: activeColor,
            opacity: isAll || pill.width === 0 ? 0 : 1,
            boxShadow: "0 6px 18px -7px rgba(20,40,90,0.4)",
            transition:
              "left .5s cubic-bezier(0.34,1.55,0.6,1), width .5s cubic-bezier(0.34,1.55,0.6,1), background-color .35s ease, opacity .3s ease",
          }}
        />
        {CHANNELS.map((c, i) => (
          <span
            key={c.en}
            ref={chipRefs[i]}
            className="relative z-10 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300"
            style={{
              backgroundColor: isAll ? c.color : phase === i ? "transparent" : "#f3f4f6",
              color: isAll || phase === i ? "#fff" : "#9ca3af",
              boxShadow: isAll ? "0 6px 18px -7px rgba(20,40,90,0.4)" : undefined,
            }}
          >
            {c.en}
          </span>
        ))}
      </div>
      <p key={feature} className="ateflo-soft-in mx-auto mt-4 h-6 max-w-md text-[15px] font-medium leading-relaxed text-neutral-600 sm:text-base lg:mx-0">
        {feature}
      </p>
    </>
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

          {/* 3채널 — 자동 시퀀스(하나씩 켜짐) + 하단 부제로 채널 특징 */}
          <ChannelShowcase />

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
        <button onClick={toForm} className="w-full rounded-xl tk-grad-cta py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.99]">
          무료로 사전신청하기
        </button>
      </div>
    </div>
  );
}
