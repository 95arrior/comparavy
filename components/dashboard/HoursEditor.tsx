"use client";

import { useState, useEffect, useRef } from "react";
import { DAY_KEYS, DAY_LABELS, type DayKey, type WeeklyHours } from "@/lib/blogProfile";

// 영업시간 입력 — "유형 먼저 → 맞는 것만". 출력은 WeeklyHours(기존 호환).
//   시·분 커스텀 드롭다운(항상 아래로 펼침, 분 5분 단위), 쉬는 날 칩, 점심 옵션.

type Mode = "" | "daily" | "weekday" | "custom" | "247";
const WEEKDAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
const WEEKEND: DayKey[] = ["sat", "sun"];

const MINS = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

// 커스텀 드롭다운 — 항상 '아래로'(top-full) 펼침. 바깥 클릭 시 닫힘.
function Picker({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm text-neutral-800 transition hover:border-neutral-300">
        {label}<span className="text-[10px] text-neutral-400">▾</span>
      </button>
      {open && (
        <ul className="ateflo-reveal absolute left-0 top-full z-30 mt-1 max-h-52 w-full min-w-[88px] overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
          {options.map((o) => (
            <li key={o.value}>
              <button type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                className={`block w-full px-3 py-2 text-left text-sm transition ${o.value === value ? "bg-[#1D75F7]/10 font-semibold text-[#1D75F7]" : "text-neutral-700 hover:bg-neutral-50"}`}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 오전/오후 토글 + 시(1~12) + 분. value="HH:MM".
function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void; end?: boolean }) {
  const [hs, ms] = (value || "09:00").split(":");
  const h = Number(hs), m = Number(ms);
  const isPM = h >= 12;
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  const setPM = (pm: boolean) => { const base = h % 12; onChange(`${String(pm ? base + 12 : base).padStart(2, "0")}:${ms}`); };
  const setH12 = (hh: number) => { const base = hh % 12; onChange(`${String(isPM ? base + 12 : base).padStart(2, "0")}:${ms}`); };
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex overflow-hidden rounded-lg border border-neutral-200 text-sm">
        <button type="button" onClick={() => setPM(false)} className={`px-2 py-2 transition ${!isPM ? "bg-[#1D75F7]/10 font-semibold text-[#1D75F7]" : "text-neutral-500 hover:bg-neutral-50"}`}>오전</button>
        <button type="button" onClick={() => setPM(true)} className={`px-2 py-2 transition ${isPM ? "bg-[#1D75F7]/10 font-semibold text-[#1D75F7]" : "text-neutral-500 hover:bg-neutral-50"}`}>오후</button>
      </div>
      <Picker label={`${h12}시`} value={String(h12)} options={Array.from({ length: 12 }, (_, i) => i + 1).map((x) => ({ value: String(x), label: `${x}시` }))} onChange={(v) => setH12(Number(v))} />
      <Picker label={`${m}분`} value={String(m)} options={MINS.map((x) => ({ value: String(x), label: `${String(x).padStart(2, "0")}분` }))} onChange={(v) => onChange(`${hs}:${String(Number(v)).padStart(2, "0")}`)} />
    </div>
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
    `rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-[#1D75F7] bg-[#1D75F7]/10 font-semibold text-[#1D75F7]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`;

  return (
    <div>
      <p className="text-sm font-medium text-neutral-700">영업시간이 어떻게 되세요?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.v} type="button" onClick={() => setMode(m.v)} className={chip(mode === m.v)}>{m.label}</button>
        ))}
      </div>

      {mode === "daily" && (
        <div className="mt-4 space-y-3 ateflo-reveal">
          <div className="flex flex-wrap items-center gap-2">
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
        <div className="mt-4 space-y-3 ateflo-reveal">
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
              <button type="button" onClick={() => setWeClosed((v) => !v)} className={chip(weClosed)}>{weClosed ? "✓ 휴무" : "휴무"}</button>
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
        <div className="mt-4 space-y-2 ateflo-reveal">
          {DAY_KEYS.map((d) => (
            <div key={d} className="flex flex-wrap items-center gap-2">
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
          <button type="button" onClick={() => setBreakOn((v) => !v)} className={`text-sm font-medium ${breakOn ? "text-[#1D75F7]" : "text-neutral-500"}`}>
            {breakOn ? "✓ 점심시간 있어요" : "＋ 점심시간 있어요"}
          </button>
          {breakOn && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
