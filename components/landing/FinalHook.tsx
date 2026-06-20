"use client";

import { useEffect, useRef, useState } from "react";
import Brand from "@/components/Brand";

// 강점 — 정직선 안에서 우리가 진짜 하는 것들(과장 X)
const STRENGTHS = [
  "싹 키워드 선점",
  "의료광고법까지 준수",
  "우리 동네 키워드",
  "검색 심리 분석",
  "워드프레스·네이버·스레드",
  "글감부터 완성 글까지",
];

// [피날레] 흰 랜딩 끝에서 톤을 확 바꾸는 다크 블루 풀블리드 마무리. 자랑(강점) + FOMO.
function toForm() {
  const input = document.getElementById("hero-email") as HTMLInputElement | null;
  if (input) {
    input.focus({ preventScroll: true });
    input.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

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
      { rootMargin: "0px 0px -35% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const st = (i: number) =>
    reduce
      ? undefined
      : {
          transitionProperty: "opacity, transform",
          transitionDuration: "0.7s",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: shown ? `${i * 110}ms` : "0ms",
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(18px)",
        };

  return (
    <section ref={ref} data-page className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#0a1f54] px-2 py-20 text-center text-white">
      {/* 깊이감 — 위쪽 브랜드 블루 글로우, 아래 진한 네이비 */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% -10%, #1D75F7 0%, #143a8f 38%, #0a1f54 72%)" }} />
      <div className="pointer-events-none absolute left-1/2 top-[-18%] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[#1D75F7] opacity-30 blur-[110px]" />

      <div className="relative mx-auto max-w-2xl px-5 sm:px-6">
        <div style={st(0)} className="flex justify-center">
          <Brand light size={26} />
        </div>

        <h2 style={st(1)} className="font-pretendard mx-auto mt-7 max-w-xl text-[clamp(28px,7.4vw,46px)] font-bold leading-[1.16] tracking-tight">
          지금 안 쓰면,<br />경쟁자가 먼저 씁니다
        </h2>

        <p style={st(2)} className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/70 sm:text-lg">
          블로그는 먼저 쌓는 사람이 가져가요.<br className="hidden sm:block" />
          남들이 안 쓴 키워드를, 먼저 선점하세요.
        </p>

        {/* 강점 — 우리가 여기까지 합니다 */}
        <div style={st(3)} className="mx-auto mt-7 flex max-w-xl flex-wrap justify-center gap-2">
          {STRENGTHS.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-[12.5px] font-semibold text-white/90 ring-1 ring-white/15 sm:text-[13.5px]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7fc3ff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M5 13l4 4L19 7" /></svg>
              {s}
            </span>
          ))}
        </div>

        <button
          onClick={toForm}
          style={st(4)}
          className="mt-9 rounded-full bg-white px-9 py-4 text-[16px] font-bold text-[#1D75F7] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.5)] transition hover:opacity-90 active:scale-[0.98]"
        >
          사전신청하고 먼저 시작하기
        </button>

        <p style={st(5)} className="mt-4 text-[12px] text-white/45">
          오픈하면 가장 먼저 알려드릴게요 · 스팸 없어요
        </p>
      </div>
    </section>
  );
}
