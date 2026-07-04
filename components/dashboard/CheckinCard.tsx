"use client";

import { useEffect, useState } from "react";
import { yesterdayPublished, type CourseArticleLite } from "@/lib/course";

// ★아침 체크인 — 1일 1회, 30초 동선(숫자 키패드·어제와 같음·건너뛰기). 입력 즉시 스파크바가 자란다.
//  수익 칸은 애드포스트 승인 후에만(승인 상태는 Stage 4의 승인 결과 입력이 세팅 — ateflo_adpost_approved).
//  이모지·보장 표현 금지. 놓친 날은 그래프에 공백(정직).

interface Row { day: string; visitors: number | null; revenue: number | null }

export default function CheckinCard({ articles, onSaved }: { articles: CourseArticleLite[]; onSaved?: () => void }) {
  const [state, setState] = useState<"loading" | "form" | "done" | "hidden">("loading");
  const [rows, setRows] = useState<Row[]>([]);
  const [prev, setPrev] = useState<Row | null>(null);
  const [visitors, setVisitors] = useState("");
  const [revenue, setRevenue] = useState("");
  const [busy, setBusy] = useState(false);
  const [firstRevenue, setFirstRevenue] = useState(false);
  const approved = typeof window !== "undefined" && (() => { try { return localStorage.getItem("ateflo_adpost_approved") === "1"; } catch { return false; } })();
  const skipKey = `ateflo_checkin_skip_${new Date().toISOString().slice(0, 10)}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (localStorage.getItem(skipKey) === "1") { setState("hidden"); return; }
        const res = await fetch("/api/checkin");
        const d = await res.json();
        if (!alive) return;
        setRows(Array.isArray(d.rows) ? d.rows : []);
        setPrev(d.prev ?? null);
        setState(d.doneToday ? "hidden" : "form");
      } catch { if (alive) setState("hidden"); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(v: string, r: string) {
    if (busy) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      if (v.trim() !== "") payload.visitors = Number(v);
      if (approved && r.trim() !== "") payload.revenue = Number(r);
      if (Object.keys(payload).length === 0) { setBusy(false); return; }
      const res = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) { setBusy(false); return; }
      const newRow: Row = { day: d.day, visitors: d.visitors, revenue: d.revenue };
      setRows((prevRows) => [...prevRows.filter((x) => x.day !== d.day), newRow]);
      // 첫 수익 1회성 카드
      if ((d.revenue ?? 0) > 0) {
        try { if (localStorage.getItem("ateflo_first_revenue") !== "1") { localStorage.setItem("ateflo_first_revenue", "1"); setFirstRevenue(true); } } catch { /* ignore */ }
      }
      setState("done");
      onSaved?.();
      setTimeout(() => setState("hidden"), firstRevenue ? 4200 : 1600); // 그래프 자라는 걸 보여준 뒤 오늘 할 일로
    } finally { setBusy(false); }
  }

  if (state === "loading" || state === "hidden") return null;
  const yPub = yesterdayPublished(articles);
  const last7 = (() => {
    const map = new Map(rows.map((r) => [r.day, r] as const));
    const out: { key: string; v: number | null }[] = [];
    for (let i = 7; i >= 1; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; out.push({ key: k, v: map.get(k)?.visitors ?? null }); }
    return out;
  })();
  const maxV = Math.max(1, ...last7.map((x) => x.v ?? 0));

  return (
    <div className="at-rise mt-3 rounded-2xl bg-white p-5 ring-1 ring-black/[0.04]">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold tracking-tight text-[#1D75F7]">아침 체크인</p>
        <span className="text-[11px] font-semibold text-neutral-400">{yPub ? "어제 발행 확인됨" : "어제 발행 기록 없음"}</span>
      </div>

      {/* 스파크바 — 최근 7일 방문자. 놓친 날은 공백. 저장 직후 새 칸이 자란다(transition). */}
      <div className="mt-3 flex h-10 items-end gap-1.5" aria-hidden>
        {last7.map((b) => (
          <div key={b.key} className="flex-1 rounded-t bg-[#1D75F7]/70 transition-all duration-500" style={{ height: b.v === null ? 2 : Math.max(4, (b.v / maxV) * 40), opacity: b.v === null ? 0.15 : 1 }} />
        ))}
      </div>

      {state === "done" ? (
        <div className="mt-3">
          <p className="text-[14px] font-bold text-neutral-900">기록했어요.</p>
          {firstRevenue && (
            <div className="mt-2 rounded-xl bg-[#1D75F7]/[0.06] px-4 py-3">
              <p className="text-[14px] font-bold text-[#1D75F7]">첫 수익이에요. 여기서부터 시작입니다.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            <label className="flex-1">
              <span className="text-[11.5px] font-semibold text-neutral-400">어제 방문자</span>
              <input inputMode="numeric" pattern="[0-9]*" value={visitors} onChange={(e) => setVisitors(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
                className="mt-1 w-full rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[15px] font-bold text-neutral-900 outline-none ring-1 ring-black/[0.05] focus:ring-[#1D75F7]/40" />
            </label>
            {approved && (
              <label className="flex-1">
                <span className="text-[11.5px] font-semibold text-neutral-400">어제 수익(원)</span>
                <input inputMode="numeric" pattern="[0-9]*" value={revenue} onChange={(e) => setRevenue(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
                  className="mt-1 w-full rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[15px] font-bold text-neutral-900 outline-none ring-1 ring-black/[0.05] focus:ring-[#1D75F7]/40" />
              </label>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={() => save(visitors, revenue)} disabled={busy || (visitors.trim() === "" && (!approved || revenue.trim() === ""))}
              className="at-press flex-1 rounded-xl bg-[#1D75F7] py-2.5 text-[13.5px] font-bold text-white transition hover:opacity-90 disabled:opacity-50">
              {busy ? "저장 중" : "기록하기"}
            </button>
            {prev && (prev.visitors !== null || prev.revenue !== null) && (
              <button onClick={() => save(String(prev.visitors ?? ""), String(prev.revenue ?? ""))} disabled={busy}
                className="at-press rounded-xl bg-neutral-100 px-3.5 py-2.5 text-[12.5px] font-bold text-neutral-600 transition hover:bg-neutral-200 disabled:opacity-50">
                어제와 같음
              </button>
            )}
            <button onClick={() => { try { localStorage.setItem(skipKey, "1"); } catch { /* ignore */ } setState("hidden"); }}
              className="at-press rounded-xl px-2.5 py-2.5 text-[12.5px] font-medium text-neutral-400 transition hover:text-neutral-600">건너뛰기</button>
          </div>
        </>
      )}
    </div>
  );
}
