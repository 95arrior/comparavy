"use client";

import { useState } from "react";

// '내 이야기로 글쓰기' 인라인 입력 — 홈에 바로 깔린다(시트 X). 텍스트영역 + 우하단 ↑ 전송 + 홍보/정보.
// 주제(제목)는 서버가 AI로 핏하게 뽑는다(사용자는 이야기만).
export default function StoryComposer({
  hasBiz,
  local,
  onSubmit,
}: {
  hasBiz: boolean;
  local: boolean;
  onSubmit: (story: string, promo: boolean) => void;
}) {
  const [story, setStory] = useState("");
  const [promo, setPromo] = useState(local && hasBiz);
  const ready = story.trim().length >= 10;
  const submit = () => { if (ready) onSubmit(story.trim(), promo); };

  return (
    <div>
      <div className="relative">
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder={"교재·수업·경험·우리 강점을 편하게 적어주세요. 두서없어도 돼요.\n예) 우리 학원은 파닉스를 6단계로 나눠서 가르쳐요. 지난달엔 아이들이 직접 영어책을 읽었어요. 우리만의 강점은 소수정예라…"}
          rows={6}
          maxLength={4000}
          className="w-full resize-none rounded-2xl bg-neutral-100 px-4 py-3.5 pr-14 text-[15px] leading-relaxed outline-none transition placeholder:text-neutral-400 placeholder:leading-relaxed focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30"
        />
        <button
          onClick={submit}
          disabled={!ready}
          aria-label="이 이야기로 글 만들기"
          className={`absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90 ${ready ? "bg-[#1D75F7] text-white hover:opacity-90" : "bg-neutral-300 text-white"}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
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
