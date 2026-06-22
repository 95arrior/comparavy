"use client";

import { EMOTION, starsFor, type Comp } from "@/lib/topicScore";

// 글감 박스 — 랜딩(Showcase)·앱(Home) 공용. 제목 + 한 달 검색 N회 + 선점 별점 + 감정 + 싹 비주얼.
// onClick 주면 카드 전체 클릭(앱: 글쓰기), cta 주면 우하단에 작은 안내(예: '이 글 쓰기 ›').
export default function TopicCard({
  title,
  tag,
  vol,
  comp,
  idx = 0,
  revealed = true,
  onClick,
  cta,
}: {
  title: string;
  tag?: string | null;
  vol: number;
  comp: Comp;
  idx?: number;
  revealed?: boolean;
  onClick?: () => void;
  cta?: string;
}) {
  const isSak = comp === "low";
  return (
    <div
      onClick={onClick}
      style={{
        transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.45,0.6,1)",
        transitionDelay: revealed ? `${idx * 90}ms` : "0ms",
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
      }}
      className={`relative overflow-hidden rounded-2xl px-5 py-4 ring-1 sm:px-6 sm:py-5 ${onClick ? "cursor-pointer active:scale-[0.99]" : ""} ${
        isSak ? "shadow-[0_7px_18px_-12px_rgba(139,92,246,0.3)] ring-violet-300/70" : "bg-white shadow-[0_10px_30px_-16px_rgba(20,40,90,0.4)] ring-black/[0.05]"
      }`}
    >
      {isSak && <div className="ateflo-chip-aurora pointer-events-none absolute inset-0 rounded-2xl" />}
      <div className="relative">
        <div className="mb-1.5 flex items-center gap-1.5">
          {tag && <span className="inline-flex items-center rounded-full bg-[#E8F1FE] px-2 py-0.5 text-[10px] font-bold leading-none text-[#1D75F7] sm:text-[11px]">{tag}</span>}
          {isSak && <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-600 px-2 py-0.5 text-[9.5px] font-bold leading-none text-white sm:text-[10.5px]">✦ 싹 키워드</span>}
        </div>
        <p className="text-[15px] font-bold leading-snug text-neutral-900 sm:text-[18px]">{title}</p>
        <div className="mt-1.5 space-y-1 text-[11px] sm:text-[13px]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-neutral-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0 opacity-70"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              한 달 검색 {vol.toLocaleString()}회
            </span>
            <span className="text-neutral-300">·</span>
            <span className="font-medium text-neutral-500">선점</span>
            <span className="font-bold tracking-[-1px] text-amber-500">{starsFor(vol, comp)}</span>
          </div>
          <p className={`font-semibold ${isSak ? "text-violet-700" : "text-neutral-400"}`}>{EMOTION[comp]}</p>
        </div>
        {cta && (
          <p className={`mt-3 inline-flex items-center gap-0.5 text-[12px] font-bold sm:text-[13px] ${isSak ? "text-violet-700" : "text-[#1D75F7]"}`}>
            {cta}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </p>
        )}
      </div>
    </div>
  );
}
