"use client";

import { useEffect, useRef, useState } from "react";

// [3] 검색 심리 — 애플st 자동 시연: 카테고리 선택 → 검색창 펼침 → 타이핑 → 검색 → 칩 마퀴 3줄.
// 사용자 인터랙션 없이 화면 중앙에 오면 1회 시연, 칩은 계속 흐름(loop).

type Phase = "idle" | "category" | "expand" | "typing" | "search" | "results";

const QUERY = "손님이 무엇을, 왜 검색하는지부터 찾아요";
const CATS = ["카페", "병원", "학원", "미용실"];

// 병원 + 지역 기반 정보성 키워드 (의료법: 1위/최고/보장 표현 X)
const ROW1 = ["임플란트 가격", "청주 임플란트", "사랑니 발치 후 주의사항", "스케일링 주기", "충치 초기 증상"];
const ROW2 = ["청주 치과 추천", "치아 미백 방법", "용암동 치과", "교정 치료 기간", "잇몸 붓는 이유"];
const ROW3 = ["어린이 치과 시기", "청주 치과", "임플란트 종류", "사랑니 꼭 빼야 하나", "신경치료 통증"];

function Stars({ sm }: { sm?: boolean }) {
  return (
    <span className="ml-1 inline-flex shrink-0">
      <span className={`ateflo-holo ateflo-twinkle leading-none ${sm ? "text-[0.7em]" : "text-[0.75em]"}`}>✦</span>
      <span className={`ateflo-holo ateflo-twinkle leading-none ${sm ? "text-[0.55em]" : "text-[0.58em]"}`} style={{ animationDelay: "0.5s" }}>✦</span>
    </span>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <span className="mx-1.5 inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[#1D75F7]/15 bg-[#1D75F7]/[0.05] px-4 py-2 text-sm font-medium text-[#1D75F7]">
      {text}
      <Stars />
    </span>
  );
}

function Marquee({ items, dir, speed }: { items: string[]; dir: "left" | "right"; speed: number }) {
  return (
    <div
      className="overflow-hidden"
      style={{ maskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)" }}
    >
      <div className={`ateflo-mq ${dir === "left" ? "ateflo-mq-left" : "ateflo-mq-right"}`} style={{ animationDuration: `${speed}s` }}>
        {[...items, ...items].map((t, i) => <Chip key={i} text={t} />)}
      </div>
    </div>
  );
}

export default function SearchPsychology() {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [selected, setSelected] = useState(false);
  const [typed, setTyped] = useState("");
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let running = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    async function runLoop() {
      if (running) return;
      running = true;
      // 타이핑 → 검색 → 칩 흐름 → 반복
      while (!cancelled) {
        setSelected(false); setTyped(""); setPressed(false); setPhase("category");
        await sleep(900); if (cancelled) return;
        setSelected(true); await sleep(800); if (cancelled) return;
        setPhase("expand"); await sleep(720); if (cancelled) return;
        setPhase("typing");
        for (let i = 1; i <= QUERY.length; i++) { if (cancelled) return; setTyped(QUERY.slice(0, i)); await sleep(46); }
        await sleep(420); if (cancelled) return;
        setPressed(true); setPhase("search"); await sleep(560); if (cancelled) return;
        setPhase("results");
        await sleep(6500); if (cancelled) return; // 칩 흐르는 모습 충분히 보여준 뒤 다시
      }
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) runLoop(); },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); };
  }, []);

  const expanded = phase === "expand" || phase === "typing" || phase === "search" || phase === "results";
  const showCats = phase !== "idle";

  return (
    <section ref={ref} className="overflow-x-hidden bg-neutral-50/60 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-pretendard text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          아무 글이나 검색되는 게 아니에요
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base">
          검색 심리로, 손님이 진짜 찾는 키워드부터 발굴해요
        </p>
      </div>

      {/* 카테고리 */}
      <div className={`mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-2 px-6 transition-opacity duration-500 ${showCats ? "opacity-100" : "opacity-0"}`}>
        {CATS.map((c) => {
          const on = c === "병원" && selected;
          return (
            <span
              key={c}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ${
                on ? "scale-105 border-[#1D75F7] bg-[#1D75F7] text-white shadow-[0_6px_18px_rgba(29,117,247,0.35)]" : "border-neutral-200 bg-white text-neutral-400"
              }`}
            >
              {c}
            </span>
          );
        })}
      </div>

      {/* 검색창 — 가운데에서 양쪽으로 펼쳐짐 */}
      <div className="mx-auto mt-6 flex max-w-xl justify-center px-6">
        <div
          className="w-full overflow-hidden transition-[max-width,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ maxWidth: expanded ? "100%" : 0, opacity: expanded ? 1 : 0 }}
        >
          <div className="flex items-center gap-2.5 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-neutral-300"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <span className="flex-1 overflow-hidden whitespace-nowrap text-left text-[15px] text-neutral-800">
              {typed}
              {phase === "typing" && <span className="ml-0.5 inline-block animate-pulse text-neutral-400">▍</span>}
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1D75F7] text-white transition-transform duration-200 ${pressed ? "scale-90" : "scale-100"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </span>
          </div>
        </div>
      </div>

      {/* 결과 — 칩 마퀴 3줄 */}
      <div className={`mt-12 space-y-3 transition-opacity duration-700 ${phase === "results" ? "opacity-100" : "opacity-0"}`}>
        <Marquee items={ROW1} dir="right" speed={38} />
        <Marquee items={ROW2} dir="left" speed={34} />
        <Marquee items={ROW3} dir="right" speed={42} />
      </div>
    </section>
  );
}
