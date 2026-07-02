"use client";

import { useEffect } from "react";

// 글 생성 직전 '확인' 시트 — 탭=즉시생성 X. 생성은 크레딧이 들어 실수 방지용 확인 한 번.
// (구 '정보성/홍보용' 선택은 네이버 수익형 단일 피벗으로 제거 — 모든 글은 정보성)
export default function WriteTypeSheet({
  title,
  onPick,
  onClose,
}: {
  title: string;
  onPick: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="ateflo-sheet-up w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium text-neutral-400">이 글감으로 쓸까요?</p>
        <p className="mt-1 text-[15px] font-bold leading-snug text-neutral-900">{title}</p>

        <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-[13px] leading-relaxed text-neutral-600">
          <p>· 네이버 규격(짧은 문단·형광펜·해시태그)으로 완성돼요</p>
          <p>· 완성되면 <b className="text-neutral-800">복사 → 네이버에 붙여넣기</b>로 발행해요</p>
        </div>

        <button
          onClick={onPick}
          className="mt-5 w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
        >
          이 글 쓰기
        </button>
        <p className="mt-2 text-center text-[11px] text-neutral-400">생성하면 되돌릴 수 없어요</p>

        <button onClick={onClose} className="mt-2 w-full py-2 text-center text-sm font-medium text-neutral-400 transition hover:text-neutral-700">
          취소
        </button>
      </div>
    </div>
  );
}
