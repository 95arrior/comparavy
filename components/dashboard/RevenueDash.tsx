"use client";

import { cachedGet, invalidateGet } from "@/lib/clientFetchCache";

import { useEffect, useState } from "react";
import { totalRevenue, avgPerPost, monthPace, type CheckinRow } from "@/lib/checkin";
import GrowthReport, { type GrowthArticleLite } from "./GrowthReport";

// ★수익 대시보드 v1 — 유저 입력 데이터만. 미입력 지표는 표시하지 않는다(추정 생성 금지).
//  빈 날은 공백(정직). 수익 데이터는 유저 소유 — 동의 없이 노출·활용하지 않는다.
export default function RevenueDash({ publishedCount, articles = [] }: { publishedCount: number; articles?: GrowthArticleLite[] }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [rows, setRows] = useState<CheckinRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    cachedGet<{ rows?: CheckinRow[] }>("/api/checkin").then((d) => { if (alive) setRows(Array.isArray(d.rows) ? d.rows : []); }).catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);
  if (!rows || rows.length === 0) return null; // 입력 전 — 아무것도 표시 안 함

  const map = new Map(rows.map((x) => [x.day, x] as const));
  const total = totalRevenue(rows);
  const avg = avgPerPost(rows, publishedCount);
  const pace = monthPace(rows);
  const hasRevenue = rows.some((r) => (r.revenue ?? 0) > 0);
  const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

  // 최근 30일 이중 그래프 — 방문자(위) + 수익(아래), 빈 날 공백
  const days: { key: string; v: number | null; r: number | null }[] = [];
  for (let i = 30; i >= 1; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; const row = map.get(k); days.push({ key: k, v: row?.visitors ?? null, r: row?.revenue ?? null }); }
  const maxV = Math.max(1, ...days.map((x) => x.v ?? 0));
  const maxR = Math.max(1, ...days.map((x) => x.r ?? 0));

  // ★성장 서사(실측: '이게 뭔가 싶다') — 이번 주 vs 지난주 큰 숫자 + 최고 기록. 승인 전에도 성장이 보이게.
  const sum = (from: number, to: number) => { let t = 0, has = false; for (let i = from; i >= to; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; const v = map.get(k)?.visitors; if (typeof v === "number") { t += v; has = true; } } return has ? t : null; };
  const thisWeek = sum(7, 1);
  const lastWeek = sum(14, 8);
  const growth = thisWeek !== null && lastWeek !== null && lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const best = rows.reduce((m, r) => Math.max(m, r.visitors ?? 0), 0);
  const cum = rows.reduce((t, r) => t + (r.visitors ?? 0), 0);

  return (
    <div className="rounded-2xl at-glass p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-bold text-neutral-900">성장 기록</p>
          <p className="mt-0.5 text-[11.5px] text-neutral-400">체크인에 기록한 데이터로 그려져요.</p>
        </div>
        <button onClick={() => setReportOpen(true)} className="at-press shrink-0 rounded-lg bg-[#1D75F7]/10 px-3 py-1.5 text-[12px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/15">진단 보기</button>
      </div>
      {reportOpen && <GrowthReport rows={rows} articles={articles} onClose={() => setReportOpen(false)} />}
      {thisWeek !== null && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="tk-grad-text text-[28px] font-extrabold leading-none tabular-nums">{thisWeek.toLocaleString("ko-KR")}</span>
          <span className="text-[13px] font-semibold text-neutral-500">이번 주 방문</span>
          {growth !== null && (
            <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums ${growth >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-400"}`}>
              {growth >= 0 ? `지난주보다 +${growth}%` : `지난주보다 ${growth}%`}
            </span>
          )}
        </div>
      )}
      <div className="mt-2 flex gap-3 text-[11.5px] text-neutral-400">
        {best > 0 && <span>최고 하루 <b className="tabular-nums text-neutral-600">{best.toLocaleString("ko-KR")}</b></span>}
        {cum > 0 && <span>누적 <b className="tabular-nums text-neutral-600">{cum.toLocaleString("ko-KR")}</b></span>}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {hasRevenue && (
          <div className="rounded-xl bg-white/70 p-3 ring-1 ring-black/[0.04]">
            <p className="text-[11px] font-semibold text-neutral-400">누적 수익</p>
            <p className="mt-0.5 text-[15px] font-extrabold text-neutral-900">{won(total)}</p>
          </div>
        )}
        {avg !== null && (
          <div className="rounded-xl bg-white/70 p-3 ring-1 ring-black/[0.04]">
            <p className="text-[11px] font-semibold text-neutral-400">글당 평균</p>
            <p className="mt-0.5 text-[15px] font-extrabold text-neutral-900">{won(avg)}</p>
          </div>
        )}
        {pace !== null && (
          <div className="rounded-xl bg-white/70 p-3 ring-1 ring-black/[0.04]">
            <p className="text-[11px] font-semibold text-neutral-400">이번 달 페이스</p>
            <p className="mt-0.5 text-[15px] font-extrabold text-neutral-900">약 {won(pace)}대</p>
          </div>
        )}
      </div>
      {pace !== null && <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">지금 페이스면 이달 약 {won(pace)}대예요 — 입력하신 데이터 기준이고 달라질 수 있어요.</p>}

      <div className="mt-4">
        <p className="text-[11px] font-semibold text-neutral-400">방문자 · 최근 30일</p>
        <div className="mt-1 flex h-9 items-end gap-[2px]" aria-hidden>
          {days.map((d) => <div key={d.key} className="flex-1 rounded-t bg-[#1D75F7]/70" style={{ height: d.v === null ? 2 : Math.max(3, (d.v / maxV) * 36), opacity: d.v === null ? 0.12 : 1 }} />)}
        </div>
        {hasRevenue && (
          <>
            <p className="mt-2 text-[11px] font-semibold text-neutral-400">수익 · 최근 30일</p>
            <div className="mt-1 flex h-9 items-end gap-[2px]" aria-hidden>
              {days.map((d) => <div key={d.key} className="flex-1 rounded-t bg-emerald-500/70" style={{ height: d.r === null ? 2 : Math.max(3, (d.r / maxR) * 36), opacity: d.r === null ? 0.12 : 1 }} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
