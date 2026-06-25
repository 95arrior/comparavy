"use client";

import { useEffect, useState } from "react";

// '내 이야기로 글쓰기' — 사장님이 교재·수업·경험·강점을 편하게 적으면, 우리가 네이버 최적화 품질로 재구성.
// GPT와의 차별: 업종·동네·대상·강점(온보딩 데이터) + 네이버 규격 + 정직 가드 + 발행까지 자동으로 입힌다.
export default function StorySheet({
  hasBiz,
  local,
  onSubmit,
  onClose,
}: {
  hasBiz: boolean; // 업장 정보 있으면 '홍보용'(가게 연결)이 의미 있음
  local: boolean; // 동네 사장님만 홍보용 노출
  onSubmit: (story: string, topic: string, promo: boolean) => void;
  onClose: () => void;
}) {
  const [story, setStory] = useState("");
  const [topic, setTopic] = useState("");
  const [promo, setPromo] = useState(local && hasBiz);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ready = story.trim().length >= 10;

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="ateflo-sheet-up flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white sm:rounded-3xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <p className="text-[17px] font-bold text-neutral-900">내 이야기로 글쓰기</p>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">교재·수업·경험·우리 강점을 편하게 적어주세요. 두서없어도 돼요 — <b className="text-neutral-700">네이버에 맞는 진짜 우리 가게 글</b>로 만들어 드려요.</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder={"예) 우리 학원은 파닉스를 6단계로 나눠서 가르쳐요. 처음엔 알파벳 소리부터…\n지난달엔 아이들이 직접 영어책을 읽었어요. 우리 교재는…\n우리만의 강점은 소수정예라 한 명씩 봐주는 거예요."}
            rows={8}
            maxLength={4000}
            autoFocus
            className="w-full resize-none rounded-2xl bg-neutral-100 px-4 py-3.5 text-[15px] leading-relaxed outline-none transition placeholder:text-neutral-400 placeholder:leading-relaxed focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30"
          />
          <p className="mt-1.5 text-right text-[11px] text-neutral-400">{story.length}/4000</p>

          <label className="mt-2 block text-[13px] font-bold text-neutral-700">이 글의 주제 <span className="font-normal text-neutral-400">(선택 — 비우면 이야기에서 자동으로)</span></label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 우리 학원 파닉스 수업 / 초보 영어 시작법"
            maxLength={60}
            className="mt-2 w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30"
          />

          {local && hasBiz && (
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-neutral-50 p-1.5">
              <button onClick={() => setPromo(true)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-bold transition ${promo ? "bg-white text-[#1D75F7] shadow-sm" : "text-neutral-500"}`}>홍보용 <span className="text-[11px] font-medium opacity-70">(가게 연결)</span></button>
              <button onClick={() => setPromo(false)} className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-bold transition ${!promo ? "bg-white text-[#1D75F7] shadow-sm" : "text-neutral-500"}`}>정보용 <span className="text-[11px] font-medium opacity-70">(순수 정보)</span></button>
            </div>
          )}
        </div>

        <div className="px-6 pt-1">
          <button
            onClick={() => ready && onSubmit(story.trim(), topic.trim(), promo)}
            disabled={!ready}
            className="w-full rounded-2xl bg-[#1D75F7] py-4 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ready ? "이 이야기로 글 만들기" : "이야기를 조금 더 적어주세요"}
          </button>
          <p className="mt-2 text-center text-[11px] text-neutral-400">적은 내용만 살려요 · 없는 경험은 지어내지 않아요</p>
          <button onClick={onClose} className="mt-1 w-full py-2 text-center text-sm font-medium text-neutral-400 transition hover:text-neutral-700">취소</button>
        </div>
      </div>
    </div>
  );
}
