"use client";

import { useEffect, useState } from "react";
import { IMAGE_COST } from "@/lib/creditPacks";
import { AI_IMAGES_AT_CREATE } from "@/config/publish";

// 글 생성 직전 '확인' 시트 — 생성은 크레딧이 들어 실수 방지용 확인 한 번.
// ★이미지 동시 생성 토글: 켜면 글이 써지는 동안 사진 자리 앞 3곳의 AI 일러스트가 병렬로 만들어진다.
export default function WriteTypeSheet({
  title,
  titleAlt,
  recommendSearch = false,
  onPick,
  onClose,
}: {
  title: string;
  titleAlt?: string; // 검색형 제목(2안). title=클릭형. 다르면 유저가 고른다.
  recommendSearch?: boolean; // ★종족별 추천 — 롱테일(꾸준 수요)=검색형이 정답, 트렌드=클릭형(홈피드)
  onPick: (opts: { withImages: boolean; title?: string; experience?: string }) => void;
  onClose: () => void;
}) {
  const [withImages, setWithImages] = useState(false);
  // ★경험 한 줄(2026-08-02 유저 확정) — 네이버는 경험이 담긴 글을 좋아하는데, 없는 경험은 지어낼 수 없다.
  //  그래서 '진짜 경험이 있을 때만' 받는다. 기본은 접힘 — 선택 입력이 스텝처럼 보이면 매번 멈칫하게 된다.
  const [expOpen, setExpOpen] = useState(false);
  const [experience, setExperience] = useState("");
  const hasTwo = !!titleAlt && titleAlt.trim() && titleAlt.trim() !== title.trim();
  const [pickTitle, setPickTitle] = useState(recommendSearch && titleAlt?.trim() ? (titleAlt as string) : title);
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
            {(recommendSearch ? [{ t: titleAlt as string, tag: "검색·AI브리핑 최적화 · 추천" }, { t: title, tag: "홈피드 클릭형" }] : [{ t: title, tag: "홈피드 최적화 · 추천" }, { t: titleAlt as string, tag: "검색·AI브리핑형" }]).map(({ t, tag }) => {
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

        {/* 내 경험 한 줄 — 있으면 이 글만의 재료가 되고, 없으면 그냥 지나간다(강요하지 않는다) */}
        <div className="mt-3">
          <button
            onClick={() => setExpOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-2xl bg-neutral-50 px-4 py-3 text-left transition active:scale-[0.99]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-neutral-900">겪어본 일이 있나요? <span className="font-medium text-neutral-400">(선택)</span></span>
              <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">
                {experience.trim() ? experience.trim().slice(0, 28) + (experience.trim().length > 28 ? "…" : "") : "한 줄만 적어주시면 이 글에 녹여드려요"}
              </span>
            </span>
            <span className={`shrink-0 text-neutral-300 transition-transform ${expOpen ? "rotate-180" : ""}`}>⌄</span>
          </button>
          {/* 열림/닫힘은 높이 전환으로 — 주변 요소가 튀지 않게(레이아웃 안정) */}
          <div className={`grid transition-all duration-300 ease-out ${expOpen ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value.slice(0, 200))}
                rows={2}
                placeholder="예: 작년에 연말정산 잘못해서 30만 원 토해냈어요"
                className="w-full resize-none rounded-2xl bg-white px-4 py-3 text-[13px] leading-relaxed text-neutral-900 outline-none ring-1 ring-neutral-200 transition placeholder:text-neutral-300 focus:ring-[#1D75F7]"
              />
              <p className="mt-1.5 px-1 text-[11px] leading-snug text-neutral-400">
                적어주신 범위 안에서만 써요. 없는 경험은 절대 지어내지 않아요.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onPick({ withImages: AI_IMAGES_AT_CREATE && withImages, title: pickTitle, experience: experience.trim() || undefined })}
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
