"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import TopicCard from "@/components/TopicCard";

// 2~3섹션 — [2] 업종 칩(크게, 처음 선택X, 중앙 도달 시 뽕뽕뽕 팝) → 고르면 [3] 그 업종 이미지+설명+글감.
type Comp = "low" | "mid" | "high";
type Topic = { t: string; tag?: string; vol: number; comp: Comp };
type SubCard = { img: string; heading: string; desc: string; dark?: boolean; topics: Topic[] };

// 경쟁 상태 → 감정 표현(숫자 대신 빈자리 메타포)
const EMOTION: Record<Comp, string> = {
  low: "아직 아무도 안 썼어요",
  mid: "지금 선점하기 좋아요",
  high: "이미 붐벼요",
};
// 선점 점수 — 경쟁 낮을수록·검색 많을수록 ↑ (검색↔경쟁 갭이 핵심). 우리가 분석을 끝내줌.
const sakScore = (vol: number, comp: Comp) => {
  const c = comp === "low" ? 1 : comp === "mid" ? 0.55 : 0.25;
  return Math.round((c * 0.7 + Math.min(1, vol / 2500) * 0.3) * 100);
};
// img=웹(가로), imgM=모바일(기타와 동일한 세로 카드). imgM 있으면 모바일에서 그걸로.
type Cat = { label: string; heading: string; desc: string; img: string | null; imgM?: string; cards?: SubCard[]; dark?: boolean; topics: Topic[] };
const CATS: Cat[] = [
  {
    label: "병원·약국",
    heading: "병원·약국",
    desc: "의료광고법에 어긋나지 않게, 환자가 찾는 글만 안전하게 써드려요.",
    img: "/cat-medical.png",
    imgM: "/cat-medical-m.png",
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
    imgM: "/cat-academy-m.png",
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
    imgM: "/cat-legal-m.png",
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
        img: "/cat-etc-2.png",
        heading: "모든 자영업자",
        desc: "동네 손님이 찾는 글까지.",
        topics: [
          { t: "노견 미용, 마취 없이 가능한가요?", tag: "애견미용", vol: 520, comp: "low" },
          { t: "장례식 화환, 당일 주문 되나요?", tag: "꽃집", vol: 1400, comp: "mid" },
          { t: "입주청소, 사다리차 따로 불러요?", tag: "청소업체", vol: 2100, comp: "mid" },
        ],
      },
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
    ],
  },
];

// 모든 업종 이미지 — 미리 받아둬 선택 시 로딩 없이 즉시 표시
const ALL_IMGS = CATS.flatMap((c) => [c.img, c.imgM, ...(c.cards?.map((s) => s.img) ?? [])]).filter(Boolean) as string[];

// 업종 카드 — 이미지 위 좌측에 오버레이. mode=intro: 설명+'추천 글감 보기' 버튼만(인지부하↓).
// mode=detail: '매일 이런 글감을 추천해드려요' + 글감 리스트. 어두운 이미지는 흰 텍스트.
function OverlayCard({ img, heading, desc, topics, dark, imgClass, wide, revealed = true, mode = "detail", onDetail }: { img: string; heading: string; desc: string; topics: Topic[]; dark?: boolean; imgClass?: string; wide?: boolean; revealed?: boolean; mode?: "intro" | "detail"; onDetail?: () => void }) {
  const intro = mode === "intro";
  return (
    // 그림자 없음(캐러셀 클립). intro면 카드 전체 클릭 → 글감으로(자세히 버튼 외 이미지도)
    <div onClick={intro ? onDetail : undefined} className={`relative overflow-hidden rounded-3xl ring-1 ring-black/5 ${intro ? "cursor-pointer" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img onError={(e) => { e.currentTarget.style.display = "none"; }} src={img} alt={heading} className={`block w-full ${imgClass ?? ""}`} />
      {dark && <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent to-55%" />}
      <div className={`absolute inset-y-0 flex flex-col ${wide ? "inset-x-0 max-w-[66%] justify-start px-4 pt-7 sm:max-w-none sm:px-6 sm:pt-9" : "left-0 w-[58%] justify-center px-4 sm:px-8 lg:px-10"}`}>
        <h3 className={`font-pretendard text-[17px] font-bold leading-tight tracking-tight sm:text-2xl lg:text-[30px] ${dark ? "text-white" : "text-neutral-900"}`}>{heading}</h3>

        {intro ? (
          <>
            <p className={`mt-2 text-[12px] font-medium leading-snug sm:mt-2.5 sm:text-[15px] sm:leading-relaxed ${dark ? "text-white/85" : "text-neutral-600"}`}>{desc}</p>
            <span
              className={`mt-2.5 inline-flex w-fit items-center gap-0.5 text-[11px] font-semibold leading-none underline-offset-2 sm:mt-3 sm:text-[13px] ${dark ? "text-white/85" : "text-neutral-500"}`}
            >
              <span className="leading-none">자세히</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="relative top-px shrink-0"><path d="M9 6l6 6-6 6" /></svg>
            </span>
          </>
        ) : (
          <>
            <p className={`mt-1.5 text-[9px] font-bold uppercase tracking-wide sm:mt-2 sm:text-[11px] ${dark ? "text-white/80" : "text-[#1D75F7]"}`}>매일 이런 글감을 추천해드려요</p>
            {/* w-fit 컨테이너 = 가장 긴 글감 기준 폭, 박스 w-full로 동일 사이즈. 칩은 좌상단 탭 */}
            <div className="mt-2.5 flex w-fit max-w-full flex-col gap-3 sm:mt-3.5 sm:gap-3.5">
              {topics.map((tp, idx) => {
            const isSak = tp.comp === "low";
            const filled = Math.max(1, Math.min(5, Math.round(sakScore(tp.vol, tp.comp) / 20)));
            const stars = "★".repeat(filled) + "☆".repeat(5 - filled);
            return (
              <div
                key={tp.t}
                style={{
                  transition: "opacity 0.45s ease, transform 0.45s cubic-bezier(0.34,1.45,0.6,1)",
                  transitionDelay: revealed ? `${idx * 90}ms` : "0ms",
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? "translateY(0) scale(1)" : "translateY(10px) scale(0.96)",
                }}
                className={`relative w-full rounded-2xl px-4 pb-2.5 pt-3.5 ring-1 sm:px-5 ${
                  isSak ? "shadow-[0_5px_14px_-9px_rgba(139,92,246,0.3)] ring-violet-300/70" : "bg-white/95 shadow-[0_6px_18px_-12px_rgba(20,40,90,0.35)] ring-black/[0.04]"
                }`}
              >
                {/* 싹 오로라 배경(안쪽 레이어 — 카드는 안 자름) */}
                {isSak && <div className="ateflo-chip-aurora pointer-events-none absolute inset-0 rounded-2xl" />}
                {/* 업종 탭(좌상단) */}
                {tp.tag && (
                  <span className="absolute -left-2 -top-2.5 inline-flex items-center justify-center rounded-full bg-[#E8F1FE] px-2.5 py-1 text-[8.5px] font-bold leading-none text-[#1D75F7] shadow-sm sm:text-[10px]">{tp.tag}</span>
                )}
                {/* 싹 키워드 뱃지(우상단) */}
                {isSak && (
                  <span className="absolute -right-1.5 -top-2.5 inline-flex items-center gap-0.5 rounded-full bg-violet-600 px-2 py-1 text-[8px] font-bold leading-none text-white shadow-sm sm:text-[9.5px]">✦ 싹 키워드</span>
                )}
                {/* 글감 */}
                <p className="relative whitespace-nowrap text-left text-[10.5px] font-semibold leading-tight text-neutral-800 sm:text-[14.5px]">{tp.t}</p>
                {/* 검색량(명확) + 선점 별점 + 감정 */}
                <div className="relative mt-1.5 space-y-0.5">
                  <div className="flex items-center gap-1 whitespace-nowrap text-[8.5px] font-semibold text-neutral-500 sm:text-[10.5px]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0 opacity-70"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                    한 달 검색 {tp.vol.toLocaleString()}회
                  </div>
                  <div className="flex items-center gap-1 whitespace-nowrap text-[8.5px] sm:text-[10.5px]">
                    <span className="font-medium text-neutral-500">선점 기회</span>
                    <span className="font-bold tracking-[-1px] text-amber-500">{stars}</span>
                    <span className="text-neutral-300">·</span>
                    <span className={`font-semibold ${isSak ? "text-violet-700" : "text-neutral-400"}`}>{EMOTION[tp.comp]}</span>
                  </div>
                </div>
              </div>
            );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 기타 소개(A) — 카드 2장(그 외 다양한 업종 + 모든 자영업자)을 같이 노출.
// 웹은 가로 2열, 모바일은 가로 스와이프(한 장씩) + 하단 닷. 각 카드에 '자세히'.
function EtcCards({ cards, onDetail, onActive }: { cards: SubCard[]; onDetail: (i: number) => void; onActive: (i: number) => void }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const a = Math.round(el.scrollLeft / el.clientWidth);
    setActive(a);
    onActive(a); // 스와이프로 글감 펼칠 때 어느 카드인지 부모가 알게
  };

  return (
    <div className="ateflo-soft-in mx-auto w-full max-w-5xl">
      {/* 모바일 — 한 장씩 가로 스와이프 */}
      <div className="sm:hidden">
        <div ref={trackRef} onScroll={onScroll} data-hscroll className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
          {cards.map((c, i) => (
            <div key={c.img} className="w-full shrink-0 snap-center px-1">
              <OverlayCard img={c.img} heading={c.heading} desc={c.desc} topics={[]} mode="intro" onDetail={() => onDetail(i)} dark={c.dark ?? false} imgClass="h-[64svh] min-h-[420px] max-h-[486px] object-cover object-top" wide />
            </div>
          ))}
        </div>
        {/* 닷 — '넘길 수 있다'는 신호 + 현재 위치 */}
        <div className="mt-5 flex justify-center gap-2">
          {cards.map((c, i) => (
            <button
              key={c.img}
              onClick={() => goTo(i)}
              aria-label={`${i + 1}번째 카드 보기`}
              className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-6 tk-grad-cta" : "w-2 bg-neutral-300"}`}
            />
          ))}
        </div>
      </div>

      {/* 웹 — 가로 2열 그대로 */}
      <div className="hidden gap-5 sm:grid sm:grid-cols-2">
        {cards.map((c, i) => (
          <OverlayCard key={c.img} img={c.img} heading={c.heading} desc={c.desc} topics={[]} mode="intro" onDetail={() => onDetail(i)} dark={c.dark ?? false} imgClass="h-[486.72px] object-cover object-top" wide />
        ))}
      </div>
    </div>
  );
}

// 글감(B) — '매일 이런 글감을 추천드려요' + 큰 글감 카드 리스트(공유 TopicCard, 이미지 없음).
function TopicList({ heading, topics, revealed }: { heading: string; topics: Topic[]; revealed: boolean }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <h3 className="text-center font-pretendard text-[22px] font-bold tracking-tight text-neutral-900 sm:text-[28px]">매일 이런 글감을 추천드려요</h3>
      <p className="mt-1.5 text-center text-[13px] font-semibold text-[#1D75F7] sm:text-[15px]">{heading}</p>
      <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:gap-3.5">
        {topics.map((tp, i) => (
          <TopicCard key={tp.t} title={tp.t} tag={tp.tag} vol={tp.vol} comp={tp.comp} idx={i} revealed={revealed} />
        ))}
      </div>
      {topics.some((t) => t.comp === "low") && (
        <p className="mt-4 text-center text-[11px] leading-relaxed text-neutral-400 sm:text-[12px]">
          <span className="font-bold text-violet-600">✦ 싹 키워드</span> = 아직 경쟁이 적어, 지금 선점하기 좋은 키워드예요
        </p>
      )}
    </div>
  );
}

export default function Showcase({ sel, onSelect, detail, detailCard, onDetail, onBack, onEtcActive }: { sel: number | null; onSelect: (i: number) => void; detail: boolean; detailCard: number; onDetail: (card?: number) => void; onBack: () => void; onEtcActive: (i: number) => void }) {
  const [shown, setShown] = useState(false);
  const [topicsShown, setTopicsShown] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);
  const topicsSecRef = useRef<HTMLElement>(null);

  // 모든 업종 이미지 프리로드(즉시 표시)
  useEffect(() => {
    ALL_IMGS.forEach((src) => { const im = new window.Image(); im.src = src; });
  }, []);

  // 칩이 화면 중앙 띠에 들어올 때마다 뽕뽕뽕 팝(나갈 땐 리셋 → 다시 슬라이드하면 재생)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(true); return; }
    const el = chipsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShown(e.isIntersecting), { rootMargin: "-20% 0px -20% 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 글감 섹션 들어올 때마다 글감 박스 순차 등장(나갈 땐 리셋)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTopicsShown(true); return; }
    const el = topicsSecRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopicsShown(e.isIntersecting), { rootMargin: "-20% 0px -20% 0px", threshold: 0 });
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
                  on ? "tk-grad-cta text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* [3] 선택 업종 — 소개(A) → '추천 글감 보기' → 글감(B) */}
      <section ref={topicsSecRef} data-page className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-neutral-50/70 px-6 pt-20 pb-28 sm:pb-20">
        {/* 뒤로 — 글감(B)에서만(위로 스와이프해도 닫힘) */}
        {cat && detail && (
          <button
            onClick={onBack}
            className="absolute left-5 top-[calc(env(safe-area-inset-top)+1.25rem)] z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-3.5 py-2 text-[13px] font-bold text-neutral-700 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:bg-white active:scale-95 sm:left-8"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            뒤로
          </button>
        )}
        {cat ? (
          <div key={`${sel}-${detail ? "d" : "i"}`} className="ateflo-soft-in mx-auto w-full">
            {!detail ? (
              // A 소개 — 이미지 + 설명 + '자세히'. 기타는 2장(그 외 다양한 업종 + 모든 자영업자) 같이.
              cat.cards ? (
                <EtcCards cards={cat.cards} onDetail={onDetail} onActive={onEtcActive} />
              ) : cat.img ? (
                <div className="mx-auto w-full max-w-4xl">
                  {/* 모바일 — 기타와 동일한 세로 카드(-m 이미지) */}
                  {cat.imgM && (
                    <div className="sm:hidden">
                      <OverlayCard img={cat.imgM} heading={cat.heading} desc={cat.desc} topics={[]} dark={cat.dark ?? false} mode="intro" onDetail={onDetail} imgClass="h-[64svh] min-h-[420px] max-h-[486px] object-cover object-top" wide />
                    </div>
                  )}
                  {/* 웹 — 기존 가로 카드 */}
                  <div className={cat.imgM ? "hidden sm:block" : ""}>
                    <OverlayCard img={cat.img} heading={cat.heading} desc={cat.desc} topics={[]} dark={cat.dark ?? false} mode="intro" onDetail={onDetail} />
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-[0_24px_60px_-22px_rgba(20,40,90,0.4)] ring-1 ring-black/5">
                  <h3 className="font-pretendard text-2xl font-bold tracking-tight text-neutral-900">{cat.heading}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-neutral-500">{cat.desc}</p>
                  <button onClick={() => onDetail()} className="mt-5 inline-flex items-center gap-1 rounded-full tk-grad-cta px-4 py-2.5 text-[13px] font-bold text-white active:scale-95">추천 글감 보기</button>
                </div>
              )
            ) : (
              // B 글감 — 큰 글감 카드 3개. 기타는 '자세히' 누른 그 카드의 글감만(합치지·캐러셀 없음).
              cat.cards ? (
                <TopicList heading={(cat.cards[detailCard] ?? cat.cards[0]).heading} topics={(cat.cards[detailCard] ?? cat.cards[0]).topics} revealed={topicsShown} />
              ) : (
                <TopicList heading={cat.heading} topics={cat.topics} revealed={topicsShown} />
              )
            )}
          </div>
        ) : (
          <p className="text-center text-[17px] font-medium text-neutral-300">위에서 업종을 골라보세요</p>
        )}
      </section>
    </>
  );
}
