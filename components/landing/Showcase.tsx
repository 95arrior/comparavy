"use client";

import { useRef, useState } from "react";
import Reveal from "@/components/Reveal";

// 2~3섹션 — [2] 업종 칩만 크게(우리 4분류) → 고르면 [3] 그 업종 글감 추천.
const CATS: { label: string; topics: string[] }[] = [
  { label: "병원·약국", topics: ["임플란트 가격, 왜 병원마다 다를까?", "스케일링 주기, 얼마나 자주 받을까", "사랑니 꼭 빼야 할까?"] },
  { label: "교육·학원", topics: ["초등 영어, 몇 살부터 시작할까", "중등 수학 선행, 꼭 필요할까", "집에서 집중력 높이는 습관"] },
  { label: "법률·세무", topics: ["종합소득세 신고, 처음이라면 이 순서", "상속세 줄이는 기본 원칙", "부당해고, 어떻게 대응할까"] },
  { label: "기타", topics: ["우리 가게가 검색에 안 뜨는 이유", "단골 만드는 후기 관리법", "블로그 글, 며칠에 한 번이 좋을까"] },
];

export default function Showcase() {
  const [sel, setSel] = useState(0);
  const topicsRef = useRef<HTMLElement>(null);
  const cat = CATS[sel];

  const pick = (i: number) => {
    setSel(i);
    // 고르면 글감 섹션으로 부드럽게 이동
    setTimeout(() => topicsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <>
      {/* [2] 업종 선택 — 큰 칩만 */}
      <section className="flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-white px-6 py-20">
        <Reveal className="text-center">
          <h2 className="font-pretendard text-[clamp(26px,6.2vw,42px)] font-bold leading-[1.18] tracking-[-0.02em]">
            어떤 업종에 종사하세요?
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-neutral-500 sm:text-lg">
            업종만 고르면, 그에 맞는 글감을 추천해드려요.
          </p>
        </Reveal>

        <Reveal delay={120} className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-3">
          {CATS.map((c, i) => {
            const on = i === sel;
            return (
              <button
                key={c.label}
                onClick={() => pick(i)}
                className={`rounded-full px-7 py-4 text-base font-bold transition-all duration-200 active:scale-95 sm:text-lg ${
                  on ? "bg-[#1D75F7] text-white shadow-[0_10px_24px_-8px_rgba(29,117,247,0.6)]" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </Reveal>
      </section>

      {/* [3] 선택 업종의 추천 글감 */}
      <section ref={topicsRef} className="flex min-h-[100svh] scroll-mt-0 flex-col items-center justify-center overflow-hidden bg-neutral-50/70 px-6 py-20">
        <Reveal className="text-center">
          <span className="inline-block rounded-full bg-[#1D75F7]/10 px-3 py-1 text-[13px] font-bold text-[#1D75F7]">{cat.label}</span>
          <h2 className="font-pretendard mt-4 text-[clamp(24px,5.6vw,38px)] font-bold leading-[1.2] tracking-[-0.02em]">
            이런 글감을 추천해드려요
          </h2>
        </Reveal>

        <div key={sel} className="ateflo-soft-in mx-auto mt-10 w-full max-w-md space-y-3">
          {cat.topics.map((t) => (
            <div key={t} className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-left text-[15px] font-medium text-neutral-800 shadow-[0_6px_18px_-10px_rgba(20,40,90,0.3)]">
              {t}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
