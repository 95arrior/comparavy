"use client";

import type { Article } from "./types";

// 모멘텀 — "쌓고 싶게". 이번 주 목표(채우는 욕구) + 연속 + 총 + 잔디. 우리 핵심 가치=꾸준함.
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const WEEK_GOAL = 3;

export default function Momentum({ articles }: { articles: Article[] }) {
  const days = new Set<string>();
  for (const a of articles) if (a.created_at) days.add(dayKey(new Date(a.created_at)));
  const total = articles.length;
  const now = new Date();

  // 이번 주(월~) 편수
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekCount = articles.filter((a) => a.created_at && new Date(a.created_at) >= monday).length;
  const weekPct = Math.min(weekCount / WEEK_GOAL, 1) * 100;
  const weekDone = weekCount >= WEEK_GOAL;

  // 연속(오늘/어제부터 거슬러)
  let streak = 0;
  const cur = new Date(now);
  if (!days.has(dayKey(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(dayKey(cur))) { streak++; cur.setDate(cur.getDate() - 1); }

  // 잔디 — 최근 7주(49일), 일=행 / 주=열
  const cells: { key: string; active: boolean }[] = [];
  const start = new Date(now);
  start.setDate(start.getDate() - 48);
  for (let i = 0; i < 49; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = dayKey(d);
    cells.push({ key: k, active: days.has(k) });
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-400">이번 주 목표</p>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-500">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-1 4-1 6 0 1 .5 2 1.5 2.8C14 12 15 11 15 9c2 1.5 3 4 3 6a6 6 0 1 1-12 0c0-1.6.7-3 1.8-4C8 12 9 13 9 13c-.5-2 1-4 3-5 0-2-1-4 0-6z" /></svg>
            {streak}일 연속
          </span>
        )}
      </div>

      <p className="font-pretendard mt-1 text-[32px] font-bold leading-none tracking-tight text-neutral-900">
        {weekCount}
        <span className="ml-1 text-base font-semibold text-neutral-300">/ {WEEK_GOAL}편</span>
      </p>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full transition-all duration-500 ${weekDone ? "bg-emerald-500" : "bg-[#1D75F7]"}`} style={{ width: `${weekPct}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">
        {weekDone ? "이번 주 목표 달성! 계속 쌓아요" : `${WEEK_GOAL - weekCount}편 더 쓰면 이번 주 목표 달성`} · 총 {total}편
      </p>

      {/* 잔디 */}
      <div className="mt-4 flex justify-start gap-[3px]">
        <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
          {cells.map((c) => (
            <span key={c.key} className={`h-2.5 w-2.5 rounded-[2px] ${c.active ? "bg-[#1D75F7]" : "bg-neutral-100"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
