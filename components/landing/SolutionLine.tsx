"use client";

import { useEffect, useRef, useState } from "react";

// "그래서 다 해드려요." — 스크롤이 화면 중앙에 왔을 때 단어가 도미노식으로 튀며 등장,
// 마지막에 홀로그램 AI 별(✦✦)이 등장. 크기는 H1("똑똑한 사장님들의 선택")과 동일.
const WORDS = [
  { t: "그래서", c: "" },
  { t: "다", c: "text-[#1D75F7]" },
  { t: "해드려요.", c: "text-[#1D75F7]" },
];

export default function SolutionLine() {
  const ref = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 요소가 화면 '중앙' 띠에 들어오면 작동
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setGo(true); io.disconnect(); } },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const starDelay = WORDS.length * 0.14 + 0.1;

  return (
    <div ref={ref} className="mt-16 sm:mt-20">
      <p className="font-pretendard text-[clamp(36px,11.5vw,58px)] font-bold leading-[1.12] tracking-tight sm:text-[clamp(22px,7.4vw,56px)]">
        {WORDS.map((w, i) => (
          <span
            key={i}
            className={`${w.c} ${i < WORDS.length - 1 ? "mr-[0.26em]" : ""} ${go ? "ateflo-domino" : "inline-block opacity-0"}`}
            style={go ? { animationDelay: `${i * 0.14}s` } : undefined}
          >
            {w.t}
          </span>
        ))}
        <span
          className={`ml-2 inline-flex align-middle ${go ? "ateflo-domino" : "opacity-0"}`}
          style={go ? { animationDelay: `${starDelay}s` } : undefined}
        >
          <svg className="ateflo-wand h-[0.82em] w-[0.82em] text-[#1D75F7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
            <path d="m14 7 3 3" />
            <path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" />
          </svg>
        </span>
      </p>
      <p
        className="mt-3 text-[15px] leading-relaxed text-neutral-500 transition-opacity duration-500 sm:text-lg"
        style={{ opacity: go ? 1 : 0, transitionDelay: `${starDelay + 0.15}s` }}
      >
        오래가는 블로그 운영, 곁에서 도울게요.
      </p>
    </div>
  );
}
