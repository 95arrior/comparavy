"use client";

import DemoStream from "@/components/DemoStream";
import Reveal from "@/components/Reveal";

// 제품 한 방 — 토스플레이스st: 업종 고르면 → 글감 받고 → 글이 완성. 크게·심플·시네마틱(스크롤 등장).
const TOPICS = [
  "임플란트 가격, 왜 병원마다 다를까?",
  "스케일링 주기, 얼마나 자주 받아야 할까",
  "사랑니, 꼭 빼야 할까?",
];

export default function Showcase() {
  return (
    <section className="overflow-hidden bg-neutral-50/70 py-24 sm:py-36">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="font-pretendard text-[clamp(28px,6.6vw,46px)] font-bold leading-[1.16] tracking-[-0.02em]">
            업종만 고르면,
            <br />
            글이 알아서 나와요
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-neutral-500 sm:text-lg">
            검색되는 글감을 추천하고, 글까지 완성해드려요.
          </p>
        </Reveal>
      </div>

      {/* 글감 미리보기 */}
      <Reveal delay={120} className="mx-auto mt-14 max-w-md px-6">
        <p className="text-center text-[13px] font-semibold text-[#1D75F7]">병의원 · 오늘의 글감</p>
        <div className="mt-3 space-y-2.5">
          {TOPICS.map((t) => (
            <div key={t} className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-left text-[15px] font-medium text-neutral-800 shadow-[0_4px_14px_-8px_rgba(20,40,90,0.25)]">
              {t}
            </div>
          ))}
        </div>
      </Reveal>

      {/* 화살표 — 글감에서 완성 글로 */}
      <Reveal delay={160} className="mt-7 flex justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </Reveal>

      {/* 완성된 글 — 실제 데모(타이핑) */}
      <Reveal delay={200} className="mx-auto mt-7 max-w-xl px-6">
        <DemoStream />
      </Reveal>
    </section>
  );
}
