"use client";

import { useEffect, useState } from "react";
import { yesterdayPublished, type CourseArticleLite } from "@/lib/course";

// ★아침 체크인 — 1일 1회, 30초 동선(숫자 키패드·어제와 같음·건너뛰기). 입력 즉시 스파크바가 자란다.
//  수익 칸은 애드포스트 승인 후에만(승인 상태는 Stage 4의 승인 결과 입력이 세팅 — ateflo_adpost_approved).
//  이모지·보장 표현 금지. 놓친 날은 그래프에 공백(정직).

interface Row { day: string; visitors: number | null; revenue: number | null }

export default function CheckinCard({ articles, onSaved }: { articles: CourseArticleLite[]; onSaved?: () => void }) {
  const [state, setState] = useState<"loading" | "form" | "done" | "skipped" | "recorded">("loading");
  const [savedRow, setSavedRow] = useState<Row | null>(null); // 오늘 기록값(요약·수정용)
  const [rows, setRows] = useState<Row[]>([]);
  const [prev, setPrev] = useState<Row | null>(null);
  const [visitors, setVisitors] = useState("");
  const [revenue, setRevenue] = useState("");
  const [busy, setBusy] = useState(false);
  const [firstRevenue, setFirstRevenue] = useState(false);
  const [spikeAsk, setSpikeAsk] = useState(false); // ★급등 감지 — "어제 어떤 글이 잘 됐어요?" 후속 질문
  const approved = typeof window !== "undefined" && (() => { try { return localStorage.getItem("ateflo_adpost_approved") === "1"; } catch { return false; } })();
  const skipKey = `ateflo_checkin_skip_${new Date().toISOString().slice(0, 10)}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/checkin");
        const d = await res.json();
        if (!alive) return;
        const rs: Row[] = Array.isArray(d.rows) ? d.rows : [];
        setRows(rs);
        setPrev(d.prev ?? null);
        const yRow = rs.find((r) => r.day === d.yesterdayKey) ?? null;
        if (yRow) { setSavedRow(yRow); setState("recorded"); return; }           // 이미 기록 → 한 줄 요약(수정 가능)
        if (localStorage.getItem(skipKey) === "1") { setState("skipped"); return; } // 건너뜀 → 한 줄(다시 열기 가능, 내일 자동 재등장)
        setState("form");
      } catch { if (alive) setState("recorded"), setSavedRow(null); }
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
      if (d.spike === true) setSpikeAsk(true); // 증폭 신호원(유저 입력 기반)
      const newRow: Row = { day: d.day, visitors: d.visitors, revenue: d.revenue };
      setRows((prevRows) => [...prevRows.filter((x) => x.day !== d.day), newRow]);
      // 첫 수익 1회성 카드
      if ((d.revenue ?? 0) > 0) {
        try { if (localStorage.getItem("ateflo_first_revenue") !== "1") { localStorage.setItem("ateflo_first_revenue", "1"); setFirstRevenue(true); } } catch { /* ignore */ }
      }
      setSavedRow(newRow);
      setState("done");
      onSaved?.();
      if (d.spike !== true) setTimeout(() => setState("recorded"), firstRevenue ? 4200 : 1600); // 급등 질문 중엔 유지 // 그래프 성장 보여준 뒤 한 줄 요약으로(수정 가능)
    } finally { setBusy(false); }
  }

  if (state === "loading") return null;
  if (state === "recorded" && savedRow === null) return null; // 로드 실패 — 다음 진입에 재시도
  // 건너뜀 — 실수 복구: 탭하면 즉시 폼 복귀. 내일이 되면(skipKey 날짜 변경) 자동으로 폼 재등장.
  if (state === "skipped") {
    return (
      <button onClick={() => { try { localStorage.removeItem(skipKey); } catch { /* ignore */ } setState("form"); }}
        className="at-rise flex w-full items-center justify-between rounded-2xl bg-white px-5 py-3 text-left ring-1 ring-black/[0.04] transition hover:bg-neutral-50">
        <span className="text-[12.5px] font-medium text-neutral-400">오늘 체크인은 건너뛰었어요</span>
        <span className="text-[12.5px] font-bold text-[#1D75F7]">다시 열기</span>
      </button>
    );
  }
  // 기록 완료 — 한 줄 요약 + 수정(오입력 복구). upsert라 다시 저장하면 덮어쓴다.
  if (state === "recorded" && savedRow) {
    return (
      <button onClick={() => { setVisitors(savedRow.visitors !== null ? String(savedRow.visitors) : ""); setRevenue(savedRow.revenue !== null ? String(savedRow.revenue) : ""); setState("form"); }}
        className="at-rise flex w-full items-center justify-between rounded-2xl bg-white px-5 py-3 text-left ring-1 ring-black/[0.04] transition hover:bg-neutral-50">
        <span className="text-[12.5px] font-medium text-neutral-500">어제 기록 · 방문자 {savedRow.visitors ?? 0}명{savedRow.revenue !== null ? ` · ${savedRow.revenue.toLocaleString("ko-KR")}원` : ""}</span>
        <span className="text-[12.5px] font-bold text-[#1D75F7]">수정</span>
      </button>
    );
  }
  const yPub = yesterdayPublished(articles);
  const last7 = (() => {
    const map = new Map(rows.map((r) => [r.day, r] as const));
    const out: { key: string; v: number | null }[] = [];
    for (let i = 7; i >= 1; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; out.push({ key: k, v: map.get(k)?.visitors ?? null }); }
    return out;
  })();
  const maxV = Math.max(1, ...last7.map((x) => x.v ?? 0));

  return (
    <div className="at-rise rounded-2xl bg-white p-5 ring-1 ring-black/[0.04]">
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
          {spikeAsk && (() => {
            const recent = articles.filter((a) => ["verified", "published", "pending_verify"].includes(a.status) && new Date(a.created_at).getTime() >= Date.now() - 7 * 86400000).slice(0, 5) as unknown as { id: string; title: string }[];
            if (recent.length === 0) return null;
            return (
              <div className="mt-3 rounded-xl bg-[#1D75F7]/[0.06] p-3.5">
                <p className="text-[13px] font-bold text-[#1D75F7]">방문자가 확 뛰었어요. 어제 어떤 글이 잘 됐어요?</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">네이버 크리에이터 어드바이저의 유입 분석에서 글별 방문을 확인할 수 있어요.</p>
                <div className="mt-2 space-y-1.5">
                  {recent.map((a) => (
                    <button key={a.id} onClick={async () => {
                      await fetch(`/api/articles/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hot: true }) });
                      setSpikeAsk(false);
                    }} className="at-press w-full rounded-lg bg-white px-3 py-2 text-left text-[12.5px] font-semibold text-neutral-700 ring-1 ring-black/[0.05] transition hover:bg-neutral-50">{a.title}</button>
                  ))}
                </div>
                <button onClick={() => setSpikeAsk(false)} className="mt-1.5 w-full py-1 text-center text-[11.5px] text-neutral-400">모르겠어요 · 건너뛰기</button>
              </div>
            );
          })()}
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
            <button onClick={() => { try { localStorage.setItem(skipKey, "1"); } catch { /* ignore */ } setState("skipped"); }}
              className="at-press rounded-xl px-2.5 py-2.5 text-[12.5px] font-medium text-neutral-400 transition hover:text-neutral-600">건너뛰기</button>
          </div>
        </>
      )}
    </div>
  );
}
