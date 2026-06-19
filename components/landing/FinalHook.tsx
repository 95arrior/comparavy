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
          직접 해봤다면 아실 거예요. 3일 못 가 멈추는 이유는, 뭘 쓸지 몰라서예요.
        </p>

        <h2 style={st(1)} className="font-pretendard mt-5 text-[clamp(26px,7vw,40px)] font-bold leading-[1.2] tracking-tight">
          이번엔, 안 멈춰요<br />사장님은 키워드만 고르면 돼요
        </h2>

        <p style={st(2)} className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base">
          글감은 매일 오고, 검색은 알아서 되고, 손님은 자는 사이에 와요.
        </p>

        <p style={st(3)} className="mx-auto mt-8 max-w-md text-[14px] leading-relaxed text-neutral-500">
          대행사 한 달 값이면, 에이트플로는 일 년을 함께해요.<br />
          <span className="text-neutral-400">정확한 가격은 사전신청자에게 가장 먼저, 더 좋은 조건으로.</span>
        </p>

        <div style={st(4)} className="mx-auto mt-9 max-w-md">
          <WaitlistForm source="final" />
        </div>
      </div>
    </section>
  );
}
