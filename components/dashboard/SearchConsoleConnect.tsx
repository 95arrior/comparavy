"use client";

import { useEffect, useState } from "react";

interface GscSite { siteUrl: string; permissionLevel: string }
interface Status { connected: boolean; googleEmail: string | null; selectedSite: string | null; permissionLevel: string | null }

// 5-1: 구글 서치콘솔 연결 + 사이트 선택(저장)까지. 데이터 표시는 5-2/5-3.
// 워드프레스 패널 안 섹션으로 렌더된다(자체 상태/요청, 기존 WP 로직과 분리).
export default function SearchConsoleConnect() {
  const [status, setStatus] = useState<Status | null>(null);
  const [sites, setSites] = useState<GscSite[] | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const r = await fetch("/api/searchconsole");
      if (!r.ok) { setStatus({ connected: false, googleEmail: null, selectedSite: null, permissionLevel: null }); return; }
      const d: Status = await r.json();
      setStatus(d);
      setSelected(d.selectedSite ?? "");
      if (d.connected) loadSites();
    } catch {
      setStatus({ connected: false, googleEmail: null, selectedSite: null, permissionLevel: null });
    }
  }

  async function loadSites() {
    try {
      const r = await fetch("/api/searchconsole/sites");
      const d = await r.json();
      if (r.ok) setSites(Array.isArray(d.sites) ? d.sites : []);
      else setErr(d.error ?? "사이트 목록을 불러오지 못했어요.");
    } catch {
      setErr("사이트 목록을 불러오지 못했어요.");
    }
  }

  useEffect(() => {
    loadStatus();
    // 콜백 복귀 안내(?gsc=...)
    const p = new URLSearchParams(window.location.search).get("gsc");
    if (p === "connected") setMsg("구글 서치콘솔을 연결했어요. 아래에서 사이트를 선택해 주세요.");
    else if (p === "denied") setErr("연결을 취소했어요.");
    else if (p === "state_error" || p === "token_error" || p === "save_error") setErr("연결 중 문제가 생겼어요. 다시 시도해 주세요.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSite() {
    if (!selected || busy) return;
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await fetch("/api/searchconsole", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteUrl: selected }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "저장하지 못했어요."); return; }
      setStatus((s) => (s ? { ...s, selectedSite: d.selectedSite, permissionLevel: d.permissionLevel } : s));
      setMsg("이 사이트의 검색 성과를 가져올 준비가 됐어요.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (busy) return;
    setBusy(true); setErr(null); setMsg(null);
    try {
      await fetch("/api/searchconsole", { method: "DELETE" });
      setStatus({ connected: false, googleEmail: null, selectedSite: null, permissionLevel: null });
      setSites(null); setSelected("");
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null; // 상태 로딩 전엔 표시 안 함

  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/[0.04] p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1D75F7]/10 text-[#1D75F7]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-3.5-3.5" /></svg>
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">구글 서치콘솔 연결</h2>
          <p className="text-xs text-neutral-500">검색 노출·클릭 데이터를 가져오려면 내 블로그의 서치콘솔을 연결하세요.</p>
        </div>
      </div>

      {msg && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{msg}</p>}
      {err && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">{err}</p>}

      {!status.connected ? (
        <a
          href="/api/searchconsole/connect"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1D75F7] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-95"
        >
          구글 계정으로 연결하기
        </a>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            연결됨{status.googleEmail ? ` · ${status.googleEmail}` : ""}
          </p>

          <div>
            <label className="block text-sm font-medium text-neutral-700">내 블로그 사이트 선택</label>
            <p className="mt-0.5 text-xs text-neutral-500">서치콘솔에 등록된 속성 중 이 블로그를 골라 주세요.</p>
            {sites === null ? (
              <p className="mt-3 text-sm text-neutral-400">사이트 목록을 불러오는 중…</p>
            ) : sites.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">서치콘솔에 등록·확인된 사이트가 없어요. 먼저 서치콘솔에서 사이트 소유권을 확인해 주세요.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1D75F7] focus:ring-2 focus:ring-[#1D75F7]/20"
                >
                  <option value="">사이트를 선택하세요</option>
                  {sites.map((s) => (
                    <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
                  ))}
                </select>
                <button
                  onClick={saveSite}
                  disabled={!selected || busy || selected === status.selectedSite}
                  className="shrink-0 rounded-xl bg-[#1D75F7] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  {selected === status.selectedSite ? "저장됨" : busy ? "저장 중…" : "저장"}
                </button>
              </div>
            )}
            {status.selectedSite && (
              <p className="mt-2 text-xs text-neutral-400">선택된 사이트: <b className="text-neutral-600">{status.selectedSite}</b></p>
            )}
          </div>

          <button
            onClick={disconnect}
            disabled={busy}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium transition active:scale-95 hover:border-red-400 hover:text-red-600 disabled:opacity-40"
          >
            연결 해제
          </button>
        </div>
      )}
    </div>
  );
}
