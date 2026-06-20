"use client";

import { useEffect, useRef, useState } from "react";
import Brand from "@/components/Brand";

// [차별화] "그냥 AI로 쓰면 되지 않나요?" — 경쟁사 실명 까기 X. AI도 잘하는 건 인정(정직),
// 우리가 '추가로' 챙기는 걸로 차별화. 하이라이트 컬럼 + 체크 팝 + 스태거로 임팩트.
const ROWS: { label: string; ai: boolean; us: true }[] = [
  { label: "글 초안 쓰기", ai: true, us: true },
  { label: "뭘 쓸지 — 검색되는 글감 추천", ai: false, us: true },
  { label: "SEO·AEO 구조 (제목·메타·FAQ·내부링크)", ai: false, us: true },
  { label: "의료·광고규정 가드 (과장·위법 차단)", ai: false, us: true },
  { label: "내 가게 자연 연계 (정보·지도)", ai: false, us: true },
  { label: "AI 말투 제거 + 워드프레스 바로 발행", ai: false, us: true },
];

function Check({ blue }: { blue?: boolean }) {
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${blue ? "bg-[#1D75F7] text-white shadow-[0_4px_12px_-3px_rgba(29,117,247,0.6)]" : "bg-neutral-200 text-white"}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
    </span>
  );
}
function Cross() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </span>
  );
}

export default function AiCompare() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(r);
    if (r) { setShown(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: "0px 0px -22% 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rowStyle = (i: number) =>
    reduce ? undefined : {
      transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
      transitionDelay: `${i * 85}ms`,
      opacity: shown ? 1 : 0,
      transform: shown ? "none" : "translateY(12px)",
    };
  const popStyle = (i: number) =>
    reduce ? undefined : {
      transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s",
      transitionDelay: `${i * 85 + 140}ms`,
      transform: shown ? "scale(1)" : "scale(0.4)",
      opacity: shown ? 1 : 0,
    };

  const cols = "grid grid-cols-[1fr_60px_84px] items-center gap-1 sm:grid-cols-[1fr_120px_150px] sm:gap-2";

  return (
    <section ref={ref} className="overflow-x-hidden bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="text-sm font-semibold tracking-tight text-[#1D75F7]">그냥 AI로 쓰면 되지 않나요?</p>
        <h2 className="font-pretendard mt-3 text-[clamp(24px,6.4vw,36px)] font-bold leading-[1.2] tracking-tight">
          답은 나와요.<br />근데 검색엔 안 걸려요.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base">
          그냥 AI는 ‘글’을 주고, 에이트플로는 ‘검색에 걸리는 완성된 글’을 줘요.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl px-5 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-[0_18px_44px_-26px_rgba(20,40,90,0.3)]">
          {/* 헤더 행 — 박스 안에 두어 컬럼 정렬 보장 */}
          <div className={`${cols} border-b border-neutral-100 px-3 py-2.5 sm:px-4`}>
            <div />
            <div className="text-center text-[12px] font-semibold text-neutral-400 sm:text-sm">그냥 AI</div>
            <div className="flex items-center justify-center rounded-lg bg-[#1D75F7] py-2 shadow-[0_6px_16px_-6px_rgba(29,117,247,0.7)]">
              <Brand light size={15} />
            </div>
          </div>
          {/* 데이터 행 */}
          {ROWS.map((r, i) => (
            <div key={r.label} style={rowStyle(i)} className={`${cols} border-b border-neutral-100 px-3 py-3.5 last:border-b-0 sm:px-4`}>
              <div className="pr-1 text-[12.5px] font-medium leading-snug text-neutral-700 sm:text-[15px]">{r.label}</div>
              <div className="flex justify-center">{r.ai ? <Check /> : <Cross />}</div>
              <div className="flex h-full items-center justify-center bg-[#1D75F7]/[0.05]">
                <span style={popStyle(i)}><Check blue /></span>
              </div>
            </div>
          ))}
        </div>

        {/* 마무리 한 방 */}
        <p className="mt-6 text-center text-[15px] leading-relaxed text-neutral-600 sm:text-base">
          그냥 AI는 <span className="font-semibold text-neutral-800">답</span>까지예요.<br className="sm:hidden" />
          복붙·수정·SEO·발행, 그 다음을 <span className="font-bold text-[#1D75F7]">전부</span> 에이트플로가 해요.
        </p>
      </div>
    </section>
  );
}
