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
            className={`${w.c} ${go ? "ateflo-domino" : "inline-block opacity-0"}`}
            style={go ? { animationDelay: `${i * 0.14}s` } : undefined}
          >
            {w.t}
            {i < WORDS.length - 1 ? " " : ""}
          </span>
        ))}
        <span
          className={`ml-1.5 inline-flex align-middle ${go ? "ateflo-domino" : "opacity-0"}`}
          style={go ? { animationDelay: `${starDelay}s` } : undefined}
        >
          <span className="ateflo-holo ateflo-twinkle text-[0.55em] leading-none">✦</span>
          <span className="ateflo-holo ateflo-twinkle text-[0.42em] leading-none" style={{ animationDelay: "0.55s" }}>✦</span>
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
