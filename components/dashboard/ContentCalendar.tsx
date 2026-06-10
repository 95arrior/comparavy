"use client";

import { useMemo, useState } from "react";
import type { Article } from "./types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * 콘텐츠 캘린더 — 예약(future)·발행(published) 글을 발행/예약 일시 기준으로 월 그리드에 표시.
 * 초안은 날짜가 없어 표시하지 않는다. 글 칩을 누르면 그 글을 연다.
 */
export default function ContentCalendar({
  articles,
  onOpen,
}: {
  articles: Article[];
  onOpen: (a: Article) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // 날짜별 글 매핑 (publish_at 우선, 없으면 발행글은 created_at 보조)
  const byDay = useMemo(() => {
    const map = new Map<string, Article[]>();
    for (const a of articles) {
      if (a.status === "draft") continue;
      const raw = a.publish_at ?? (a.status === "published" ? a.created_at : null);
      if (!raw) continue;
      const key = dayKey(new Date(raw));
      const arr = map.get(key);
      if (arr) arr.push(a);
      else map.set(key, [a]);
    }
    return map;
  }, [articles]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const scheduledCount = articles.filter((a) => a.status === "future").length;

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 sm:p-6">
      {/* 헤더 — 월 이동 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="이전 달"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <h3 className="min-w-[7rem] text-center text-base font-bold tracking-tight">{year}년 {month + 1}월</h3>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="다음 달"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
        <button
          onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-900"
        >
          오늘
        </button>
      </div>

      {/* 범례 */}
      <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3f91ff]" /> 예약됨 {scheduledCount > 0 && `(${scheduledCount})`}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> 발행됨</span>
      </div>

      {/* 요일 헤더 */}
      <div className="mt-4 grid grid-cols-7 gap-px">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`pb-2 text-center text-xs font-medium ${i === 0 ? "text-rose-400" : i === 6 ? "text-[#3f91ff]" : "text-neutral-400"}`}>
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-neutral-100">
        {cells.map((d, idx) => {
          if (d === null) return <div key={`e${idx}`} className="min-h-[5rem] bg-white sm:min-h-[6.5rem]" />;
          const items = byDay.get(`${year}-${month}-${d}`) ?? [];
          return (
            <div key={d} className="min-h-[5rem] bg-white p-1 sm:min-h-[6.5rem] sm:p-1.5">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday(d) ? "bg-neutral-900 font-bold text-white" : "text-neutral-500"}`}>
                {d}
              </div>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onOpen(a)}
                    title={a.title}
                    className={`block w-full truncate rounded px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition ${
                      a.status === "future"
                        ? "bg-[#3f91ff]/10 text-[#2f7fe6] hover:bg-[#3f91ff]/20"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {a.title}
                  </button>
                ))}
                {items.length > 3 && (
                  <p className="px-1.5 text-[10px] text-neutral-400">+{items.length - 3}개 더</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
