"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { startSale, fetchSaleUntil, formatRemain } from "@/lib/sale";

// 크레딧 0 → 생성 시도 시 뜨는 페이월 시트.
// 결제 유도 심리: 빈 화면이 아니라 '하려던 일(글감 제목)'이 보이는 상태에서 잠김 → 손실 회피.
// 카피는 "구매"가 아니라 "이어가기" — 코스 연속성 프레임.
export default function CreditPaywallSheet({
  pendingTitle,
  charge,
  onClose,
}: {
  /** 유저가 쓰려던 글감 제목 — '이걸 못 쓰고 있다'를 보여주는 손실 회피 장치 */
  pendingTitle?: string | null;
  /** 충전 모드 — 잔액이 있어도 크레딧 페이지에서 열 때(카피가 '떨어졌어요'가 아니어야) */
  charge?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ★24h 한정 할인 — 계정 단위 서버 강제: 잠김으로 열리면 시작(이미 있으면 유지), 1초마다 갱신
  const [until, setUntil] = useState(0);
  useEffect(() => {
    (pendingTitle ? startSale() : fetchSaleUntil()).then(setUntil);
  }, [pendingTitle]);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => { tick((t) => t + 1); if (until <= Date.now()) setUntil(0); }, 1000);
    return () => clearInterval(id);
  }, [until]);
  const saleOn = until > Date.now();

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="ateflo-sheet-up w-full max-w-md at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {pendingTitle ? (
          <>
            <p className="text-xs font-medium text-neutral-400">오늘의 글이 준비됐어요</p>
            <p className="mt-1 flex items-center gap-1.5 text-[15px] font-bold leading-snug text-neutral-900">
              
              <span className="min-w-0 flex-1">{pendingTitle}</span>
            </p>
          </>
        ) : (
          <p className="text-[17px] font-bold text-neutral-900">{charge ? "크레딧 충전" : "크레딧이 다 떨어졌어요"}</p>
        )}
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
          {charge ? "필요한 만큼 골라 충전해요." : "크레딧을 충전하면 지금 바로 이어서 쓸 수 있어요."}
        </p>

        {saleOn && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#1D75F7]/[0.07] px-3.5 py-2.5">
            <p className="text-[12.5px] font-bold text-[#1D75F7]">지금만, 승인 팩 5,000원 할인</p>
            <p className="text-[13px] font-extrabold tabular-nums text-[#1D75F7]">{formatRemain(until)}</p>
          </div>
        )}

        <Link
          href="/pricing"
          className="mt-5 block w-full rounded-xl tk-grad-cta py-3.5 text-center text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
        >
          {pendingTitle ? "코스 이어가기" : "크레딧 충전하기"}
        </Link>
        <button onClick={onClose} className="mt-2 w-full py-2 text-center text-sm font-medium text-neutral-400 transition hover:text-neutral-700">
          다음에 할게요
        </button>
      </div>
    </div>
  );
}
