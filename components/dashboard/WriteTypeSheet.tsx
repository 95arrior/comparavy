"use client";

import { useEffect, useState } from "react";
import { IMAGE_COST } from "@/lib/creditPacks";

// 글 생성 직전 '확인' 시트 — 생성은 크레딧이 들어 실수 방지용 확인 한 번.
// ★이미지 동시 생성 토글: 켜면 글이 써지는 동안 사진 자리 앞 3곳의 AI 일러스트가 병렬로 만들어진다.
export default function WriteTypeSheet({
  title,
  onPick,
  onClose,
}: {
  title: string;
  onPick: (opts: { withImages: boolean }) => void;
  onClose: () => void;
}) {
  const [withImages, setWithImages] = useState(false);
  useEffect(() => {
    try { setWithImages(localStorage.getItem("ateflo_with_images") === "1"); } catch { /* ignore */ }
  }, []);
  function toggle() {
    setWithImages((v) => {
      try { localStorage.setItem("ateflo_with_images", v ? "0" : "1"); } catch { /* ignore */ }
      return !v;
    });
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="ateflo-sheet-up w-full max-w-md at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium text-neutral-400">이 글감으로 쓸까요?</p>
        <p className="mt-1 text-[15px] font-bold leading-snug text-neutral-900">{title}</p>

        {/* 이미지 동시 생성 토글 */}
        <button onClick={toggle} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-left transition active:scale-[0.99]">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-neutral-900">AI 이미지도 함께 🎨</p>
            <p className="mt-0.5 text-[12px] text-neutral-500">글 쓰는 동안 사진 자리 3곳을 채워요 · +{IMAGE_COST * 3}크레딧</p>
          </div>
          <span className={`flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors ${withImages ? "bg-[#1D75F7]" : "bg-neutral-200"}`}>
            <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${withImages ? "translate-x-5" : ""}`} />
          </span>
        </button>

        <button
          onClick={() => onPick({ withImages })}
          className="at-press mt-4 w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
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
