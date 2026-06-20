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
    <section className="flex h-full flex-col items-center justify-center overflow-hidden bg-white px-6 py-10">
      <div className="mx-auto max-w-3xl text-center">
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

      {/* 글감 미리보기(컴팩트) */}
      <Reveal delay={120} className="mx-auto mt-7 w-full max-w-md">
        <p className="text-center text-[13px] font-semibold text-[#1D75F7]">병원·약국 · 오늘의 글감</p>
        <div className="mt-2.5 space-y-2">
          {TOPICS.map((t) => (
            <div key={t} className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-left text-[14px] font-medium text-neutral-800 shadow-[0_4px_14px_-8px_rgba(20,40,90,0.25)]">
              {t}
            </div>
          ))}
        </div>
      </Reveal>

      {/* 완성된 글 — 실제 데모(타이핑) */}
      <Reveal delay={200} className="mx-auto mt-5 w-full max-w-xl">
        <DemoStream />
      </Reveal>
    </section>
  );
}
