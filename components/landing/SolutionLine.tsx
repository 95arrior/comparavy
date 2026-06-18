"use client";

import { useEffect, useRef, useState } from "react";

// "그래서 다 해드려요." — 화면에 들어오면 단어가 도미노식으로 튀며 등장하고,
// 마지막에 AteFlo 로고가 빛나며 나타남.
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
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setGo(true); io.disconnect(); } },
      { threshold: 0.55 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const logoDelay = WORDS.length * 0.14 + 0.12;

  return (
    <div ref={ref} className="mt-16 sm:mt-20">
      <p className="font-pretendard text-[1.7rem] font-bold leading-snug tracking-tight sm:text-[2rem]">
        {WORDS.map((w, i) => (
          <span
            key={i}
            className={`${w.c} ${go ? "ateflo-domino" : "inline-block opacity-0"}`}
            style={go ? { animationDelay: `${i * 0.14}s` } : undefined}
          >
            {w.t}
            {i < WORDS.length - 1 ? " " : ""}
          </span>
        ))}
        <span
          className={`ml-2 inline-flex -translate-y-0.5 align-middle ${go ? "ateflo-logo-glow" : "opacity-0"}`}
          style={go ? { animationDelay: `${logoDelay}s` } : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ateflo-mark.png?v=2" alt="" aria-hidden className="h-7 w-7" />
        </span>
      </p>
      <p
        className="mt-3 text-[15px] leading-relaxed text-neutral-500 transition-opacity duration-500 sm:text-lg"
        style={{ opacity: go ? 1 : 0, transitionDelay: `${logoDelay + 0.15}s` }}
      >
        오래가는 블로그 운영, 곁에서 도울게요.
      </p>
    </div>
  );
}
