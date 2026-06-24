"use client";

import { EMOTION, filledStars, type Comp } from "@/lib/topicScore";

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
  onDismiss,
  dismissing,
  region,
  blogTotal,
}: {
  title: string;
  tag?: string | null;
  vol: number;
  comp: Comp;
  blogTotal?: number | null;
  idx?: number;
  revealed?: boolean;
  onClick?: () => void;
  cta?: string;
  onDismiss?: () => void; // '이 글감 별로예요' → 이 카드만 교체
  dismissing?: boolean;
  region?: boolean; // 우리 동네 키워드(검색량 없음) — 칩·메트릭을 지역형으로
}) {
  const filled = filledStars(vol, comp, blogTotal);
  const isSak = filled >= 4; // 싹(특별 강조)은 별점과 일치 — 진짜 고선점(4~5개)만
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
      {onDismiss && (
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          disabled={dismissing}
          aria-label="이 글감 교체"
          title="다른 글감으로 교체"
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-[#1D75F7]/10 hover:text-[#1D75F7] active:scale-90 disabled:opacity-60"
        >
          {dismissing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-[#1D75F7]" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" /><path d="m18 2 4 4-4 4" /><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" /><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" /><path d="m18 14 4 4-4 4" /></svg>
          )}
        </button>
      )}
      <div className="relative">
        <div className="mb-1.5 flex items-center gap-1.5">
          {region ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold leading-none text-teal-600 sm:text-[11px]"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>우리 동네</span>
          ) : (
            <>
              {tag && <span className="inline-flex items-center rounded-full bg-[#E8F1FE] px-2 py-1 text-[10px] font-bold leading-none text-[#1D75F7] sm:text-[11px]">{tag}</span>}
              {isSak && (
                <span className="relative inline-flex items-center gap-1 overflow-hidden rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold leading-none text-white sm:text-[11px]">
                  <span className="ateflo-chip-aurora pointer-events-none absolute inset-0" />
                  <svg viewBox="0 0 24 24" fill="currentColor" className="relative h-3 w-3 shrink-0"><path d="M12 2l2.2 6.3a2 2 0 0 0 1.3 1.3L22 12l-6.5 2.2a2 2 0 0 0-1.3 1.3L12 22l-2.2-6.3a2 2 0 0 0-1.3-1.3L2 12l6.5-2.2a2 2 0 0 0 1.3-1.3z" /></svg>
                  <span className="relative">싹 키워드</span>
                </span>
              )}
            </>
          )}
        </div>
        <p className="text-[15px] font-bold leading-snug text-neutral-900 sm:text-[18px]">{title}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] sm:text-[13px]">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-neutral-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0 opacity-70"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
월 검색 {vol.toLocaleString()}회
            </span>
            <span className="text-neutral-300">·</span>
            <span className={`truncate font-semibold ${isSak ? "text-violet-700" : "text-neutral-400"}`}>{EMOTION[comp]}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="font-medium text-neutral-400">선점</span>
            <span className="inline-flex font-bold tracking-[-1px]">
              {Array.from({ length: 5 }).map((_, i) => {
                const on = i < filled;
                return (
                  <span
                    key={i}
                    className={`inline-block ${on ? "text-amber-500" : "text-amber-500/25"}`}
                    style={{
                      animation: revealed ? `ateflo-star-pop 0.42s cubic-bezier(0.34,1.56,0.64,1) ${idx * 90 + 160 + i * 80}ms both` : undefined,
                      opacity: revealed ? undefined : 0,
                    }}
                  >
                    {on ? "★" : "☆"}
                  </span>
                );
              })}
            </span>
          </span>
        </div>
        {cta && (
          <p className={`mt-3 text-[12px] font-bold sm:text-[13px] ${isSak ? "text-violet-700" : "text-[#1D75F7]"}`}>
            {cta}
          </p>
        )}
      </div>
    </div>
  );
}
