"use client";

import { useEffect, useRef, useState } from "react";

// [3] 검색 심리 — 자동 시연: 카테고리(업종) 선택 → 추천 글감 칩이 펼쳐지며 3줄로 흐름(loop).
// 검색 엔진 오해 방지를 위해 검색창/타이핑 없음. 우리는 '글감'을 추천하는 서비스.

type Phase = "idle" | "spread" | "select" | "collapse" | "sub" | "strength" | "results";
type Kw = { t: string; ssak?: boolean };

// 실제 업종 카테고리(온보딩과 동일) + 숨고st 아이콘
const CATS: { v: string; label: string; icon: React.ReactNode }[] = [
  { v: "medical", label: "병의원", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></> },
  { v: "academy", label: "학원·교습소", icon: <><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" /></> },
  { v: "professional", label: "법률·세무·노무", icon: <><path d="M12 3v18" /><path d="M5 7h14" /><path d="M5 7 2.6 13a3 3 0 0 0 4.8 0L5 7z" /><path d="M19 7l-2.4 6a3 3 0 0 0 4.8 0L19 7z" /><path d="M8 21h8" /></> },
  { v: "general", label: "그 외 업종", icon: <><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" /></> },
];

// 병의원(치과) 글감 = 글 주제/제목. ssak = '싹 키워드'(파스텔 오로라). (의료법: 1위/최고/보장 X)
const ROW1: Kw[] = [
  { t: "임플란트 가격, 왜 병원마다 다를까?" }, { t: "임플란트 몇 개월 걸려요", ssak: true }, { t: "사랑니 꼭 빼야 할까?" }, { t: "스케일링 주기, 얼마나 자주?" },
];
const ROW2: Kw[] = [
  { t: "강남 치과 예약 전 알아두면 좋은 것", ssak: true }, { t: "집에서 치아 미백, 괜찮을까" }, { t: "사랑니 발치 후 얼마나 붓나요", ssak: true }, { t: "교정 기간 평균 얼마나 걸릴까" },
];
const ROW3: Kw[] = [
  { t: "어린이 첫 치과 방문, 언제가 좋을까" }, { t: "스케일링 너무 무서운데 안 아픈가요", ssak: true }, { t: "충치 초기 증상 셀프 체크법" }, { t: "신경치료, 많이 아플까?" },
];

function Chip({ item }: { item: Kw }) {
  return item.ssak ? (
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
    async function run() {
      if (running) return;
      running = true;
      // 펼침 → 병의원 선택(클릭+샤인) → 나머지 모이며 사라짐 → 치과 → 강점 → 글감(유지, 반복 X)
      setPhase("spread"); await sleep(1150); if (cancelled) return;
      setSelected("medical"); setPhase("select"); await sleep(1050); if (cancelled) return;
      setPhase("collapse"); await sleep(900); if (cancelled) return;
      setPhase("sub"); await sleep(850); if (cancelled) return;
      setPhase("strength"); await sleep(1150); if (cancelled) return;
      setPhase("results"); // 그대로 유지(마퀴는 CSS로 계속 흐름)
    }
    // 섹션이 화면 중앙 띠에 오면 시퀀스 시작
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) run(); }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); };
  }, []);

  const shown = phase !== "idle";
  const collapsed = phase === "collapse" || phase === "sub" || phase === "strength" || phase === "results";
  const showSub = phase === "sub" || phase === "strength" || phase === "results";
  const showStrength = phase === "strength" || phase === "results";

  return (
    <section ref={ref} className="overflow-x-hidden bg-neutral-50/60 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-pretendard text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          손님이 <span className="text-[#1D75F7]">무엇을, 왜</span> 검색하는지부터 찾아요
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base">
          검색 심리로, 손님이 진짜 찾는 글감을 뽑아드려요
        </p>
      </div>

      {/* 업종 카테고리 — 가운데에서 양쪽으로 펼쳐짐 → 병의원 선택(샤인) → 나머지 중앙으로 모이며 사라짐 */}
      <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center px-6">
        {CATS.map((c, idx) => {
          const center = (CATS.length - 1) / 2;
          const offset = (center - idx) * 30; // 펼침 전: 중앙 쪽으로 모여 있음
          const on = selected === c.v;
          const sel = on && (phase === "select" || phase === "collapse" || phase === "results");
          const gone = collapsed && !on; // 비선택은 모이며 사라짐
          return (
            <span
              key={c.v}
              className={`relative mx-1.5 inline-flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                sel ? "border-[#1D75F7] bg-[#1D75F7] text-white shadow-[0_8px_20px_-6px_rgba(29,117,247,0.45)]" : "border-neutral-200 bg-white text-neutral-500"
              } ${on && phase === "select" ? "ateflo-shine ateflo-tap" : ""}`}
              style={{
                transitionDelay: phase === "spread" ? `${Math.abs(center - idx) * 70}ms` : "0ms",
                transform: shown ? "translateX(0) scale(1)" : `translateX(${offset}px) scale(0.7)`,
                opacity: shown && !gone ? 1 : 0,
                maxWidth: gone ? 0 : 260,
                marginLeft: gone ? 0 : undefined,
                marginRight: gone ? 0 : undefined,
                paddingLeft: gone ? 0 : undefined,
                paddingRight: gone ? 0 : undefined,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
              {c.label}
            </span>
          );
        })}
      </div>

      {/* 세부(치과) + 강점(임플란트 맛집) — 병의원만 남은 뒤 순차 등장 */}
      <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 px-6 text-sm">
        <span className={`rounded-full bg-[#1D75F7]/10 px-3 py-1 font-medium text-[#1D75F7] transition-all duration-500 ${showSub ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"}`}>치과</span>
        <span className={`text-neutral-400 transition-all duration-500 ${showStrength ? "opacity-100" : "opacity-0"}`}>강점 <b className="font-semibold text-neutral-700">‘임플란트 맛집’</b></span>
      </div>

      {/* 추천 글감 — 3줄로 흐름(등장 후 그대로 유지) */}
      <div className={`mt-10 space-y-3 transition-opacity duration-700 ${phase === "results" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <Marquee items={ROW1} dir="right" speed={40} />
        <Marquee items={ROW2} dir="left" speed={36} />
        <Marquee items={ROW3} dir="right" speed={44} />
      </div>

      {/* 싹 키워드 안내 */}
      <p className={`mx-auto mt-7 max-w-md px-6 text-center text-[13px] leading-relaxed text-neutral-400 transition-opacity duration-700 ${phase === "results" ? "opacity-100" : "opacity-0"}`}>
        보라색으로 빛나는 건 <b className="font-semibold text-[#8b5cf6]">‘싹 키워드’</b>예요.<br className="hidden sm:block" />
        아직 경쟁이 적어서, 먼저 쓰면 유리해요.
      </p>
    </section>
  );
}
