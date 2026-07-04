"use client";

import { useEffect, useState } from "react";

// '내 이야기로 글쓰기' — 사장님이 교재·수업·경험·강점을 편하게 적으면, 우리가 네이버 최적화 품질로 재구성.
// 주제(제목)는 AI가 이야기에서 '핏하게' 뽑는다(사용자가 안 적어도 됨).
// GPT와의 차별: 업종·동네·대상·강점(온보딩 데이터) + 네이버 규격 + 정직 가드 + 발행까지 자동.
export default function StorySheet({
  hasBiz,
  local,
  onSubmit,
  onClose,
}: {
  hasBiz: boolean; // 업장 정보 있으면 '홍보용'(가게 연결)이 의미 있음
  local: boolean; // 동네 사장님만 홍보용 노출
  onSubmit: (story: string, promo: boolean) => void;
  onClose: () => void;
}) {
  const [story, setStory] = useState("");
  const [promo, setPromo] = useState(local && hasBiz);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ready = story.trim().length >= 10;
  const submit = () => { if (ready) onSubmit(story.trim(), promo); };

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="ateflo-sheet-up flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white sm:rounded-3xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <p className="text-[17px] font-bold text-neutral-900">내 이야기로 글쓰기</p>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">교재·수업·경험·우리 강점을 편하게 적어주세요. 두서없어도 돼요 — <b className="text-neutral-700">네이버에 맞는 진짜 우리 가게 글</b>로 만들어 드려요. 제목은 알아서 핏하게.</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {/* 챗 입력st — 텍스트 영역 + 우하단 ↑ 전송 */}
          <div className="relative">
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
              placeholder={"예) 우리 학원은 파닉스를 6단계로 나눠서 가르쳐요. 처음엔 알파벳 소리부터…\n지난달엔 아이들이 직접 영어책을 읽었어요. 우리 교재는…\n우리만의 강점은 소수정예라 한 명씩 봐주는 거예요."}
              rows={8}
              maxLength={4000}
              autoFocus
              className="w-full resize-none rounded-2xl bg-neutral-100 px-4 py-3.5 pr-14 text-[15px] leading-relaxed outline-none transition placeholder:text-neutral-400 placeholder:leading-relaxed focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30"
            />
            <button
              onClick={submit}
              disabled={!ready}
              aria-label="이 이야기로 글 만들기"
              className={`absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90 ${ready ? "tk-grad-cta text-white hover:opacity-90" : "bg-neutral-300 text-white"}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
          </div>
          <p className="mt-1.5 px-1 text-right text-[11px] text-neutral-400">{story.length}/4000</p>

          {local && hasBiz && (
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-neutral-50 p-1.5">
              <button onClick={() => setPromo(true)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-bold transition ${promo ? "bg-white text-[#1D75F7] shadow-sm" : "text-neutral-500"}`}>홍보용 <span className="text-[11px] font-medium opacity-70">(가게 연결)</span></button>
              <button onClick={() => setPromo(false)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-bold transition ${!promo ? "bg-white text-[#1D75F7] shadow-sm" : "text-neutral-500"}`}>정보용 <span className="text-[11px] font-medium opacity-70">(순수 정보)</span></button>
            </div>
          )}

          <p className="mt-3 text-center text-[11px] text-neutral-400">적은 내용만 살려요 · 없는 경험은 지어내지 않아요</p>
        </div>
      </div>
    </div>
  );
}
