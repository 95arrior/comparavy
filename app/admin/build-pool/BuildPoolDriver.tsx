"use client";

import { useMemo, useRef, useState } from "react";

type Status = "pending" | "running" | "done" | "error";
interface Row {
  vertical: string;
  sub: string;
  status: Status;
  inserted?: number;
  found?: number; // 시드 발굴 합계(perSeed.found)
  durationMs?: number;
  error?: string;
}

const STATUS_DOT: Record<Status, string> = {
  pending: "bg-gray-300",
  running: "bg-blue-500 animate-pulse",
  done: "bg-green-500",
  error: "bg-red-500",
};

export default function BuildPoolDriver({ subsByVertical }: { subsByVertical: Record<string, string[]> }) {
  const verticals = useMemo(() => Object.keys(subsByVertical), [subsByVertical]);
  const [target, setTarget] = useState<string>(verticals[0] ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);

  const total = rows.length;
  const finished = rows.filter((r) => r.status === "done" || r.status === "error").length;
  const okCount = rows.filter((r) => r.status === "done").length;
  const failCount = rows.filter((r) => r.status === "error").length;
  const totalInserted = rows.reduce((n, r) => n + (r.inserted ?? 0), 0);
  const pct = total ? Math.round((finished / total) * 100) : 0;

  function buildList(t: string): { vertical: string; sub: string }[] {
    const vs = t === "all" ? verticals : [t];
    return vs.flatMap((v) => (subsByVertical[v] ?? []).map((sub) => ({ vertical: v, sub })));
  }

  // 단일 sub 호출(기존 per-sub 라우트 그대로). 세션 쿠키로 관리자 인증 자동.
  async function runOne(vertical: string, sub: string): Promise<Partial<Row>> {
    try {
      const res = await fetch(
        `/api/admin/build-pool?vertical=${encodeURIComponent(vertical)}&sub=${encodeURIComponent(sub)}`,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { status: "error", error: json.error ?? `HTTP ${res.status}` };
      const found = Array.isArray(json.perSeed)
        ? json.perSeed.reduce((n: number, p: { found?: number }) => n + (p.found ?? 0), 0)
        : undefined;
      return { status: "done", inserted: json.inserted, found, durationMs: json.durationMs };
    } catch (e) {
      return { status: "error", error: e instanceof Error ? e.message : "네트워크 오류" };
    }
  }

  async function start() {
    const list = buildList(target);
    if (list.length === 0) return;
    stopRef.current = false;
    setRunning(true);
    setRows(list.map((x) => ({ ...x, status: "pending" as Status })));

    for (let i = 0; i < list.length; i++) {
      if (stopRef.current) break;
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "running" } : r)));
      const upd = await runOne(list[i].vertical, list[i].sub);
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...upd } : r)));
    }
    setRunning(false);
  }

  function stop() {
    stopRef.current = true;
  }

  async function retry(index: number) {
    const row = rows[index];
    if (!row) return;
    setRows((prev) => prev.map((r, idx) => (idx === index ? { ...r, status: "running", error: undefined } : r)));
    const upd = await runOne(row.vertical, row.sub);
    setRows((prev) => prev.map((r, idx) => (idx === index ? { ...r, ...upd } : r)));
  }

  async function retryFailed() {
    const targets = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.status === "error");
    stopRef.current = false;
    setRunning(true);
    for (const { i } of targets) {
      if (stopRef.current) break;
      await retry(i);
    }
    setRunning(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-xl font-bold text-gray-900">키워드 풀 적재</h1>
      <p className="mt-1 text-sm text-gray-500">
        업종을 고르고 시작하면 세부(sub)를 하나씩 순차 적재합니다. 탭을 닫지 마세요.
      </p>

      {/* 업종 선택 */}
      <div className="mt-6 flex flex-wrap gap-2">
        {verticals.map((v) => (
          <button
            key={v}
            type="button"
            disabled={running}
            onClick={() => setTarget(v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              target === v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } disabled:opacity-50`}
          >
            {v} <span className="opacity-70">({subsByVertical[v]?.length ?? 0})</span>
          </button>
        ))}
        <button
          type="button"
          disabled={running}
          onClick={() => setTarget("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            target === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          } disabled:opacity-50`}
        >
          전체 ({verticals.reduce((n, v) => n + (subsByVertical[v]?.length ?? 0), 0)})
        </button>
      </div>

      {/* 실행 버튼 */}
      <div className="mt-4 flex items-center gap-2">
        {!running ? (
          <button
            type="button"
            onClick={start}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {target === "all" ? "전체" : target} 적재 시작
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            중지
          </button>
        )}
        {!running && failCount > 0 && (
          <button
            type="button"
            onClick={retryFailed}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            실패 {failCount}개 재시도
          </button>
        )}
      </div>

      {/* 진행 상황 — 항상 영역 고정(레이아웃 시프트 방지) */}
      <div className="mt-6 min-h-[2.5rem]">
        {total > 0 && (
          <>
            <div className="flex justify-between text-xs text-gray-600">
              <span>
                {finished}/{total} 완료 · 적재 {totalInserted.toLocaleString()}건
                {failCount > 0 && <span className="text-red-600"> · 실패 {failCount}</span>}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>

      {/* sub별 결과 */}
      {total > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">세부</th>
                <th className="px-3 py-2 font-medium">발굴</th>
                <th className="px-3 py-2 font-medium">적재</th>
                <th className="px-3 py-2 font-medium">시간</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={`${r.vertical}-${r.sub}`} className={r.status === "error" ? "bg-red-50" : ""}>
                  <td className="px-3 py-2">
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${STATUS_DOT[r.status]}`} />
                    <span className="text-gray-400">{r.vertical}</span> · <span className="text-gray-900">{r.sub}</span>
                    {r.error && <div className="mt-0.5 text-xs text-red-600">{r.error}</div>}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-gray-600">{r.found ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums font-medium text-gray-900">{r.inserted ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-400">
                    {r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)}s` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.status === "error" && !running && (
                      <button
                        type="button"
                        onClick={() => retry(i)}
                        className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        재시도
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && finished === total && !running && (
        <p className="mt-4 text-sm font-medium text-green-700">
          완료 · 성공 {okCount} / 실패 {failCount} · 총 {totalInserted.toLocaleString()}건 적재
        </p>
      )}
    </div>
  );
}
