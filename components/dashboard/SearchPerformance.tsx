"use client";

import { useEffect, useState, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// 5-3: 연구소 홈 최상단 검색 성과. /api/searchconsole(연결상태) + /api/searchconsole/performance(데이터)를 소비.
// 미연결/무데이터는 graceful. 노출수 우상향 Area 강조 + 핵심 숫자 카드.

interface Status { connected: boolean; selectedSite: string | null }
interface Point { date: string; clicks: number; impressions: number; ctr: number; position: number }
interface Perf { totals: { clicks: number; impressions: number; ctr: number; position: number }; series: Point[] }

const PERIODS = [
  { label: "28일", days: 28 },
  { label: "90일", days: 90 },
  { label: "1년", days: 365 },
];
const ACCENT = "#3f91ff";

function fmtDate(v: string): string {
  const [, m, d] = String(v).split("-");
  return m && d ? `${Number(m)}/${Number(d)}` : v;
}

function PerfTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: Point }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-neutral-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-neutral-700">{fmtDate(label ?? d.date)}</p>
      <p className="mt-1 text-neutral-500">노출 <b className="text-neutral-900">{d.impressions.toLocaleString("ko-KR")}</b></p>
      <p className="text-neutral-500">클릭 <b className="text-neutral-900">{d.clicks.toLocaleString("ko-KR")}</b></p>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tracking-tight text-neutral-900">{value}</p>
      {sub && <p className="text-[10px] text-neutral-400">{sub}</p>}
    </div>
  );
}

export default function SearchPerformance({ onGoConnect }: { onGoConnect?: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [perf, setPerf] = useState<Perf | null>(null);
  const [days, setDays] = useState(90);
  const [perfLoading, setPerfLoading] = useState(false);
  const granularity = days === 28 ? "date" : "week";

  const loadPerf = useCallback(async (d: number) => {
    setPerfLoading(true);
    try {
      const gran = d === 28 ? "date" : "week";
      const r = await fetch(`/api/searchconsole/performance?days=${d}&granularity=${gran}`);
      if (!r.ok) { setPerf(null); return; }
      setPerf(await r.json());
    } catch {
      setPerf(null);
    } finally {
      setPerfLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/searchconsole");
        if (!r.ok) { setStatus({ connected: false, selectedSite: null }); return; }
        const s: Status = await r.json();
        setStatus(s);
        if (s.connected && s.selectedSite) loadPerf(90);
      } catch {
        setStatus({ connected: false, selectedSite: null });
      }
    })();
  }, [loadPerf]);

  function changeDays(d: number) {
    setDays(d);
    loadPerf(d);
  }

  // 상태 로딩 전엔 자리만 비워둠(레이아웃 흔들림 방지)
  if (!status) return null;

  // ── graceful: 미연결 / 사이트 미선택 ──
  if (!status.connected || !status.selectedSite) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold tracking-tight text-neutral-900">검색 성과</p>
        <p className="mt-1.5 text-sm text-neutral-500">
          {status.connected
            ? "서치콘솔에서 분석할 사이트를 선택하면 성과가 여기 표시돼요."
            : "구글 서치콘솔을 연결하면 검색 노출·클릭이 여기 매일 보여요."}
        </p>
        {onGoConnect && (
          <button
            onClick={onGoConnect}
            className="mt-3 rounded-xl bg-[#3f91ff] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 active:scale-95"
          >
            워드프레스 탭에서 연결하기 →
          </button>
        )}
      </div>
    );
  }

  const t = perf?.totals;
  const hasData = perf && perf.series.length > 0 && (t?.impressions ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-tight text-neutral-900">검색 성과</p>
          <p className="text-[11px] text-neutral-400">{status.selectedSite}</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => changeDays(p.days)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${days === p.days ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!perf ? (
        <p className="mt-6 text-center text-sm text-neutral-400">{perfLoading ? "성과를 불러오는 중…" : "성과를 불러오지 못했어요."}</p>
      ) : !hasData ? (
        <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-neutral-700">데이터가 쌓이는 중이에요</p>
          <p className="mt-1 text-xs text-neutral-400">서치콘솔은 보통 2~3일 지연돼요. 글이 검색에 잡히면 여기 노출이 올라가요.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Card label="노출수" value={t!.impressions.toLocaleString("ko-KR")} />
            <Card label="클릭수" value={t!.clicks.toLocaleString("ko-KR")} />
            <Card label="평균 순위" value={`${t!.position.toFixed(1)}위`} sub="낮을수록 좋아요" />
            <Card label="클릭률" value={`${(t!.ctr * 100).toFixed(1)}%`} />
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-medium text-neutral-400">노출수 추이 {granularity === "week" ? "(주별)" : "(일별)"}</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perf.series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={fmtDate} minTickGap={20} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, "dataMax"]} />
                  <Tooltip content={<PerfTooltip />} />
                  <Area type="monotone" dataKey="impressions" stroke={ACCENT} strokeWidth={2.4} fill="url(#impGrad)" dot={false} isAnimationActive />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
