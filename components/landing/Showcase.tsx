"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";

// 2~3섹션 — [2] 업종 칩(크게, 처음 선택X, 중앙 도달 시 뽕뽕뽕 팝) → 고르면 [3] 그 업종 이미지+설명+글감.
type Comp = "low" | "mid" | "high";
type Topic = { t: string; tag?: string; vol: number; comp: Comp };
type SubCard = { img: string; heading: string; desc: string; dark?: boolean; topics: Topic[] };

// 경쟁도 — 점 색 + 라벨. 막대 기준 최대값.
const COMP: Record<Comp, { label: string; dot: string }> = {
  low: { label: "경쟁 낮음", dot: "bg-emerald-500" },
  mid: { label: "경쟁 보통", dot: "bg-amber-500" },
  high: { label: "경쟁 높음", dot: "bg-rose-500" },
};
const VOL_MAX = 3000;
type Cat = { label: string; heading: string; desc: string; img: string | null; cards?: SubCard[]; dark?: boolean; topics: Topic[] };
const CATS: Cat[] = [
  {
    label: "병원·약국",
    heading: "병원·약국",
    desc: "의료광고법에 어긋나지 않게, 환자가 찾는 글만 안전하게 써드려요.",
    img: "/cat-medical.png",
    topics: [
      { t: "오래된 아말감, 지금 바꿔야 할까?", tag: "치과", vol: 880, comp: "low" },
      { t: "눈매교정, 풀리면 재수술 되나요?", tag: "성형외과", vol: 1300, comp: "mid" },
      { t: "위고비 끊으면 다시 찐다는데?", tag: "가정의학과", vol: 2400, comp: "mid" },
    ],
  },
  {
    label: "교육·학원",
    heading: "교육·학원",
    desc: "우리 동·시 지역까지 잡아, 학부모가 검색하는 글로 써드려요.",
    img: "/cat-academy.png",
    dark: true, // 녹색 칠판 배경 → 흰 텍스트
    topics: [
      { t: "파닉스 뗐는데 왜 안 읽을까?", tag: "영어", vol: 720, comp: "low" },
      { t: "초6, 선행보다 복습이 먼저?", tag: "수학", vol: 590, comp: "low" },
      { t: "잘하는 애들 노트, 뭐가 다를까?", tag: "학습법", vol: 1100, comp: "mid" },
    ],
  },
  {
    label: "법률·세무",
    heading: "법률·세무",
    desc: "의뢰인이 왜 검색했는지 짚어, 상담으로 이어지는 글로 써드려요.",
    img: "/cat-legal.png",
    topics: [
      { t: "1인 사업자도 기장 맡겨야 할까?", tag: "세무", vol: 480, comp: "low" },
      { t: "권리금 못 받으면 소송 되나요?", tag: "법률", vol: 1600, comp: "mid" },
      { t: "알바 주휴수당, 무조건 줘야 하나?", tag: "노무", vol: 2900, comp: "high" },
    ],
  },
  {
    label: "기타",
    heading: "그 외 다양한 업종",
    desc: "어떤 업종이든, 검색되는 글로 작성할 수 있어요!",
    img: null,
    topics: [],
    cards: [
      {
        img: "/cat-etc-1.png",
        heading: "그 외 다양한 업종",
        desc: "어떤 업종이든 검색되는 글로.",
        topics: [
          { t: "오래된 집, 어디부터 고쳐야 돈 아껴?", tag: "인테리어", vol: 640, comp: "low" },
          { t: "줄눈 곰팡이, 덧방으로 가려도 돼?", tag: "타일", vol: 1200, comp: "mid" },
          { t: "판넬 결로, 단열 더하면 잡히나요?", tag: "판넬", vol: 380, comp: "low" },
        ],
      },
      {
        img: "/cat-etc-2.png",
        heading: "모든 자영업자",
        desc: "동네 손님이 찾는 글까지.",
        topics: [
          { t: "노견 미용, 마취 없이 가능한가요?", tag: "애견미용", vol: 520, comp: "low" },
          { t: "장례식 화환, 당일 주문 되나요?", tag: "꽃집", vol: 1400, comp: "mid" },
          { t: "입주청소, 사다리차 따로 불러요?", tag: "청소업체", vol: 2100, comp: "mid" },
        ],
      },
    ],
  },
];

// 모든 업종 이미지 — 미리 받아둬 선택 시 로딩 없이 즉시 표시
const ALL_IMGS = CATS.flatMap((c) => [c.img, ...(c.cards?.map((s) => s.img) ?? [])]).filter(Boolean) as string[];

// 업종 카드 — 이미지 위 좌측에 헤딩·설명·글감 오버레이(모든 화면 동일). 어두운 이미지는 흰 텍스트.
function OverlayCard({ img, heading, desc, topics, dark, imgClass, wide }: { img: string; heading: string; desc: string; topics: Topic[]; dark?: boolean; imgClass?: string; wide?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-[0_24px_60px_-22px_rgba(20,40,90,0.4)] ring-1 ring-black/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt={heading} className={`block w-full ${imgClass ?? ""}`} />
      {dark && <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent to-55%" />}
      <div className={`absolute inset-y-0 flex flex-col justify-center ${wide ? "inset-x-0 px-4 sm:px-6" : "left-0 w-[58%] px-4 sm:px-8 lg:px-10"}`}>
        <h3 className={`font-pretendard text-[15px] font-bold leading-tight tracking-tight sm:text-2xl lg:text-[30px] ${dark ? "text-white" : "text-neutral-900"}`}>{heading}</h3>
        <p className={`mt-1 min-h-[2.2em] text-[10.5px] font-medium leading-snug sm:mt-2.5 sm:min-h-[3.1em] sm:text-[15px] sm:leading-relaxed ${dark ? "text-white/85" : "text-neutral-600"}`}>{desc}</p>
        {/* w-fit 컨테이너 = 가장 긴 글감 기준 폭, 박스 w-full로 동일 사이즈. 칩은 좌상단 탭 */}
        <div className="mt-3 flex w-fit max-w-full flex-col gap-3 sm:mt-5 sm:gap-3.5">
          {topics.map((tp) => (
            <div
              key={tp.t}
              className="relative w-full rounded-2xl bg-white/95 px-4 pb-2.5 pt-3.5 shadow-[0_6px_18px_-12px_rgba(20,40,90,0.35)] ring-1 ring-black/[0.04] sm:px-5"
            >
              {/* 업종 칩 — 좌상단에 걸치는 탭, 텍스트 중앙정렬 */}
              {tp.tag && (
                <span className="absolute -left-2 -top-2.5 inline-flex items-center justify-center rounded-full bg-[#E8F1FE] px-2.5 py-1 text-[8.5px] font-bold leading-none text-[#1D75F7] shadow-sm sm:text-[10px]">{tp.tag}</span>
              )}
              {/* 글감 */}
              <p className="whitespace-nowrap text-left text-[10.5px] font-semibold leading-tight text-neutral-800 sm:text-[14.5px]">{tp.t}</p>
              {/* 검색량 막대 + 수치 + 경쟁도 점 (실제 키워드 데이터 느낌) */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="h-1 w-12 overflow-hidden rounded-full bg-neutral-200 sm:w-16">
                  <span className="block h-full rounded-full bg-[#1D75F7]" style={{ width: `${Math.min(100, Math.round((tp.vol / VOL_MAX) * 100))}%` }} />
                </span>
                <span className="whitespace-nowrap text-[8.5px] font-semibold text-neutral-500 sm:text-[10.5px]">월 {tp.vol.toLocaleString()}회</span>
                <span className="flex items-center gap-0.5 whitespace-nowrap text-[8.5px] font-medium text-neutral-400 sm:text-[10.5px]">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${COMP[tp.comp].dot}`} />
                  {COMP[tp.comp].label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Showcase({ sel, onSelect }: { sel: number | null; onSelect: (i: number) => void }) {
  const [shown, setShown] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);

  // 모든 업종 이미지 프리로드(즉시 표시)
  useEffect(() => {
    ALL_IMGS.forEach((src) => { const im = new window.Image(); im.src = src; });
  }, []);

  // 칩이 화면 중앙 띠에 들어오면 뽕뽕뽕 팝
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(true); return; }
    const el = chipsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: "-25% 0px -25% 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cat = sel === null ? null : CATS[sel];

  return (
    <>
      {/* [2] 업종 선택 — 큰 칩만 (풀페이지 컨트롤러가 스크롤 제어) */}
      <section data-page className="flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-white px-6 py-20">
        <Reveal className="text-center">
          <h2 className="font-pretendard text-[clamp(26px,6.4vw,44px)] font-bold leading-[1.18] tracking-[-0.02em]">
            어떤 업종에 종사하세요?
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-neutral-500 sm:text-lg">
            업종만 고르면, 그에 맞는 글감을 추천해드려요.
          </p>
        </Reveal>

        <div ref={chipsRef} className="mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-3 sm:gap-4">
          {CATS.map((c, i) => {
            const on = i === sel;
            return (
              <button
                key={c.label}
                onClick={() => onSelect(i)}
                style={{
                  transition: "transform 0.5s cubic-bezier(0.34,1.6,0.6,1), opacity 0.35s ease, background-color 0.2s, color 0.2s, box-shadow 0.2s",
                  transitionDelay: shown ? `${i * 110}ms` : "0ms",
                  transform: shown ? "scale(1)" : "scale(0.3)",
                  opacity: shown ? 1 : 0,
                }}
                className={`rounded-full px-8 py-5 text-lg font-bold active:scale-95 sm:px-10 sm:py-6 sm:text-xl ${
                  on ? "bg-[#1D75F7] text-white shadow-[0_12px_28px_-8px_rgba(29,117,247,0.6)]" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* [3] 선택 업종의 추천 글감 */}
      <section data-page className="flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-neutral-50/70 px-6 py-20">
        {cat ? (
          cat.cards ? (
            // 기타 — 같은 오버레이 카드 2장을 웹에선 가로(모바일 1열)
            <div key={sel} className="ateflo-soft-in mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              {cat.cards.map((c) => (
                <OverlayCard key={c.img} img={c.img} heading={c.heading} desc={c.desc} topics={c.topics} dark={c.dark ?? false} imgClass="h-[486.72px] object-cover object-top" wide />
              ))}
            </div>
          ) : cat.img ? (
            <div key={sel} className="ateflo-soft-in mx-auto w-full max-w-4xl">
              <OverlayCard img={cat.img} heading={cat.heading} desc={cat.desc} topics={cat.topics} dark={cat.dark ?? false} />
            </div>
          ) : (
            <div key={sel} className="ateflo-soft-in mx-auto w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-[0_24px_60px_-22px_rgba(20,40,90,0.4)] ring-1 ring-black/5">
              <h3 className="font-pretendard text-2xl font-bold tracking-tight text-neutral-900">{cat.heading}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-500">{cat.desc}</p>
            </div>
          )
        ) : (
          <p className="text-center text-[17px] font-medium text-neutral-300">위에서 업종을 골라보세요</p>
        )}
      </section>
    </>
  );
}
