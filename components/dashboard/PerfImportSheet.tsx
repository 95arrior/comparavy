"use client";

import { useEffect, useState } from "react";

// ★성과 기록 시트(FF_PERF_LOOP §1-3·1-4) — 붙여넣기 임포트 + 이긴/진 패턴.
//  토스식: 한 화면 하나, 큰 버튼, 친절한 에러. 이모지·보장 표현 금지.
interface SummaryRow { label: string; sample: number; rate: number; mature: boolean }
interface Summary { enabled: boolean; winners: SummaryRow[]; losers: SummaryRow[]; watching: SummaryRow[]; minSample: number; revenue30: number; inflow30: number }

export default function PerfImportSheet({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<"inflow" | "revenue">("inflow");
  const [text, setText] = useState("");
  const [date, setDate] = useState(() => new Date(Date.now() + 9 * 3600_000 - 86400_000).toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/perf-summary").then((r) => r.json()).then((d) => { if (d?.enabled) setSummary(d as Summary); }).catch(() => null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await fetch("/api/perf-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, text, date }) });
      const d = await r.json();
      if (!r.ok) setErr(d.error ?? "가져오지 못했어요. 표를 그대로 붙여넣었는지 확인해 주세요.");
      else {
        setMsg(kind === "inflow" ? `유입 키워드 ${d.imported}개를 기록했어요${d.poolCandidates ? ` (새 글감 후보 ${d.poolCandidates}개 발견)` : ""}.` : `일별 수익 ${d.imported}건을 기록했어요.`);
        setText("");
      }
    } catch { setErr("네트워크 오류예요. 다시 시도해 주세요."); }
    setBusy(false);
  }

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="ateflo-sheet-up at-thin-scroll flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
        <p className="text-[17px] font-bold text-neutral-900">성과 기록</p>
        <p className="mt-1 text-[12.5px] text-neutral-400">기록이 쌓이면 글감 추천이 내 블로그에 맞게 똑똑해져요.</p>

        <div className="mt-4 flex gap-1.5">
          {([["inflow", "유입 키워드"], ["revenue", "일별 수익"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => { setKind(k); setErr(null); setMsg(null); }} className={`at-press flex-1 rounded-[10px] py-2 text-[12.5px] font-bold transition ${kind === k ? "bg-[#1D75F7]/[0.08] text-[#1D75F7] ring-1 ring-[#1D75F7]/40" : "bg-neutral-50 text-neutral-500"}`}>{label}</button>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-neutral-500">
          {kind === "inflow"
            ? "크리에이터 어드바이저 > 유입분석 > 검색 유입 키워드 표를 드래그해 복사한 뒤 그대로 붙여넣어 주세요."
            : "애드포스트 > 보고서의 일별 수익 표를 드래그해 복사한 뒤 그대로 붙여넣어 주세요."}
        </p>
        {kind === "inflow" && (
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-[10px] bg-neutral-50 px-3 py-2 text-[13px] font-semibold text-neutral-700 outline-none ring-1 ring-black/[0.05]" />
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={kind === "inflow" ? "예)\n재산세 납부 방법  120\n전세계약주의사항  85" : "예)\n2026-07-10  1,234\n2026-07-09  980"}
          className="mt-2 w-full rounded-[12px] bg-neutral-50 px-4 py-3 text-[13px] font-medium outline-none ring-1 ring-black/[0.05] placeholder:text-neutral-300 focus:ring-2 focus:ring-[#1D75F7]/30" />
        <button onClick={submit} disabled={!text.trim() || busy} className="at-press tk-grad-cta mt-3 w-full rounded-[12px] py-3.5 text-[15px] font-bold text-white disabled:opacity-50">
          {busy ? "기록하는 중" : "기록하기"}
        </button>
        {msg && <p className="mt-2 text-[12.5px] font-semibold text-emerald-600">{msg}</p>}
        {err && <p className="mt-2 text-[12.5px] font-medium text-amber-600">{err}</p>}

        {summary && (summary.winners.length + summary.losers.length + summary.watching.length > 0 || summary.inflow30 > 0) && (
          <div className="mt-5 border-t border-black/[0.06] pt-4">
            <p className="text-[13.5px] font-bold text-neutral-800">내 발행 패턴 성적표</p>
            <p className="mt-0.5 text-[11.5px] text-neutral-400">표본 {summary.minSample}건이 쌓인 패턴만 판정해요. 그 전까지는 지켜보는 중이에요.</p>
            {summary.winners.length > 0 && (
              <div className="mt-3">
                <p className="text-[12px] font-bold text-emerald-600">이기고 있는 패턴</p>
                {summary.winners.map((r) => <p key={r.label} className="mt-1 text-[12.5px] text-neutral-700">{r.label} — 상위노출 {r.rate}% (표본 {r.sample}건)</p>)}
              </div>
            )}
            {summary.losers.length > 0 && (
              <div className="mt-3">
                <p className="text-[12px] font-bold text-rose-500">밀리고 있는 패턴</p>
                {summary.losers.map((r) => <p key={r.label} className="mt-1 text-[12.5px] text-neutral-700">{r.label} — 상위노출 {r.rate}% (표본 {r.sample}건)</p>)}
              </div>
            )}
            {summary.watching.length > 0 && (
              <div className="mt-3">
                <p className="text-[12px] font-bold text-neutral-400">지켜보는 중</p>
                {summary.watching.map((r) => <p key={r.label} className="mt-1 text-[12.5px] text-neutral-500">{r.label} — 표본 {r.sample}건</p>)}
              </div>
            )}
            {summary.inflow30 > 0 && (
              <p className="mt-3 text-[12px] text-neutral-500">최근 30일 기록: 유입 {summary.inflow30.toLocaleString()}회{summary.revenue30 > 0 ? ` · 수익 ${Math.round(summary.revenue30).toLocaleString()}원` : ""}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
