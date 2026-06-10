"use client";

import { useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");

/** 우리 디자인의 날짜·시간 선택기. 값은 datetime-local 형식("YYYY-MM-DDTHH:mm"). */
export default function ScheduleCalendar({
  value,
  onChange,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  min: Date;
}) {
  const sel = value ? new Date(value) : null;
  const [view, setView] = useState<Date>(() => sel ?? new Date());

  const hour = sel ? sel.getHours() : 9;
  const minute = sel ? sel.getMinutes() : 0;

  function emit(d: Date, h: number, m: number) {
    const nd = new Date(d);
    nd.setHours(h, m, 0, 0);
    onChange(`${nd.getFullYear()}-${pad(nd.getMonth() + 1)}-${pad(nd.getDate())}T${pad(nd.getHours())}:${pad(nd.getMinutes())}`);
  }

  const y = view.getFullYear();
  const mo = view.getMonth();
  const startDow = new Date(y, mo, 1).getDay();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const minDay = new Date(min.getFullYear(), min.getMonth(), min.getDate());

  return (
    <div className="rounded-xl border border-neutral-200 p-3">
      {/* 월 이동 */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setView(new Date(y, mo - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <span className="text-sm font-semibold">{y}년 {mo + 1}월</span>
        <button type="button" onClick={() => setView(new Date(y, mo + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>

      {/* 요일 */}
      <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-medium text-neutral-400">
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>

      {/* 날짜 */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const cell = new Date(y, mo, d);
          const disabled = cell < minDay;
          const isSel = !!sel && sel.getFullYear() === y && sel.getMonth() === mo && sel.getDate() === d;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => emit(cell, hour, minute)}
              className={`flex h-8 items-center justify-center rounded-lg text-sm transition ${
                isSel ? "bg-neutral-900 font-semibold text-white" : disabled ? "cursor-not-allowed text-neutral-300" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* 시간 */}
      <div className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3">
        <span className="text-xs font-medium text-neutral-500">시간</span>
        <select
          value={hour}
          onChange={(e) => emit(sel ?? new Date(), Number(e.target.value), minute)}
          className="flex-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
        >
          {Array.from({ length: 24 }).map((_, h) => (
            <option key={h} value={h}>{h < 12 ? `오전 ${h === 0 ? 12 : h}시` : `오후 ${h === 12 ? 12 : h - 12}시`}</option>
          ))}
        </select>
        <select
          value={minute}
          onChange={(e) => emit(sel ?? new Date(), hour, Number(e.target.value))}
          className="flex-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
        >
          {[0, 10, 20, 30, 40, 50].map((m) => <option key={m} value={m}>{pad(m)}분</option>)}
        </select>
      </div>
    </div>
  );
}
