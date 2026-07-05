"use client";

import { useEffect, useState } from "react";
import { IMAGE_COST } from "@/lib/creditPacks";
import { AI_IMAGES_AT_CREATE } from "@/config/publish";

// 글 생성 직전 '확인' 시트 — 생성은 크레딧이 들어 실수 방지용 확인 한 번.
// ★이미지 동시 생성 토글: 켜면 글이 써지는 동안 사진 자리 앞 3곳의 AI 일러스트가 병렬로 만들어진다.
export default function WriteTypeSheet({
  title,
  titleAlt,
  onPick,
  onClose,
}: {
  title: string;
  titleAlt?: string; // 검색형 제목(2안). title=클릭형. 다르면 유저가 고른다.
  onPick: (opts: { withImages: boolean; title?: string }) => void;
  onClose: () => void;
}) {
  const [withImages, setWithImages] = useState(false);
  const hasTwo = !!titleAlt && titleAlt.trim() && titleAlt.trim() !== title.trim();
  const [pickTitle, setPickTitle] = useState(title);
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
        <p className="text-xs font-medium text-neutral-400">{hasTwo ? "제목을 골라주세요" : "이 글감으로 쓸까요?"}</p>
        {hasTwo ? (
          <div className="mt-2 space-y-2">
            {[{ t: title, tag: "클릭형" }, { t: titleAlt as string, tag: "검색형" }].map(({ t, tag }) => {
              const on = pickTitle === t;
              return (
                <button key={t} onClick={() => setPickTitle(t)}
                  className={`flex w-full items-start gap-2.5 rounded-2xl px-4 py-3 text-left transition ${on ? "bg-[#1D75F7]/[0.06] ring-1 ring-[#1D75F7]" : "bg-neutral-50 ring-1 ring-transparent"}`}>
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-[#1D75F7]" : "border-neutral-300"}`}>
                    {on && <span className="h-1.5 w-1.5 rounded-full tk-grad-cta" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold leading-snug text-neutral-900">{t}</span>
                    <span className={`mt-0.5 inline-block text-[11px] font-semibold ${on ? "text-[#1D75F7]" : "text-neutral-400"}`}>{tag}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-1 text-[15px] font-bold leading-snug text-neutral-900">{title}</p>
        )}

        {/* 이미지 동시 생성 토글 — AI 봉인 중엔 숨김(사진은 검토 화면에서 직접 업로드) */}
        {AI_IMAGES_AT_CREATE && <button onClick={toggle} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-left transition active:scale-[0.99]">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-neutral-900">AI 이미지도 함께 🎨</p>
            <p className="mt-0.5 text-[12px] text-neutral-500">대표이미지는 무료로, 본문 사진은 최대 +{IMAGE_COST * 2}크레딧</p>
          </div>
          <span className={`flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors ${withImages ? "tk-grad-cta" : "bg-neutral-200"}`}>
            <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${withImages ? "translate-x-5" : ""}`} />
          </span>
        </button>}

        <button
          onClick={() => onPick({ withImages: AI_IMAGES_AT_CREATE && withImages, title: pickTitle })}
          className="at-press mt-4 w-full rounded-xl tk-grad-cta py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
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
