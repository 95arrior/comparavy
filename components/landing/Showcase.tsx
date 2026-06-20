"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";

// 2~3섹션 — [2] 업종 칩(크게, 처음 선택X, 중앙 도달 시 뽕뽕뽕 팝) → 고르면 [3] 그 업종 이미지+설명+글감.
type MetaTone = "hot" | "now" | "local";
type Topic = { t: string; tag?: string; metaTone?: MetaTone };
type SubCard = { img: string; heading: string; desc: string; dark?: boolean; topics: Topic[] };

// 글감 하단 부제(그레이) — 수요/유형 표시
const META: Record<MetaTone, string> = {
  hot: "손님이 많이 찾아요",
  now: "지금 뜨는 키워드",
  local: "우리 동네 키워드",
};
type Cat = { label: string; heading: string; desc: string; img: string | null; cards?: SubCard[]; dark?: boolean; topics: Topic[] };
const CATS: Cat[] = [
  {
    label: "병원·약국",
    heading: "병원·약국",
    desc: "의료광고법에 어긋나지 않게, 환자가 찾는 글만 안전하게 써드려요.",
    img: "/cat-medical.png",
    topics: [
      { t: "오래된 아말감, 지금 바꿔야 할까?", tag: "치과", metaTone: "hot" },
      { t: "눈매교정, 풀리면 재수술 되나요?", tag: "성형외과", metaTone: "now" },
      { t: "위고비 끊으면 다시 찐다는데?", tag: "가정의학과", metaTone: "hot" },
    ],
  },
  {
    label: "교육·학원",
    heading: "교육·학원",
    desc: "우리 동·시 지역까지 잡아, 학부모가 검색하는 글로 써드려요.",
    img: "/cat-academy.png",
    dark: true, // 녹색 칠판 배경 → 흰 텍스트
    topics: [
      { t: "파닉스 뗐는데 왜 안 읽을까?", tag: "영어", metaTone: "hot" },
      { t: "초6, 선행보다 복습이 먼저?", tag: "수학", metaTone: "now" },
      { t: "잘하는 애들 노트, 뭐가 다를까?", tag: "학습법", metaTone: "hot" },
    ],
  },
  {
    label: "법률·세무",
    heading: "법률·세무",
    desc: "의뢰인이 왜 검색했는지 짚어, 상담으로 이어지는 글로 써드려요.",
    img: "/cat-legal.png",
    topics: [
      { t: "1인 사업자도 기장 맡겨야 할까?", tag: "세무", metaTone: "hot" },
      { t: "권리금 못 받으면 소송 되나요?", tag: "법률", metaTone: "now" },
      { t: "알바 주휴수당, 무조건 줘야 하나?", tag: "노무", metaTone: "hot" },
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
          { t: "오래된 집, 어디부터 고쳐야 돈 아껴?", tag: "인테리어", metaTone: "local" },
          { t: "줄눈 곰팡이, 덧방으로 가려도 돼?", tag: "타일", metaTone: "hot" },
          { t: "판넬 결로, 단열 더하면 잡히나요?", tag: "판넬", metaTone: "now" },
        ],
      },
      {
        img: "/cat-etc-2.png",
        heading: "모든 자영업자",
        desc: "동네 손님이 찾는 글까지.",
        topics: [
          { t: "노견 미용, 마취 없이 가능한가요?", tag: "애견미용", metaTone: "local" },
          { t: "장례식 화환, 당일 주문 되나요?", tag: "꽃집", metaTone: "hot" },
          { t: "입주청소, 사다리차 따로 불러요?", tag: "청소업체", metaTone: "local" },
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
                <span className="absolute -left-2 -top-2.5 inline-flex items-center justify-center rounded-full bg-[#8fd3ff] px-2.5 py-1 text-[8.5px] font-bold leading-none text-[#0a4da0] shadow-sm sm:text-[10px]">{tp.tag}</span>
              )}
              {/* 글감 */}
              <p className="whitespace-nowrap text-left text-[10.5px] font-semibold leading-tight text-neutral-800 sm:text-[14.5px]">{tp.t}</p>
              {/* 메타(그레이) — 글감 바로 아래 좁게 */}
              {tp.metaTone && <p className="mt-0.5 text-left text-[8.5px] font-medium leading-none text-neutral-400 sm:text-[11px]">{META[tp.metaTone]}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Showcase() {
  const [sel, setSel] = useState<number | null>(null); // 처음엔 아무것도 선택 안 함
  const [shown, setShown] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLElement>(null);
  const topicsRef = useRef<HTMLElement>(null);

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

  // 게이트 — 선택 전엔 이 섹션에서 스크롤을 '완전 freeze'(튕김 없음). 위로 가려 하면 풀어줌.
  useEffect(() => {
    if (sel !== null) return; // 선택되면 잠금 없음
    const el = gateRef.current;
    if (!el) return;
    let frozen = false;
    let armed = true; // 위로 탈출 후엔 충분히 벗어나기 전까지 재freeze 안 함
    const freeze = () => {
      if (frozen) return;
      frozen = true;
      // 정확히 게이트 상단에 맞춘 뒤 잠금(스냅 1회 → 이후 미동 없음)
      window.scrollTo(0, Math.round(el.getBoundingClientRect().top + window.scrollY));
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    };
    const unfreeze = () => {
      frozen = false;
      armed = false;
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
    const io = new IntersectionObserver(
      ([e]) => {
        const r = e.intersectionRatio;
        if (armed && r > 0.85) freeze();
        if (r < 0.5) armed = true; // 충분히 벗어나면 다시 무장
      },
      { threshold: [0, 0.25, 0.5, 0.75, 0.85, 1] },
    );
    io.observe(el);

    // 위(↑) 의도면 풀어서 히어로로 갈 수 있게
    const onWheel = (e: WheelEvent) => { if (frozen && e.deltaY < 0) unfreeze(); };
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => { if (frozen && (e.touches[0]?.clientY ?? 0) - startY > 0) unfreeze(); };
    const onKey = (e: KeyboardEvent) => { if (frozen && (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home")) unfreeze(); };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      io.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [sel]);

  const pick = (i: number) => {
    setSel(i);
    setTimeout(() => topicsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const cat = sel === null ? null : CATS[sel];

  return (
    <>
      {/* [2] 업종 선택 — 큰 칩만. 선택 전까지 아래 스크롤 게이트 */}
      <section ref={gateRef} className="flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-white px-6 py-20">
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
                onClick={() => pick(i)}
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
      <section ref={topicsRef} className="flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-neutral-50/70 px-6 py-20">
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
