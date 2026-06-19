"use client";

import type { Article } from "./types";

// 모멘텀 — "쌓이는 게 보이게". 누적/연속 + 잔디(최근 5주). 꾸준함이 우리 핵심 가치.
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Momentum({ articles }: { articles: Article[] }) {
  const days = new Set<string>();
  for (const a of articles) {
    if (!a.created_at) continue;
    days.add(dayKey(new Date(a.created_at)));
  }
  const total = articles.length;
  const now = new Date();
  const monthCount = articles.filter((a) => {
    if (!a.created_at) return false;
    const d = new Date(a.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  // 연속(오늘 또는 어제부터 거슬러 올라가며)
  let streak = 0;
  const cur = new Date(now);
  if (!days.has(dayKey(cur))) cur.setDate(cur.getDate() - 1); // 오늘 안 썼으면 어제부터
  while (days.has(dayKey(cur))) { streak++; cur.setDate(cur.getDate() - 1); }

  // 잔디 — 최근 5주(35일), 일=행 / 주=열
  const cells: { key: string; active: boolean }[] = [];
  const start = new Date(now);
  start.setDate(start.getDate() - 34);
  for (let i = 0; i < 35; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = dayKey(d);
    cells.push({ key: k, active: days.has(k) });
  }
  const wroteToday = days.has(dayKey(now));

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-pretendard text-2xl font-bold tracking-tight text-neutral-900">
            {total}
            <span className="ml-1 text-sm font-medium text-neutral-400">편째 쌓는 중</span>
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {streak > 0 ? `${streak}일 연속 · ` : ""}이번 달 {monthCount}편
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${wroteToday ? "bg-emerald-50 text-emerald-600" : "bg-[#1D75F7]/10 text-[#1D75F7]"}`}>
          {wroteToday ? "오늘 완료" : "오늘 한 편 어때요?"}
        </span>
      </div>

      {/* 잔디 */}
      <div className="mt-4 grid grid-flow-col grid-rows-7 justify-start gap-1">
        {cells.map((c) => (
          <span key={c.key} className={`h-3 w-3 rounded-[3px] ${c.active ? "bg-[#1D75F7]" : "bg-neutral-100"}`} />
        ))}
      </div>
    </div>
  );
}
