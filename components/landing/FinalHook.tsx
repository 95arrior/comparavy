"use client";

import { useEffect, useRef, useState } from "react";
import Brand from "@/components/Brand";

// 강점 — 정직선 안에서 우리가 진짜 하는 섬세한 것들(과장 X)
const STRENGTHS = [
  "경쟁 과열·검색 0 키워드는 걸러내요",
  "이미 쓴 글감은 자동 제외 — 안 겹쳐요",
  "의료광고법 등 업종 규정 준수",
  "동·구·전국, 업종 맞춤 지역까지",
  "워드프레스·네이버·스레드 각 채널 최적화",
  "매달 키워드 풀 갱신 — 트렌드 반영",
];

// [피날레] 흰 랜딩 끝에서 톤을 확 바꾸는 다크 블루 풀블리드 마무리. 자랑(강점) + FOMO.
// CTA는 컨트롤러(NewLanding)의 goTo(0) 기반 onCTA를 받아 idx 동기화(스크롤 오류 방지).
export default function FinalHook({ onCTA }: { onCTA: () => void }) {
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

  // 강점 카드 순차 등장(짧은 간격)
  const cardSt = (i: number) =>
    reduce
      ? undefined
      : {
          transitionProperty: "opacity, transform",
          transitionDuration: "0.6s",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: shown ? `${320 + i * 75}ms` : "0ms",
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(14px)",
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

        {/* 강점 — 순차로 하나씩 등장하는 카드 */}
        <div className="mx-auto mt-7 grid w-full max-w-lg grid-cols-2 gap-2">
          {STRENGTHS.map((s, i) => (
            <div key={s} style={cardSt(i)} className="flex items-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2.5 text-left ring-1 ring-white/[0.12]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7fc3ff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M5 13l4 4L19 7" /></svg>
              <span className="text-[11.5px] font-semibold leading-tight text-white/90 sm:text-[13px]">{s}</span>
            </div>
          ))}
        </div>
        <div style={cardSt(STRENGTHS.length)} className="mx-auto mt-2 w-full max-w-lg rounded-xl bg-[#1D75F7]/20 px-3 py-2.5 text-center ring-1 ring-[#1D75F7]/30">
          <span className="text-[12px] font-bold text-white sm:text-[13px]">그리고, 셀 수 없이 많은 디테일이 더 있어요</span>
        </div>

        <button
          onClick={onCTA}
          style={cardSt(STRENGTHS.length + 2)}
          className="mt-9 rounded-full bg-white px-9 py-4 text-[16px] font-bold text-[#1D75F7] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.5)] transition-colors duration-[500ms] ease-out hover:bg-[#cfe2ff] active:scale-[0.98]"
        >
          사전신청하고 먼저 시작하기
        </button>

        <p style={cardSt(STRENGTHS.length + 3)} className="mt-4 text-[12px] text-white/45">
          오픈하면 가장 먼저 알려드릴게요 · 스팸 없어요
        </p>
      </div>
    </section>
  );
}
