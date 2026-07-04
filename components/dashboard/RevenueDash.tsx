"use client";

import { useEffect, useState } from "react";
import { totalRevenue, avgPerPost, monthPace, type CheckinRow } from "@/lib/checkin";

// ★수익 대시보드 v1 — 유저 입력 데이터만. 미입력 지표는 표시하지 않는다(추정 생성 금지).
//  빈 날은 공백(정직). 수익 데이터는 유저 소유 — 동의 없이 노출·활용하지 않는다.
export default function RevenueDash({ publishedCount }: { publishedCount: number }) {
  const [rows, setRows] = useState<CheckinRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/checkin").then((r) => r.json()).then((d) => { if (alive) setRows(Array.isArray(d.rows) ? d.rows : []); }).catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);
  if (!rows || rows.length === 0) return null; // 입력 전 — 아무것도 표시 안 함

  const total = totalRevenue(rows);
  const avg = avgPerPost(rows, publishedCount);
  const pace = monthPace(rows);
  const hasRevenue = rows.some((r) => (r.revenue ?? 0) > 0);
  const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

  // 최근 30일 이중 그래프 — 방문자(위) + 수익(아래), 빈 날 공백
  const days: { key: string; v: number | null; r: number | null }[] = [];
  const map = new Map(rows.map((x) => [x.day, x] as const));
  for (let i = 30; i >= 1; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; const row = map.get(k); days.push({ key: k, v: row?.visitors ?? null, r: row?.revenue ?? null }); }
  const maxV = Math.max(1, ...days.map((x) => x.v ?? 0));
  const maxR = Math.max(1, ...days.map((x) => x.r ?? 0));

  return (
    <div className="rounded-2xl at-glass p-5">
      <p className="text-[15px] font-bold text-neutral-900">수익 기록</p>
      <p className="mt-0.5 text-[11.5px] text-neutral-400">직접 입력한 데이터만 보여드려요.</p>
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
