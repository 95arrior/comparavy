"use client";

import { useEffect, useRef, useState } from "react";
import WaitlistForm from "@/components/WaitlistForm";

// [마지막] 훅 — 흩어진 메시지를 한 방으로 압축 → 사전신청 한 가지 행동. 애플식 절제 stagger.
export default function FinalHook() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(r);
    if (r) { setShown(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { rootMargin: "0px 0px -40% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const st = (i: number) =>
    reduce
      ? undefined
      : {
          transitionProperty: "opacity, transform",
          transitionDuration: "0.6s",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: shown ? `${i * 100}ms` : "0ms",
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(16px)",
        };

  return (
    <section ref={ref} className="overflow-x-hidden bg-[#f6f8fc] py-24 sm:py-32">
      <div className="mx-auto max-w-xl px-5 text-center sm:px-6">
        <p style={st(0)} className="text-[13px] leading-relaxed text-neutral-400">
          검색 상위는 먼저 쌓은 사람이 가져가요. 늦을수록 따라잡기 어렵고요.
        </p>

        <h2 style={st(1)} className="font-pretendard mt-5 text-[clamp(26px,7vw,40px)] font-bold leading-[1.2] tracking-tight">
          먼저 쌓은 사람이,<br />검색을 가져가요
        </h2>

        <p style={st(2)} className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base">
          매일 글감이 오고, 글은 검색에 쌓이고, 그게 사장님만의 자산이 돼요.
        </p>

        <p style={st(3)} className="mx-auto mt-8 max-w-md text-[14px] leading-relaxed text-neutral-500">
          대행사 한 달 비용이면, 에이트플로는 일 년.<br />
          <span className="text-neutral-400">사전신청자에겐 가장 먼저, 가장 좋은 조건으로 열어드려요.</span>
        </p>

        <div style={st(4)} className="mx-auto mt-9 max-w-md">
          <WaitlistForm source="final" />
        </div>
      </div>
    </section>
  );
}
