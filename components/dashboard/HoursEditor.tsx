"use client";

import { useState, useEffect, useRef } from "react";
import { DAY_KEYS, DAY_LABELS, type DayKey, type WeeklyHours } from "@/lib/blogProfile";

// 요일별 영업시간 입력. 각 요일 = 영업/휴무 토글 + 시간, 점심시간은 옵션(켜면 영업일 전체 적용),
// "평일 일괄 적용"으로 월~금 한 번에. 변경 시 WeeklyHours를 onChange로 올려보낸다.

type DayState = { status: "unset" | "open" | "closed"; start: string; end: string };

function fromValue(v: WeeklyHours): Record<DayKey, DayState> {
  const out = {} as Record<DayKey, DayState>;
  for (const d of DAY_KEYS) {
    const x = v[d];
    if (x?.closed) out[d] = { status: "closed", start: "09:00", end: "18:00" };
    else if (x?.open && x?.close) out[d] = { status: "open", start: x.open, end: x.close };
    else out[d] = { status: "unset", start: "09:00", end: "18:00" };
  }
  return out;
}
function firstBreak(v: WeeklyHours): { s: string; e: string } | null {
  for (const d of DAY_KEYS) {
    const x = v[d];
    if (x?.breakStart && x?.breakEnd) return { s: x.breakStart, e: x.breakEnd };
  }
  return null;
}

export default function HoursEditor({ value, onChange }: { value: WeeklyHours; onChange: (v: WeeklyHours) => void }) {
  // 마운트 시 1회 초기화(이후는 내부 상태가 진실), 변경분만 상위로 전달
  const [days, setDays] = useState<Record<DayKey, DayState>>(() => fromValue(value));
  const initBreak = firstBreak(value);
  const [breakOn, setBreakOn] = useState(!!initBreak);
  const [brStart, setBrStart] = useState(initBreak?.s ?? "13:00");
  const [brEnd, setBrEnd] = useState(initBreak?.e ?? "14:00");
  const [wkStart, setWkStart] = useState("09:00");
  const [wkEnd, setWkEnd] = useState("18:00");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const out: WeeklyHours = {};
    for (const d of DAY_KEYS) {
      const s = days[d];
      if (s.status === "closed") out[d] = { closed: true };
      else if (s.status === "open" && s.start && s.end) {
        out[d] = { open: s.start, close: s.end, ...(breakOn && brStart && brEnd ? { breakStart: brStart, breakEnd: brEnd } : {}) };
      }
    }
    onChangeRef.current(out);
  }, [days, breakOn, brStart, brEnd]);

  function setDay(d: DayKey, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));
  }
  function applyWeekdays() {
    setDays((prev) => {
      const next = { ...prev };
      (["mon", "tue", "wed", "thu", "fri"] as DayKey[]).forEach((d) => { next[d] = { status: "open", start: wkStart, end: wkEnd }; });
      return next;
    });
  }

  const timeCls = "rounded-lg border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-[#3f91ff]";

  return (
    <div className="mt-4 space-y-3">
      {/* 평일 일괄 적용 */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
        <span className="text-xs font-medium text-neutral-500">평일 일괄</span>
        <input type="time" value={wkStart} onChange={(e) => setWkStart(e.target.value)} className={timeCls} />
        <span className="text-neutral-400">~</span>
        <input type="time" value={wkEnd} onChange={(e) => setWkEnd(e.target.value)} className={timeCls} />
        <button type="button" onClick={applyWeekdays} className="ml-auto rounded-lg bg-[#3f91ff] px-3 py-1.5 text-xs font-medium text-white transition active:scale-95">월~금 적용</button>
      </div>

      {/* 요일별 */}
      <div className="space-y-1.5">
        {DAY_KEYS.map((d) => {
          const s = days[d];
          return (
            <div key={d} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-sm font-semibold text-neutral-700">{DAY_LABELS[d]}</span>
              <button type="button" onClick={() => setDay(d, { status: "open" })} className={`rounded-md px-2 py-1 text-xs font-medium transition ${s.status === "open" ? "bg-[#3f91ff] text-white" : "border border-neutral-200 text-neutral-500"}`}>영업</button>
              <button type="button" onClick={() => setDay(d, { status: "closed" })} className={`rounded-md px-2 py-1 text-xs font-medium transition ${s.status === "closed" ? "bg-neutral-700 text-white" : "border border-neutral-200 text-neutral-500"}`}>휴무</button>
              {s.status === "open" ? (
                <span className="flex items-center gap-1.5">
                  <input type="time" value={s.start} onChange={(e) => setDay(d, { start: e.target.value })} className={timeCls} />
                  <span className="text-neutral-400">~</span>
                  <input type="time" value={s.end} onChange={(e) => setDay(d, { end: e.target.value })} className={timeCls} />
                </span>
              ) : s.status === "closed" ? (
                <span className="text-xs text-neutral-400">휴무</span>
              ) : (
                <span className="text-xs text-neutral-300">미설정</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 점심시간(옵션) */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" checked={breakOn} onChange={(e) => setBreakOn(e.target.checked)} className="h-4 w-4 accent-[#3f91ff]" />
          점심시간
        </label>
        {breakOn && (
          <span className="flex items-center gap-1.5">
            <input type="time" value={brStart} onChange={(e) => setBrStart(e.target.value)} className={timeCls} />
            <span className="text-neutral-400">~</span>
            <input type="time" value={brEnd} onChange={(e) => setBrEnd(e.target.value)} className={timeCls} />
            <span className="text-xs text-neutral-400">영업일 전체 적용</span>
          </span>
        )}
      </div>
    </div>
  );
}
