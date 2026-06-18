"use client";

import { useEffect, useRef, useState } from "react";

// "그래서 다 해드려요." — 스크롤이 화면 중앙에 왔을 때 단어가 도미노식으로 튀며 등장,
// 마지막에 홀로그램 AI 별(✦✦)이 등장. 크기는 H1("똑똑한 사장님들의 선택")과 동일.
const WORDS: { t: string; aurora?: boolean }[] = [
  { t: "그래서" },
  { t: "다", aurora: true },
  { t: "해드려요.", aurora: true },
];

export default function SolutionLine() {
  const ref = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 화면에 들어오면 바로 작동 (다른 스크롤 등장 애니와 동일 타이밍)
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setGo(true); io.disconnect(); } },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
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
            className={`${i < WORDS.length - 1 ? "mr-[0.26em]" : ""} ${go ? "ateflo-domino" : "inline-block opacity-0"}`}
            style={go ? { animationDelay: `${i * 0.14}s` } : undefined}
          >
            {w.aurora ? <span className="ateflo-aurora">{w.t}</span> : w.t}
          </span>
        ))}
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
