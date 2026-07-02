"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CREDIT_PACKS } from "@/lib/creditPacks";

// 크레딧 0 → 생성 시도 시 뜨는 페이월 시트.
// 결제 유도 심리: 빈 화면이 아니라 '하려던 일(글감 제목)'이 보이는 상태에서 잠김 → 손실 회피.
// 카피는 "구매"가 아니라 "이어가기" — 코스 연속성 프레임.
export default function CreditPaywallSheet({
  pendingTitle,
  onClose,
}: {
  /** 유저가 쓰려던 글감 제목 — '이걸 못 쓰고 있다'를 보여주는 손실 회피 장치 */
  pendingTitle?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="ateflo-sheet-up w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {pendingTitle ? (
          <>
            <p className="text-xs font-medium text-neutral-400">오늘의 글이 준비됐어요</p>
            <p className="mt-1 flex items-center gap-1.5 text-[15px] font-bold leading-snug text-neutral-900">
              <span className="text-neutral-300">🔒</span>
              <span className="min-w-0 flex-1">{pendingTitle}</span>
            </p>
          </>
        ) : (
          <p className="text-[17px] font-bold text-neutral-900">크레딧이 다 떨어졌어요</p>
        )}
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
          크레딧을 충전하면 지금 바로 이어서 쓸 수 있어요. 글 1편 = 10크레딧.
        </p>

        <div className="mt-4 space-y-2">
          {CREDIT_PACKS.map((p) => (
            <div key={p.key} className={`flex items-center gap-3 rounded-2xl border p-3.5 ${p.highlight ? "border-[#1D75F7] bg-[#1D75F7]/[0.04]" : "border-neutral-200 bg-white"}`}>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[14px] font-bold text-neutral-900">
                  {p.name}
                  {p.highlight && <span className="rounded-full bg-[#1D75F7] px-1.5 py-0.5 text-[10px] font-bold text-white">추천</span>}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-neutral-500">{p.desc}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[14px] font-bold text-neutral-900">{p.price.toLocaleString("ko-KR")}원</p>
                <p className="text-[11px] text-neutral-400">{p.credits.toLocaleString("ko-KR")}크레딧</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/pricing"
          className="mt-5 block w-full rounded-xl bg-[#1D75F7] py-3.5 text-center text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
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
