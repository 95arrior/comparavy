"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";

// 2~3섹션 — [2] 업종 칩(크게, 처음 선택X, 중앙 도달 시 뽕뽕뽕 팝) → 고르면 [3] 그 업종 이미지+설명+글감.
type Topic = { t: string; tag?: string };
type Cat = { label: string; desc: string; img: string | null; topics: Topic[] };
const CATS: Cat[] = [
  {
    label: "병원·약국",
    desc: "다양한 병원·의원의 진료·치료 정보부터 환자가 찾는 궁금증까지, 검색이 잘 되는 전문 글을 작성할 수 있어요!",
    img: "/cat-medical.png",
    topics: [
      { t: "임플란트, 왜 병원마다 가격이 다를까?", tag: "치과" },
      { t: "물광주사, 효과 얼마나 갈까?", tag: "성형외과" },
      { t: "다이어트 주사, 진짜 효과 있을까?", tag: "가정의학과" },
    ],
  },
  {
    label: "교육·학원",
    desc: "학원·교습소의 수업·입시 정보를, 학부모와 학생이 검색하는 전문 글로 작성할 수 있어요!",
    img: null,
    topics: [{ t: "초등 영어, 몇 살부터 시작할까" }, { t: "중등 수학 선행, 꼭 필요할까" }, { t: "집에서 집중력 높이는 습관" }],
  },
  {
    label: "법률·세무",
    desc: "법률·세무·노무 절차와 비용을, 의뢰인이 검색하는 신뢰감 있는 글로 작성할 수 있어요!",
    img: null,
    topics: [{ t: "종합소득세 신고, 처음이라면 이 순서" }, { t: "상속세 줄이는 기본 원칙" }, { t: "부당해고, 어떻게 대응할까" }],
  },
  {
    label: "기타",
    desc: "어떤 업종이든, 손님이 검색하는 주제로 검색이 잘 되는 전문 글을 작성할 수 있어요!",
    img: null,
    topics: [{ t: "우리 가게가 검색에 안 뜨는 이유" }, { t: "단골 만드는 후기 관리법" }, { t: "블로그 글, 며칠에 한 번이 좋을까" }],
  },
];

export default function Showcase() {
  const [sel, setSel] = useState<number | null>(null); // 처음엔 아무것도 선택 안 함
  const [shown, setShown] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLElement>(null);
  const topicsRef = useRef<HTMLElement>(null);

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
          (() => {
            // 타이틀+설명+글감 패널(좌측). 데스크탑=이미지 위 좌측 오버레이, 모바일=사진 아래.
            const panel = (
              <div className="flex flex-col">
                <h3 className="font-pretendard text-2xl font-bold tracking-tight text-neutral-900 sm:text-[30px]">{cat.label}</h3>
                <p className="mt-2.5 text-[13.5px] font-medium leading-relaxed text-neutral-600 sm:text-[15px]">{cat.desc}</p>
                <div className="mt-5 space-y-2.5">
                  {cat.topics.map((tp) => (
                    <div
                      key={tp.t}
                      className="flex items-center justify-between gap-2.5 rounded-2xl bg-white/95 px-4 py-3 shadow-[0_6px_18px_-12px_rgba(20,40,90,0.35)] ring-1 ring-black/[0.04] backdrop-blur-sm"
                    >
                      <span className="text-left text-[13.5px] font-medium text-neutral-800 sm:text-[14.5px]">{tp.t}</span>
                      {tp.tag && (
                        <span className="shrink-0 rounded-full bg-[#1D75F7]/10 px-2.5 py-1 text-[11.5px] font-bold text-[#1D75F7]">{tp.tag}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );

            if (!cat.img) {
              return (
                <div key={sel} className="ateflo-soft-in mx-auto w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_24px_60px_-22px_rgba(20,40,90,0.4)] ring-1 ring-black/5 sm:p-9">
                  {panel}
                </div>
              );
            }
            return (
              <div key={sel} className="ateflo-soft-in mx-auto w-full max-w-4xl">
                {/* 데스크탑 — 인물(우측) 그대로, 좌측 여백에만 패널 오버레이 */}
                <div className="relative hidden overflow-hidden rounded-3xl shadow-[0_24px_60px_-22px_rgba(20,40,90,0.4)] ring-1 ring-black/5 sm:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.img} alt={cat.label} className="block w-full" />
                  {/* 좌측만 화이트 그라데이션(우측 인물은 선명하게) */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/85 via-35% to-transparent to-60%" />
                  <div className="absolute inset-y-0 left-0 flex w-[52%] flex-col justify-center px-7 lg:px-10">
                    {panel}
                  </div>
                </div>
                {/* 모바일 — 사진(인물) 위, 내용 아래 */}
                <div className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-20px_rgba(20,40,90,0.35)] ring-1 ring-black/5 sm:hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.img} alt={cat.label} className="block w-full" />
                  <div className="p-6">{panel}</div>
                </div>
              </div>
            );
          })()
        ) : (
          <p className="text-center text-[17px] font-medium text-neutral-300">위에서 업종을 골라보세요</p>
        )}
      </section>
    </>
  );
}
