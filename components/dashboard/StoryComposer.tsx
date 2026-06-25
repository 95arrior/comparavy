"use client";

import { useState } from "react";

// '내 이야기로 글쓰기' 인라인 입력 — 테두리 없는 박스, 포커스 시 박스 '안'에서 오로라 애니메이션.
// 제목은 분리하지 않고, 다 적고 ↑(글쓰기) 누르면 그때 '제목 정하기'가 뜬다. 비우면 AI가 핏하게.
export default function StoryComposer({
  hasBiz,
  local,
  title,
  onTitleChange,
  story,
  onStoryChange,
  promo,
  onPromoChange,
  onSubmit,
}: {
  hasBiz: boolean;
  local: boolean;
  title: string;
  onTitleChange: (t: string) => void;
  story: string;
  onStoryChange: (s: string) => void;
  promo: boolean;
  onPromoChange: (p: boolean) => void;
  onSubmit: (story: string, promo: boolean, title: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const setStory = onStoryChange;
  const setPromo = onPromoChange;
  const ready = story.trim().length >= 10;

  return (
    <div>
      {/* 박스 — 하단 박스들과 동일하게 평평한 neutral-50(드롭쉐도우 없음). 포커스 시 오로라가 '테두리'로 또렷하게 일렁임 */}
      <div className={`rounded-2xl p-[2px] transition-all duration-500 ${focused ? "ateflo-chip-aurora shadow-[0_0_20px_-3px_rgba(150,160,255,0.5)]" : "bg-transparent"}`}>
        <div className="relative overflow-hidden rounded-[15px] bg-neutral-50">
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={focused ? "" : "예) 자주 받는 질문, 오늘 있었던 일, 꼭 알려주고 싶은 정보를 적어주세요"}
            rows={6}
            maxLength={4000}
            className="relative w-full resize-none bg-transparent px-4 py-3.5 pr-14 text-[15px] leading-relaxed outline-none placeholder:text-neutral-400"
          />
          {/* 전송 — 비었을 땐 안 보이고, 충분히 적으면(ready) 파란 ↑가 자연스럽게 나타남 */}
          <button
            onClick={() => { if (ready) setTitleOpen(true); }}
            disabled={!ready}
            aria-label="글쓰기"
            className={`absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#1D75F7] text-white transition-all duration-300 ${ready ? "scale-100 opacity-100 hover:opacity-90 active:scale-90" : "pointer-events-none scale-75 opacity-0"}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-1">
        <span className="text-[11px] text-neutral-400">없는 경험은 안 지어내요</span>
        <span className="text-[11px] text-neutral-400">{story.length}/4000</span>
      </div>

      {local && (
        <div className="mt-2.5 flex items-center justify-between rounded-2xl bg-neutral-50 p-1.5">
          <button onClick={() => setPromo(true)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-bold transition ${promo ? "bg-white text-[#1D75F7] shadow-sm" : "text-neutral-500"}`}>홍보용 <span className="text-[11px] font-medium opacity-70">(가게 연결)</span></button>
          <button onClick={() => setPromo(false)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-bold transition ${!promo ? "bg-white text-[#1D75F7] shadow-sm" : "text-neutral-500"}`}>정보용 <span className="text-[11px] font-medium opacity-70">(순수 정보)</span></button>
        </div>
      )}

      {/* 제목 정하기 — 글쓰기 직전에 */}
      {titleOpen && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setTitleOpen(false)}>
          <div className="ateflo-sheet-up w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <p className="text-[17px] font-bold text-neutral-900">제목을 정해주세요</p>
            <p className="mt-1 text-[13px] text-neutral-500">이 제목에 맞춰 글을 써드려요. 비우면 AI가 알아서.</p>
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSubmit(story.trim(), promo, title.trim()); }}
              placeholder="비우면 AI가 알아서 정해요"
              maxLength={80}
              autoFocus
              className="mt-4 w-full rounded-2xl bg-neutral-100 px-4 py-3.5 text-[15px] font-bold text-neutral-900 outline-none transition placeholder:font-normal placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30"
            />
            <button
              onClick={() => onSubmit(story.trim(), promo, title.trim())}
              className="mt-4 w-full rounded-2xl bg-[#1D75F7] py-4 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]"
            >
              {title.trim() ? "이 제목으로 글쓰기" : "AI가 제목 정하고 글쓰기"}
            </button>
            <button onClick={() => setTitleOpen(false)} className="mt-1 w-full py-2 text-center text-sm font-medium text-neutral-400 transition hover:text-neutral-700">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}
