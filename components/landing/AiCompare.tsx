"use client";

import { useEffect, useRef, useState } from "react";
import Brand from "@/components/Brand";

// [차별화] "그냥 AI로 쓰면 되지 않나요?" — 경쟁사 실명 X. 두 카드 VS 대결로 대비를 세게.
// 그냥 AI=흐릿·부족(✗), 에이트플로=파랑·글로우·승리(✓). 카드 슬라이드 + 체크 팝.
const AI_ITEMS = ["뭘 쓸지 내가 고민", "SEO 구조 없음", "과장·규정 위험", "내 가게 연결 안 됨", "복붙·발행은 내 몫"];
const US_ITEMS = ["검색되는 글감 자동", "SEO·AEO 구조 자동", "광고규정 가드", "내 가게 연계·지도", "워드프레스 바로 발행"];

function Tick({ blue }: { blue?: boolean }) {
  return (
    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${blue ? "tk-grad-cta text-white shadow-[0_4px_10px_-2px_rgba(29,117,247,0.7)]" : "bg-neutral-200 text-white"}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
    </span>
  );
}
function Ex() {
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
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
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: "0px 0px -20% 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cardStyle = (dir: number) =>
    reduce ? undefined : {
      transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
      opacity: shown ? 1 : 0,
      transform: shown ? "none" : `translateX(${dir * 18}px)`,
    };
  const popStyle = (i: number) =>
    reduce ? undefined : {
      display: "inline-flex",
      transition: "transform 0.5s cubic-bezier(0.34,1.8,0.64,1), opacity 0.25s",
      transitionDelay: `${240 + i * 160}ms`,
      transform: shown ? "scale(1)" : "scale(0.2)",
      opacity: shown ? 1 : 0,
    };

  return (
    <section ref={ref} className="overflow-x-hidden bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="text-sm font-semibold tracking-tight text-[#1D75F7]">그냥 AI로 쓰면 되지 않나요?</p>
        <h2 className="font-pretendard mt-3 text-[clamp(25px,6.6vw,38px)] font-bold leading-[1.2] tracking-tight">
          답은 나와요.<br />근데 검색엔 안 걸려요.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base">
          그냥 AI는 ‘글’을 주고, 에이트플로는 ‘검색에 걸리는 완성된 글’을 줘요.
        </p>
      </div>

      <div className="relative mx-auto mt-11 grid max-w-2xl grid-cols-2 gap-3 px-5 sm:gap-6 sm:px-6">
        {/* 그냥 AI — 흐릿·부족 */}
        <div style={cardStyle(-1)} className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 sm:p-6">
          <p className="text-center text-[13px] font-bold text-neutral-400 sm:text-base">그냥 AI</p>
          <p className="mb-4 mt-1 text-center text-[11px] text-neutral-400 sm:text-xs">답만 주고 끝</p>
          <ul className="space-y-2.5">
            {AI_ITEMS.map((t) => (
              <li key={t} className="flex items-center gap-2 text-[12px] leading-snug text-neutral-400 sm:text-[13.5px]">
                <Ex /><span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 에이트플로 — 파랑·글로우·승리 */}
        <div style={cardStyle(1)} className="relative rounded-2xl border-2 border-[#1D75F7] bg-white p-4 shadow-[0_24px_55px_-22px_rgba(29,117,247,0.5)] sm:-mt-2 sm:p-6 sm:pb-7">
          {/* 상단 글로우 점 */}
          <div className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#1D75F7] to-transparent" />
          <div className="mb-1 flex items-center justify-center">
            <Brand size={17} />
          </div>
          <p className="mb-4 mt-1 text-center text-[11px] font-semibold text-[#1D75F7] sm:text-xs">검색에 걸리는 완성된 글</p>
          <ul className="space-y-2.5">
            {US_ITEMS.map((t, i) => (
              <li key={t} className="flex items-center gap-2 text-[12px] font-medium leading-snug text-neutral-800 sm:text-[13.5px]">
                <span className="relative" style={popStyle(i)}>
                  {!reduce && shown && (
                    <span className="absolute inset-0 rounded-full tk-grad-cta" style={{ animation: `ateflo-pop-ring 0.55s ease-out ${260 + i * 160}ms both` }} />
                  )}
                  <Tick blue />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 가운데 VS */}
        <span className="absolute left-1/2 top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-[11px] font-extrabold text-neutral-400 shadow-md sm:h-11 sm:w-11 sm:text-[13px]">
          VS
        </span>
      </div>

      <p className="mx-auto mt-9 max-w-md px-6 text-center text-[15px] leading-relaxed text-neutral-600 sm:text-base">
        그냥 AI는 <span className="font-semibold text-neutral-800">답</span>까지예요.<br className="sm:hidden" />
        그 다음을 <span className="font-bold text-[#1D75F7]">전부</span> 에이트플로가 해요.
      </p>
    </section>
  );
}
