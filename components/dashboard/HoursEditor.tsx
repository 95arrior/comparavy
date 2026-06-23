"use client";

import { useState, useEffect, useRef } from "react";
import { DAY_KEYS, DAY_LABELS, type DayKey, type WeeklyHours } from "@/lib/blogProfile";

// 영업시간 입력 — "유형 먼저 → 맞는 것만". 출력은 WeeklyHours(기존 호환).
//   시·분 커스텀 드롭다운(항상 아래로 펼침, 분 5분 단위), 쉬는 날 칩, 점심 옵션.

type Mode = "" | "daily" | "weekday" | "custom" | "247";
const WEEKDAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
const WEEKEND: DayKey[] = ["sat", "sun"];

const MINS = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

// 세로 룰렛(휠) 1개 — 스크롤 스냅, 중앙 선택.
function Wheel({ items, index, onIndex }: { items: string[]; index: number; onIndex: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const H = 40;
  useEffect(() => { if (ref.current) ref.current.scrollTop = index * H; /* 마운트 시 1회 */ }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScroll = () => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      const el = ref.current; if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / H)));
      el.scrollTo({ top: i * H, behavior: "smooth" });
      onIndex(i);
    }, 110);
  };
  return (
    <div ref={ref} onScroll={onScroll} className="no-scrollbar h-[160px] flex-1 snap-y snap-mandatory overflow-y-auto" style={{ paddingTop: 60, paddingBottom: 60 }}>
      {items.map((it, i) => (
        <div key={it} className={`flex h-10 snap-center items-center justify-center text-[17px] transition ${i === index ? "font-bold text-neutral-900" : "text-neutral-300"}`}>{it}</div>
      ))}
    </div>
  );
}

// 시간 휠 바텀시트 — 오전/오후 + 시(1~12) + 분.
function TimeWheelSheet({ value, onConfirm, onClose }: { value: string; onConfirm: (v: string) => void; onClose: () => void }) {
  const [hs, ms] = (value || "09:00").split(":");
  const h0 = Number(hs), m0 = Number(ms);
  const HOURS12 = Array.from({ length: 12 }, (_, i) => i + 1);
  const [pm, setPm] = useState(h0 >= 12);
  const initH = (() => { const x = h0 % 12; return x === 0 ? 12 : x; })();
  const [hi, setHi] = useState(Math.max(0, HOURS12.indexOf(initH)));
  const [mi, setMi] = useState(Math.max(0, MINS.indexOf(m0)));
  const confirm = () => {
    const base = HOURS12[hi] % 12;
    const hh = pm ? base + 12 : base;
    onConfirm(`${String(hh).padStart(2, "0")}:${String(MINS[mi]).padStart(2, "0")}`);
  };
  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[80] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="ateflo-sheet-up w-full max-w-md rounded-t-3xl bg-white" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <p className="px-5 pb-1 pt-4 text-[15px] font-bold text-neutral-900">⏰ 시간 선택</p>
        <div className="relative flex items-center px-6">
          {/* 중앙 하이라이트(은은) */}
          <div className="pointer-events-none absolute inset-x-4 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-[#1D75F7]/[0.06]" />
          <Wheel items={["오전", "오후"]} index={pm ? 1 : 0} onIndex={(i) => setPm(i === 1)} />
          <Wheel items={HOURS12.map((x) => String(x).padStart(2, "0"))} index={hi} onIndex={setHi} />
          <span className="px-0.5 text-[19px] font-bold text-neutral-900">:</span>
          <Wheel items={MINS.map((x) => String(x).padStart(2, "0"))} index={mi} onIndex={setMi} />
        </div>
        <div className="px-5 pt-1">
          <button type="button" onClick={confirm} className="w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99]">확인</button>
        </div>
      </div>
    </div>
  );
}

// 시간 버튼 → 탭하면 휠 시트(하단에서 올라옴).
function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void; end?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hs, ms] = (value || "09:00").split(":");
  const h = Number(hs);
  const ap = h < 12 ? "오전" : "오후";
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-300">
        {ap} {h12}:{ms}
      </button>
      {open && <TimeWheelSheet value={value} onConfirm={(v) => { onChange(v); setOpen(false); }} onClose={() => setOpen(false)} />}
    </>
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
