"use client";

import { useEffect, useState } from "react";

// ★성과 기록 시트(FF_PERF_LOOP §1-3·1-4) — 붙여넣기 임포트 + 이긴/진 패턴.
//  토스식: 한 화면 하나, 큰 버튼, 친절한 에러. 이모지·보장 표현 금지.
interface SummaryRow { label: string; sample: number; rate: number; mature: boolean }
interface Summary { enabled: boolean; winners: SummaryRow[]; losers: SummaryRow[]; watching: SummaryRow[]; minSample: number; revenue30: number; inflow30: number }

// ★글감 적중률(2026-08-05 유저 요청) — "우리가 낸 글감이 실제 유입 검색어에 있었나".
//  ★북극성은 적중률이 아니라 커버리지다: 조금 내고 다 맞히면 적중률은 100%지만 아무것도 못 덮은 것이다.
interface SourceStat { source: string; served: number; hit: number; rate: number; inflow: number; avgLead: number }
interface Hitrate {
  ready: boolean; reason?: string; howto?: string; days: number;
  servedCount?: number; inflowCount?: number; hitCount?: number; coverage?: number;
  sources?: SourceStat[]; missed?: { date: string; keyword: string; inflow: number }[];
  hits?: { keyword: string; inflow_keyword: string; inflow: number; lead_days: number; seed_source: string | null }[];
}
const SOURCE_KO: Record<string, string> = {
  gov: "정책브리핑", calendar: "확정 일정", dart: "DART 공시", community: "커뮤니티",
  rising: "실시간 급상승", news: "네이버 뉴스", discover: "자동완성", applyhome: "청약홈",
  gov24: "보조금24", bizinfo: "기업마당", season: "시즌", homebet: "홈피드 배팅", pool: "검색풀", 미상: "미상",
};

export default function PerfImportSheet({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<"inflow" | "revenue">("inflow");
  const [text, setText] = useState("");
  const [date, setDate] = useState(() => new Date(Date.now() + 9 * 3600_000 - 86400_000).toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [hr, setHr] = useState<Hitrate | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/perf-summary").then((r) => r.json()).then((d) => { if (d?.enabled) setSummary(d as Summary); }).catch(() => null);
    fetch("/api/hitrate?days=7").then((r) => r.json()).then((d) => setHr(d as Hitrate)).catch(() => null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ★스크린샷 읽기(2026-08-05 유저: "이미지 넣고 싶은데 못 넣게 되어 있는데?").
  //  ★읽은 결과를 바로 저장하지 않는다 — 아래 입력칸에 채워 넣고, 유저가 눈으로 보고 고친 뒤 저장한다.
  //   이건 적중률의 재료다. 잘못 읽은 값이 그대로 들어가면 지표가 조용히 거짓말을 한다.
  async function readImage(file: File) {
    if (!file.type.startsWith("image/") || ocrBusy) return;
    setOcrBusy(true); setErr(null); setMsg(null); setOcrNote(null);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = () => rej(new Error("read"));
        fr.readAsDataURL(file);
      });
      const r = await fetch("/api/perf-import/ocr", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, mime: file.type }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "이미지를 읽지 못했어요."); return; }
      const rows = (d.rows ?? []) as { keyword: string; inflow: number }[];
      if (!rows.length) { setErr(d.note || "표를 못 찾았어요. 유입 검색어 표가 보이게 잘라서 올려주세요."); return; }
      setKind("inflow");
      setText(rows.map((x) => `${x.keyword}\t${x.inflow}`).join("\n"));
      setOcrNote(`${rows.length}줄을 읽었어요. 맞는지 보고 고친 다음 기록하기를 눌러주세요.`);
    } catch { setErr("이미지를 읽지 못했어요. 표를 붙여넣는 방법도 그대로 쓸 수 있어요."); }
    setOcrBusy(false);
  }

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
        fetch("/api/hitrate?days=7").then((r) => r.json()).then((d) => setHr(d as Hitrate)).catch(() => null);
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
        {/* ★이미지로 넣기 — 크리에이터 어드바이저 표는 드래그 복사가 잘 안 된다(특히 모바일).
            매일 넣어야 하는 자료라 입력이 번거로우면 안 넣게 되고, 안 넣으면 적중률이 영원히 안 나온다. */}
        {kind === "inflow" && (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void readImage(f); }}
            className="at-press mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#1D75F7]/35 bg-[#1D75F7]/[0.04] px-3 py-3 text-[12.5px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/[0.08]">
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void readImage(f); e.currentTarget.value = ""; }} />
            {ocrBusy ? <><span className="tk-wand" aria-hidden>✦</span>이미지 읽는 중…</> : <>스크린샷으로 넣기 — 찍어서 올리거나 여기에 끌어다 놓으세요</>}
          </label>
        )}
        {ocrNote && <p className="mt-1.5 text-[11.5px] font-semibold text-[#1D75F7]">{ocrNote}</p>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
          onPaste={(e) => { const f = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"))?.getAsFile(); if (f) { e.preventDefault(); void readImage(f); } }} placeholder={kind === "inflow" ? "예)\n재산세 납부 방법  120\n전세계약주의사항  85" : "예)\n2026-07-10  1,234\n2026-07-09  980"}
          className="mt-2 w-full rounded-[12px] bg-neutral-50 px-4 py-3 text-[13px] font-medium outline-none ring-1 ring-black/[0.05] placeholder:text-neutral-300 focus:ring-2 focus:ring-[#1D75F7]/30" />
        <button onClick={submit} disabled={!text.trim() || busy} className="at-press tk-grad-cta mt-3 w-full rounded-[12px] py-3.5 text-[15px] font-bold text-white disabled:opacity-50">
          {busy ? "기록하는 중" : "기록하기"}
        </button>
        {msg && <p className="mt-2 text-[12.5px] font-semibold text-emerald-600">{msg}</p>}
        {err && <p className="mt-2 text-[12.5px] font-medium text-amber-600">{err}</p>}

        {/* ★글감 적중률 — 이 화면의 존재 이유다. 원천을 다섯 개 붙였는데 어느 게 일하는지 증거가 없었다. */}
        {hr && (
          <div className="mt-5 border-t border-black/[0.06] pt-4">
            <p className="text-[13.5px] font-bold text-neutral-800">글감 적중률 <span className="text-[11.5px] font-semibold text-neutral-400">최근 {hr.days}일</span></p>
            {!hr.ready ? (
              // ★재료가 없으면 0%라고 쓰지 않는다 — 0과 '아직 못 잼'은 다른 말이다
              <div className="mt-2 rounded-[12px] bg-neutral-50 p-3">
                <p className="text-[12.5px] font-bold text-neutral-600">{hr.reason}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-neutral-400">{hr.howto}</p>
              </div>
            ) : (
              <>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([["커버리지", `${hr.coverage}%`, "실제 유입 검색어 중 우리가 미리 낸 비율"],
                     ["적중", `${hr.hitCount}건`, "유입 검색어와 맞은 글감 수"],
                     ["낸 글감", `${hr.servedCount}개`, "같은 기간에 보드에 올린 글감"]] as const).map(([k, v, t]) => (
                    <div key={k} className="rounded-[12px] bg-neutral-50 p-2.5 text-center" title={t}>
                      <p className="text-[10.5px] font-bold text-neutral-400">{k}</p>
                      <p className="mt-0.5 text-[16px] font-extrabold tabular-nums text-[#1D75F7]">{v}</p>
                    </div>
                  ))}
                </div>
                {!!hr.sources?.length && (
                  <div className="mt-3">
                    <p className="text-[12px] font-bold text-neutral-600">원천별 성적</p>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {hr.sources.filter((s) => s.served > 0).map((s) => (
                        <div key={s.source} className="flex items-center gap-2 rounded-[10px] bg-neutral-50 px-2.5 py-1.5">
                          <span className="w-[74px] shrink-0 truncate text-[11.5px] font-bold text-neutral-600">{SOURCE_KO[s.source] ?? s.source}</span>
                          <span className="flex-1 text-[11px] tabular-nums text-neutral-400">{s.hit}/{s.served}</span>
                          {s.hit > 0 && s.avgLead > 0 && <span className="text-[10.5px] font-semibold text-emerald-600">{s.avgLead}일 먼저</span>}
                          <span className={`text-[12px] font-extrabold tabular-nums ${s.rate >= 20 ? "text-emerald-600" : s.rate > 0 ? "text-[#1D75F7]" : "text-neutral-300"}`}>{s.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* ★놓친 것이 더 중요하다 — 여기가 다음에 붙일 원천을 알려준다 */}
                {!!hr.missed?.length && (
                  <div className="mt-3">
                    <p className="text-[12px] font-bold text-amber-600">놓친 유입 검색어 <span className="font-semibold text-neutral-400">— 여기가 다음에 메울 자리예요</span></p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {hr.missed.slice(0, 14).map((m) => (
                        <span key={`${m.date}${m.keyword}`} className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">{m.keyword}<span className="ml-1 tabular-nums opacity-60">{m.inflow}</span></span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
