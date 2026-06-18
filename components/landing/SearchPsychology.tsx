"use client";

import { useEffect, useRef, useState } from "react";

// [3] 검색 심리 — 자동 시연: 카테고리(업종) 선택 → 추천 글감 칩이 펼쳐지며 3줄로 흐름(loop).
// 검색 엔진 오해 방지를 위해 검색창/타이핑 없음. 우리는 '글감'을 추천하는 서비스.

type Phase = "idle" | "category" | "results";
type Kw = { t: string; golden?: boolean };

// 실제 업종 카테고리(온보딩과 동일) + 숨고st 아이콘
const CATS: { v: string; label: string; icon: React.ReactNode }[] = [
  { v: "medical", label: "병의원", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></> },
  { v: "academy", label: "학원·교습소", icon: <><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" /></> },
  { v: "professional", label: "법률·세무·노무", icon: <><path d="M12 3v18" /><path d="M5 7h14" /><path d="M5 7 2.6 13a3 3 0 0 0 4.8 0L5 7z" /><path d="M19 7l-2.4 6a3 3 0 0 0 4.8 0L19 7z" /><path d="M8 21h8" /></> },
  { v: "general", label: "그 외 업종", icon: <><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" /></> },
];

// 병의원(치과) 글감 = 글 주제/제목. golden = 강남 지역 기반 글감(오로라). (의료법: 1위/최고/보장 X)
const ROW1: Kw[] = [
  { t: "임플란트 가격, 왜 병원마다 다를까?" }, { t: "강남에서 임플란트 알아보는 법", golden: true }, { t: "사랑니 꼭 빼야 할까?" }, { t: "스케일링 주기, 얼마나 자주?" },
];
const ROW2: Kw[] = [
  { t: "강남 치과 고를 때 체크리스트", golden: true }, { t: "집에서 치아 미백, 괜찮을까" }, { t: "강남역 직장인 점심 스케일링", golden: true }, { t: "교정 기간 평균 얼마나 걸릴까" },
];
const ROW3: Kw[] = [
  { t: "어린이 첫 치과 방문, 언제가 좋을까" }, { t: "강남 치과 비용 미리 알아두기", golden: true }, { t: "충치 초기 증상 셀프 체크법" }, { t: "신경치료, 많이 아플까?" },
];

function Chip({ item }: { item: Kw }) {
  return item.golden ? (
    <span className="ateflo-chip-aurora mx-1.5 inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-[#3f3a6b] shadow-sm ring-1 ring-white/50">
      {item.t}
    </span>
  ) : (
    <span className="mx-1.5 inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-500 ring-1 ring-black/[0.03]">
      {item.t}
    </span>
  );
}

function Marquee({ items, dir, speed }: { items: Kw[]; dir: "left" | "right"; speed: number }) {
  return (
    <div
      className="overflow-hidden"
      style={{ maskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)" }}
    >
      {/* 4배 복제 → 반복 단위(2세트)가 화면보다 넓어 -50% 지점에 빈 공간 없음 = 끊김 없는 무한 흐름 */}
      <div className={`ateflo-mq ${dir === "left" ? "ateflo-mq-left" : "ateflo-mq-right"}`} style={{ animationDuration: `${speed}s` }}>
        {[...items, ...items, ...items, ...items].map((it, i) => <Chip key={i} item={it} />)}
      </div>
    </div>
  );
}

export default function SearchPsychology() {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let running = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    async function runLoop() {
      if (running) return;
      running = true;
      // 카테고리 등장 → 병의원 선택 → 글감 칩 펼쳐짐 → 반복
      while (!cancelled) {
        setSelected(null); setPhase("category");
        await sleep(950); if (cancelled) return;
        setSelected("medical"); await sleep(900); if (cancelled) return;
        setPhase("results"); await sleep(7000); if (cancelled) return;
      }
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) runLoop(); }, { threshold: 0.12 });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); };
  }, []);

  const showCats = phase !== "idle";

  return (
    <section ref={ref} className="overflow-x-hidden bg-neutral-50/60 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-pretendard text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          손님이 무엇을, 왜 검색하는지부터 찾아요
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base">
          검색 심리로, 손님이 진짜 찾는 글감을 뽑아드려요
        </p>
      </div>

      {/* 업종 카테고리 (아이콘 + 텍스트) — 가운데에서 양쪽으로 펼쳐지며 등장, 선택 시 무지개 테두리 한 바퀴 */}
      <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-2.5 px-6">
        {CATS.map((c, idx) => {
          const on = selected === c.v;
          const dist = Math.abs(idx - (CATS.length - 1) / 2); // 중앙에서의 거리(펼침 스태거)
          return (
            <span
              key={c.v}
              className={`relative inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors duration-300 ${showCats ? "ateflo-cat-pop" : "opacity-0"} ${
                on ? "ateflo-ring-sweep border-[#1D75F7] bg-[#1D75F7] text-white shadow-[0_8px_20px_-6px_rgba(29,117,247,0.45)]" : "border-neutral-200 bg-white text-neutral-500"
              }`}
              style={showCats ? { animationDelay: `${dist * 90}ms` } : undefined}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
              {c.label}
            </span>
          );
        })}
      </div>

      {/* 추천 글감 — 칩이 펼쳐지며 3줄로 흐름 */}
      <div className={`mt-12 space-y-3 transition-all duration-700 ${phase === "results" ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <Marquee items={ROW1} dir="right" speed={40} />
        <Marquee items={ROW2} dir="left" speed={36} />
        <Marquee items={ROW3} dir="right" speed={44} />
      </div>
    </section>
  );
}
