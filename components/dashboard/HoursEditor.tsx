"use client";

import { useState, useEffect, useRef } from "react";
import { DAY_KEYS, DAY_LABELS, type DayKey, type WeeklyHours } from "@/lib/blogProfile";

// 영업시간 입력 — "유형 먼저 → 맞는 것만". 출력은 WeeklyHours(기존 호환).
//   매일같음 / 평일·주말 / 요일마다 / 24시간. 시간은 드롭다운(30분, 오전·오후), 쉬는 날은 칩, 점심 옵션.

type Mode = "" | "daily" | "weekday" | "custom" | "247";
const WEEKDAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
const WEEKEND: DayKey[] = ["sat", "sun"];

// 30분 단위 시간 목록
const TIMES: string[] = [];
for (let h = 0; h < 24; h++) for (const m of [0, 30]) TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
const END_TIMES = [...TIMES, "24:00"];

function timeLabel(t: string): string {
  if (t === "24:00") return "자정(24:00)";
  const [h, m] = t.split(":").map(Number);
  const ap = h < 12 ? "오전" : "오후";
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${ap} ${hh}:${String(m).padStart(2, "0")}`;
}

const selCls = "rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#3f91ff]";
function TimeSelect({ value, onChange, end }: { value: string; onChange: (v: string) => void; end?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selCls}>
      {(end ? END_TIMES : TIMES).map((t) => <option key={t} value={t}>{timeLabel(t)}</option>)}
    </select>
  );
}

const MODES: { v: Mode; label: string }[] = [
  { v: "daily", label: "매일 같아요" },
  { v: "weekday", label: "평일·주말 달라요" },
  { v: "custom", label: "요일마다 달라요" },
  { v: "247", label: "24시간" },
];

// 기존 값에서 모드 추정(편집 진입용)
function inferMode(v: WeeklyHours): Mode {
  const set = DAY_KEYS.filter((d) => v[d]);
  if (set.length === 0) return "";
  if (DAY_KEYS.every((d) => v[d]?.open === "00:00" && v[d]?.close === "24:00")) return "247";
  return "custom"; // 안전하게 요일별로 펼쳐 세부 보존
}

export default function HoursEditor({ value, onChange }: { value: WeeklyHours; onChange: (v: WeeklyHours) => void }) {
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;

  const [mode, setMode] = useState<Mode>(() => inferMode(value));
  const [dStart, setDStart] = useState("09:00");
  const [dEnd, setDEnd] = useState("18:00");
  const [closed, setClosed] = useState<Set<DayKey>>(() => new Set(DAY_KEYS.filter((d) => value[d]?.closed)));
  const [wdStart, setWdStart] = useState("09:00");
  const [wdEnd, setWdEnd] = useState("18:00");
  const [weStart, setWeStart] = useState("10:00");
  const [weEnd, setWeEnd] = useState("15:00");
  const [weClosed, setWeClosed] = useState(false);
  const [cust, setCust] = useState<Record<DayKey, { open: boolean; start: string; end: string }>>(() => {
    const o = {} as Record<DayKey, { open: boolean; start: string; end: string }>;
    for (const d of DAY_KEYS) {
      const x = value[d];
      o[d] = x?.open && x?.close ? { open: true, start: x.open, end: x.close } : { open: false, start: "09:00", end: "18:00" };
    }
    return o;
  });
  const initBreak = DAY_KEYS.map((d) => value[d]).find((x) => x?.breakStart && x?.breakEnd);
  const [breakOn, setBreakOn] = useState(!!initBreak);
  const [brStart, setBrStart] = useState(initBreak?.breakStart ?? "12:00");
  const [brEnd, setBrEnd] = useState(initBreak?.breakEnd ?? "13:00");

  useEffect(() => {
    const br = breakOn ? { breakStart: brStart, breakEnd: brEnd } : {};
    const out: WeeklyHours = {};
    if (mode === "daily") {
      for (const d of DAY_KEYS) out[d] = closed.has(d) ? { closed: true } : { open: dStart, close: dEnd, ...br };
    } else if (mode === "weekday") {
      for (const d of WEEKDAYS) out[d] = { open: wdStart, close: wdEnd, ...br };
      for (const d of WEEKEND) out[d] = weClosed ? { closed: true } : { open: weStart, close: weEnd, ...br };
    } else if (mode === "custom") {
      for (const d of DAY_KEYS) out[d] = cust[d].open ? { open: cust[d].start, close: cust[d].end, ...br } : { closed: true };
    } else if (mode === "247") {
      for (const d of DAY_KEYS) out[d] = { open: "00:00", close: "24:00" };
    }
    onChangeRef.current(out);
  }, [mode, dStart, dEnd, closed, wdStart, wdEnd, weStart, weEnd, weClosed, cust, breakOn, brStart, brEnd]);

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-[#3f91ff] bg-[#3f91ff]/10 font-semibold text-[#3f91ff]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`;

  return (
    <div>
      <p className="text-sm font-medium text-neutral-700">영업시간이 어떻게 되세요?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.v} type="button" onClick={() => setMode(m.v)} className={chip(mode === m.v)}>{m.label}</button>
        ))}
      </div>

      {mode === "daily" && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <TimeSelect value={dStart} onChange={setDStart} />
            <span className="text-sm text-neutral-400">~</span>
            <TimeSelect value={dEnd} onChange={setDEnd} end />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-neutral-500">쉬는 날 (눌러서 선택)</p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_KEYS.map((d) => (
                <button key={d} type="button" onClick={() => setClosed((p) => { const n = new Set(p); if (n.has(d)) n.delete(d); else n.add(d); return n; })} className={chip(closed.has(d))}>{DAY_LABELS[d]}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "weekday" && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1.5 text-xs text-neutral-500">평일 (월~금)</p>
            <div className="flex items-center gap-2">
              <TimeSelect value={wdStart} onChange={setWdStart} />
              <span className="text-sm text-neutral-400">~</span>
              <TimeSelect value={wdEnd} onChange={setWdEnd} end />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <p className="text-xs text-neutral-500">주말 (토·일)</p>
              <button type="button" onClick={() => setWeClosed((v) => !v)} className={`text-xs font-medium ${weClosed ? "text-[#3f91ff]" : "text-neutral-400"}`}>{weClosed ? "✓ 휴무" : "휴무로"}</button>
            </div>
            {!weClosed && (
              <div className="flex items-center gap-2">
                <TimeSelect value={weStart} onChange={setWeStart} />
                <span className="text-sm text-neutral-400">~</span>
                <TimeSelect value={weEnd} onChange={setWeEnd} end />
              </div>
            )}
          </div>
        </div>
      )}

      {mode === "custom" && (
        <div className="mt-4 space-y-2">
          {DAY_KEYS.map((d) => (
            <div key={d} className="flex items-center gap-2">
              <span className="w-5 text-sm font-medium text-neutral-700">{DAY_LABELS[d]}</span>
              <button type="button" onClick={() => setCust((p) => ({ ...p, [d]: { ...p[d], open: !p[d].open } }))} className={chip(cust[d].open)}>{cust[d].open ? "영업" : "휴무"}</button>
              {cust[d].open && (
                <>
                  <TimeSelect value={cust[d].start} onChange={(v) => setCust((p) => ({ ...p, [d]: { ...p[d], start: v } }))} />
                  <span className="text-sm text-neutral-400">~</span>
                  <TimeSelect value={cust[d].end} onChange={(v) => setCust((p) => ({ ...p, [d]: { ...p[d], end: v } }))} end />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {mode === "247" && <p className="mt-4 text-sm text-neutral-500">연중 24시간으로 표시돼요.</p>}

      {mode !== "" && mode !== "247" && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <button type="button" onClick={() => setBreakOn((v) => !v)} className={`text-sm font-medium ${breakOn ? "text-[#3f91ff]" : "text-neutral-500"}`}>
            {breakOn ? "✓ 점심시간 있어요" : "＋ 점심시간 있어요"}
          </button>
          {breakOn && (
            <div className="mt-2 flex items-center gap-2">
              <TimeSelect value={brStart} onChange={setBrStart} />
              <span className="text-sm text-neutral-400">~</span>
              <TimeSelect value={brEnd} onChange={setBrEnd} end />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
