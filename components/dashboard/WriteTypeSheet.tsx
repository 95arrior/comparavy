"use client";

import { useEffect, useState } from "react";

// 글 생성 직전 '정보성/홍보용' 선택 — 탭=즉시생성 X. 선택(하이라이트) → '확인' 버튼으로만 생성(실수 방지).
// 홍보용=마지막에 내 가게 자연 연결 + 섹션 추천. 정보성=순수 정보(가게 언급 X).
export default function WriteTypeSheet({
  title,
  hasBiz,
  onPick,
  onClose,
}: {
  title: string;
  hasBiz: boolean; // 업장 정보가 있을 때만 '홍보용'이 의미 있음
  onPick: (promo: boolean) => void;
  onClose: () => void;
}) {
  // 업장 없으면(online/hobby) 홍보 불가 → 정보성 기본 선택. 그래도 '확인'은 눌러야 생성.
  const [picked, setPicked] = useState<boolean | null>(hasBiz ? null : false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const Check = () => (
    <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1D75F7] text-white">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium text-neutral-400">이 글, 어떻게 쓸까요?</p>
        <p className="mt-1 truncate text-[15px] font-bold text-neutral-900">{title}</p>

        <div className="mt-5 space-y-3">
          {/* 홍보용 */}
          <button
            onClick={() => hasBiz && setPicked(true)}
            disabled={!hasBiz}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${picked === true ? "border-[#1D75F7] bg-[#1D75F7]/[0.07]" : "border-neutral-200 bg-white hover:border-neutral-300"}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1D75F7] text-white">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-[15px] font-bold text-neutral-900">
                홍보용 <span className="rounded-full bg-[#1D75F7] px-1.5 py-0.5 text-[10px] font-bold text-white">추천</span>
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-neutral-500">
                {hasBiz ? "정보 끝에 내 가게를 자연스럽게 연결해요" : "내 가게 정보를 먼저 등록하면 쓸 수 있어요"}
              </span>
            </span>
            {picked === true && <Check />}
          </button>

          {/* 정보성 */}
          <button
            onClick={() => setPicked(false)}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition active:scale-[0.99] ${picked === false ? "border-[#1D75F7] bg-[#1D75F7]/[0.07]" : "border-neutral-200 bg-white hover:border-neutral-300"}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold text-neutral-900">정보성</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-neutral-500">순수 정보글로 신뢰를 쌓아요 (가게 언급 없이)</span>
            </span>
            {picked === false && <Check />}
          </button>
        </div>

        {/* 확인 — 선택해야 활성. 실수 생성 방지 */}
        <button
          onClick={() => picked !== null && onPick(picked)}
          disabled={picked === null}
          className="mt-5 w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {picked === null ? "글 종류를 선택하세요" : picked ? "홍보용으로 글 쓰기" : "정보성으로 글 쓰기"}
        </button>
        <p className="mt-2 text-center text-[11px] text-neutral-400">생성하면 되돌릴 수 없어요</p>

        <button onClick={onClose} className="mt-2 w-full py-2 text-center text-sm font-medium text-neutral-400 transition hover:text-neutral-700">
          취소
        </button>
      </div>
    </div>
  );
}
