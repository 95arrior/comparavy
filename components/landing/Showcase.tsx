"use client";

import { useState } from "react";
import Reveal from "@/components/Reveal";

// 2섹션 — 서비스 설명형: 업종을 고르면 그 업종 글감이 추천된다. 부드러운 칩(토스st) + 클릭 시 글감 스왑.
const CATS: { label: string; topics: string[] }[] = [
  { label: "병원·약국", topics: ["임플란트 가격, 왜 병원마다 다를까?", "스케일링 주기, 얼마나 자주 받을까", "사랑니 꼭 빼야 할까?"] },
  { label: "교육·학원", topics: ["초등 영어, 몇 살부터 시작할까", "중등 수학 선행, 꼭 필요할까", "집에서 집중력 높이는 습관"] },
  { label: "음식점·카페", topics: ["단골 만드는 매장 후기 관리법", "배달 평점 올리는 사진 찍기", "신메뉴, 이렇게 알리면 손님이 와요"] },
  { label: "뷰티·피트니스", topics: ["다이어트 정체기, 이렇게 넘겨요", "PT 처음인데 뭐부터 할까", "피부 관리, 얼마나 자주가 좋을까"] },
  { label: "법률·세무", topics: ["종합소득세 신고, 처음이라면 이 순서", "상속세 줄이는 기본 원칙", "부당해고, 어떻게 대응할까"] },
  { label: "기타", topics: ["우리 가게가 검색에 안 뜨는 이유", "블로그 글, 며칠에 한 번이 좋을까", "후기 많은 곳은 뭐가 다를까"] },
];

export default function Showcase() {
  const [sel, setSel] = useState(0);
  const cat = CATS[sel];

  return (
    <section className="flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-white px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Reveal>
          <h2 className="font-pretendard text-[clamp(26px,6.2vw,42px)] font-bold leading-[1.18] tracking-[-0.02em]">
            업종만 고르면,
            <br />
            글감이 떠올라요
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-neutral-500 sm:text-lg">
            사장님 업종을 고르면, 검색되는 글감을 바로 추천해드려요.
          </p>
        </Reveal>
      </div>

      {/* 업종 칩 — 부드러운 알약, 선택 가능 */}
      <Reveal delay={120} className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-2.5">
        {CATS.map((c, i) => {
          const on = i === sel;
          return (
            <button
              key={c.label}
              onClick={() => setSel(i)}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                on ? "bg-[#1D75F7] text-white shadow-[0_8px_20px_-8px_rgba(29,117,247,0.6)]" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </Reveal>

      {/* 선택 업종의 추천 글감 — 선택 바뀌면 부드럽게 스왑 */}
      <div className="mx-auto mt-8 w-full max-w-md">
        <p className="text-center text-[13px] font-semibold text-[#1D75F7]">{cat.label} · 오늘의 글감</p>
        <div key={sel} className="ateflo-soft-in mt-3 space-y-2.5">
          {cat.topics.map((t) => (
            <div key={t} className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-left text-[15px] font-medium text-neutral-800 shadow-[0_4px_14px_-8px_rgba(20,40,90,0.25)]">
              {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
