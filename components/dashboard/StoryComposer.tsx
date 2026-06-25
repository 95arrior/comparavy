"use client";

import { useState } from "react";
import AteFloLogo from "@/components/AteFloLogo";

// '내 이야기로 글쓰기' 인라인 입력 — 홈에 바로 깔린다. 챗GPT풍 박스(기본 테두리), 포커스 시 오로라 테두리.
// 전송 버튼: 비었을 땐 우리 로고 → 입력 시작하면 ↑ 화살표로 자연스럽게. 주제는 서버가 AI로 핏하게.
export default function StoryComposer({
  hasBiz,
  local,
  story,
  onStoryChange,
  promo,
  onPromoChange,
  onSubmit,
}: {
  hasBiz: boolean;
  local: boolean;
  story: string; // 초안(Home이 보유 → 글감 보기 갔다 와도 유지)
  onStoryChange: (s: string) => void;
  promo: boolean;
  onPromoChange: (p: boolean) => void;
  onSubmit: (story: string, promo: boolean) => void;
}) {
  const [focused, setFocused] = useState(false);
  const setStory = onStoryChange;
  const setPromo = onPromoChange;
  const hasText = story.trim().length > 0;
  const ready = story.trim().length >= 10;
  const submit = () => { if (ready) onSubmit(story.trim(), promo); };

  return (
    <div>
      {/* 박스 — 기본 회색 테두리(챗GPT풍), 포커스 시 오로라 테두리 애니메이션 */}
      <div className={`relative rounded-2xl p-[1.5px] transition-colors duration-300 ${focused ? "ateflo-chip-aurora" : "bg-neutral-200"}`}>
        <div className="relative rounded-[14.5px] bg-white">
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
            placeholder={"교재·수업·경험·우리 강점을 편하게 적어주세요. 두서없어도 돼요.\n예) 우리 학원은 파닉스를 6단계로 나눠서 가르쳐요. 지난달엔 아이들이 직접 영어책을 읽었어요. 우리만의 강점은 소수정예라…"}
            rows={6}
            maxLength={4000}
            className="w-full resize-none rounded-[14.5px] bg-transparent px-4 py-3.5 pr-14 text-[15px] leading-relaxed outline-none placeholder:text-neutral-400 placeholder:leading-relaxed"
          />
          {/* 전송 — 로고 ↔ 화살표 모핑 */}
          <button
            onClick={submit}
            disabled={!ready}
            aria-label="이 이야기로 글 만들기"
            className={`absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full transition-colors duration-300 ${ready ? "bg-[#1D75F7] active:scale-90 hover:opacity-90" : "bg-neutral-100"}`}
          >
            <span className={`absolute transition-all duration-300 ${hasText ? "scale-50 opacity-0" : "scale-100 opacity-100"}`}>
              <AteFloLogo size={18} />
            </span>
            <span className={`absolute transition-all duration-300 ${hasText ? "scale-100 opacity-100" : "scale-50 opacity-0"} ${ready ? "text-white" : "text-neutral-400"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </span>
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-1">
        <span className="text-[11px] text-neutral-400">제목은 AI가 알아서 핏하게 · 없는 경험은 안 지어내요</span>
        <span className="text-[11px] text-neutral-400">{story.length}/4000</span>
      </div>

      {local && hasBiz && (
        <div className="mt-2.5 flex items-center justify-between rounded-2xl bg-neutral-50 p-1.5">
          <button onClick={() => setPromo(true)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-bold transition ${promo ? "bg-white text-[#1D75F7] shadow-sm" : "text-neutral-500"}`}>홍보용 <span className="text-[11px] font-medium opacity-70">(가게 연결)</span></button>
          <button onClick={() => setPromo(false)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-bold transition ${!promo ? "bg-white text-[#1D75F7] shadow-sm" : "text-neutral-500"}`}>정보용 <span className="text-[11px] font-medium opacity-70">(순수 정보)</span></button>
        </div>
      )}
    </div>
  );
}
