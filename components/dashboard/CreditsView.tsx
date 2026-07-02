"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { GENERATE_COST } from "@/lib/creditPacks";

// 크레딧 페이지 — 잔액 히어로 + 충전 + 사용 내역(credit_ledger, RLS로 본인 것만 조회).
// '서비스를 받고 있다' 느낌: 내가 뭘 쓰고 얼마가 남았는지 투명하게.

interface LedgerRow {
  id: string;
  amount: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

const REASON_LABEL: Record<string, string> = {
  generate: "글 생성",
  refund_generate: "생성 실패 환불",
  purchase: "크레딧 충전",
  grant: "지급",
  admin: "운영자 조정",
};

export default function CreditsView({
  credits,
  onBack,
  onCharge,
}: {
  credits: number;
  onBack: () => void;
  /** 충전하기 — 팩 시트 열기 */
  onCharge: () => void;
}) {
  const [rows, setRows] = useState<LedgerRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase
          .from("credit_ledger")
          .select("id, amount, balance_after, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (alive) setRows((data as LedgerRow[]) ?? []);
      } catch {
        if (alive) setRows([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <main className="ateflo-page-in mx-auto max-w-xl px-6 py-8 pb-16">
      <button onClick={onBack} className="-ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700">
        <span className="text-base leading-none">←</span> 홈
      </button>

      {/* 잔액 히어로 */}
      <div className="at-rise mt-4 rounded-3xl bg-gradient-to-br from-[#1D75F7] to-[#1565d8] p-6 text-white shadow-[0_14px_34px_-16px_rgba(29,117,247,0.6)]">
        <p className="text-[13px] font-semibold text-white/75">내 크레딧</p>
        <p className="mt-1.5 leading-none tracking-tight">
          <span className="text-[40px] font-extrabold">{credits.toLocaleString("ko-KR")}</span>
        </p>
        <p className="mt-2 text-[13px] font-medium text-white/85">글 {Math.floor(credits / GENERATE_COST)}편 쓸 수 있어요 · 1편 = {GENERATE_COST}크레딧</p>
        <button onClick={onCharge} className="at-press mt-4 w-full rounded-xl bg-white py-3 text-[14px] font-bold text-[#1D75F7] transition hover:opacity-95">
          충전하기
        </button>
      </div>

      {/* 사용 내역 */}
      <p className="at-rise at-d2 mb-2 mt-7 px-1 text-[13px] font-semibold text-neutral-400">사용 내역</p>
      <div className="at-rise at-d3 divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04]">
        {rows === null ? (
          <div className="space-y-3 p-5" aria-hidden>
            {[0, 1, 2].map((i) => <div key={i} className="ateflo-skel h-5 w-full rounded" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-neutral-400">아직 내역이 없어요. 첫 글을 쓰면 여기에 쌓여요.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-neutral-800">{REASON_LABEL[r.reason] ?? r.reason}</p>
                <p className="mt-0.5 text-[11.5px] text-neutral-400">{new Date(r.created_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-[14px] font-bold ${r.amount > 0 ? "text-[#1D75F7]" : "text-neutral-800"}`}>{r.amount > 0 ? `+${r.amount.toLocaleString("ko-KR")}` : r.amount.toLocaleString("ko-KR")}</p>
                <p className="mt-0.5 text-[11px] text-neutral-300">잔액 {r.balance_after.toLocaleString("ko-KR")}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
