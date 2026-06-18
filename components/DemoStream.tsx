"use client";

import { useEffect, useRef, useState } from "react";

// 홈 데모: 키워드 → 정보 글(중간에 이미지 삽입) → 자연스러운 가게 연결 → 업체 박스(NAP+지도)까지.
// 한 편이 써지는 전 과정을 시퀀스로 연출(API 0). 예시 업체=에이트플로 영어학원(가상).

type Block = { tag: "title" | "h3" | "p" | "promo" | "image"; text?: string };

const BLOCKS: Block[] = [
  { tag: "title", text: "초등 영어, 파닉스부터 시작해야 하는 이유" },
  { tag: "p", text: "알파벳은 외웠는데 단어를 못 읽는다면, 소리 규칙(파닉스)을 건너뛴 경우가 많아요. 읽기의 토대가 흔들리면 그 위에 단어를 아무리 쌓아도 무너집니다." },
  { tag: "h3", text: "집에서 파닉스, 이렇게 시작하세요" },
  { tag: "image" },
  { tag: "p", text: "하루 10분, 같은 소리로 시작하는 단어를 묶어 읽어 보세요. 'cat·cap·can'처럼요. 완벽한 발음보다 '소리와 글자를 연결하는 경험'이 먼저예요." },
  { tag: "promo", text: "다만 아이마다 막히는 지점이 달라, 혼자선 어디서 헷갈리는지 찾기 어려울 수 있어요. 기초를 단계별로 잡아줄 곳이 필요하다면 에이트플로 영어학원처럼 파닉스부터 차근차근 봐주는 학원의 도움을 받아 보는 것도 방법이에요." },
];

function MapPin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#1D75F7" stroke="#fff" strokeWidth="1.4">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" fill="#fff" stroke="none" />
    </svg>
  );
}

export default function DemoStream() {
  const [typed, setTyped] = useState<string[]>([]);
  const [imgStage, setImgStage] = useState<"none" | "btn" | "shown">("none");
  const [showBox, setShowBox] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const follow = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; };
    const slowScroll = () => {
      const el = scrollRef.current; if (!el) return;
      const start = el.scrollTop, end = el.scrollHeight - el.clientHeight, dist = end - start;
      if (dist <= 0) return;
      let t0 = 0;
      const step = (t: number) => {
        if (cancelled) return;
        if (!t0) t0 = t;
        const p = Math.min(1, (t - t0) / 850);
        el.scrollTop = start + dist * (1 - Math.pow(1 - p, 3));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    async function typeBlock(idx: number, text: string) {
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return;
        setTyped((p) => { const c = [...p]; c[idx] = text.slice(0, i); return c; });
        follow();
        await sleep(22);
      }
    }
    async function run() {
      while (!cancelled) {
        setTyped([]); setImgStage("none"); setShowBox(false);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        await sleep(500);
        for (let idx = 0; idx < BLOCKS.length && !cancelled; idx++) {
          const b = BLOCKS[idx];
          if (b.tag === "image") {
            setImgStage("btn"); follow(); await sleep(700);     // 이미지 추가 버튼 등장
            setImgStage("shown"); await sleep(40); follow(); await sleep(550); // 클릭 → 이미지 삽입
          } else {
            await typeBlock(idx, b.text!);
            await sleep(b.tag === "title" ? 240 : b.tag === "h3" ? 180 : 120);
          }
        }
        if (cancelled) return;
        await sleep(1500);            // 글(마무리) 다 써진 뒤 1.5초
        setShowBox(true);             // 업체 박스 + 지도 등장
        await sleep(160);             // DOM 렌더 대기(렌더 전 스크롤하면 지도까지 못 내려감)
        if (cancelled) return;
        slowScroll();                 // 현재(글 바닥) → 지도까지 천천히 스크롤
        await sleep(4600);
      }
    }
    run();
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, []);

  const cursor = <span className="ml-0.5 inline-block animate-pulse text-neutral-400">▍</span>;
  const isActive = (idx: number) => typed[idx] !== undefined && typed[idx].length < (BLOCKS[idx].text?.length ?? 0);

  return (
    <div className="mx-auto w-full max-w-xl text-left">
      <div className="mb-2 text-xs font-medium text-neutral-400">키워드 “초등 영어” 하나로, 이렇게 써져요</div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={(e) => setScrolled((e.target as HTMLDivElement).scrollTop > 6)}
          className="ateflo-demo-scroll h-[360px] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6"
        >
          {typed.length === 0 && imgStage === "none" && <p className="text-sm text-neutral-300">글을 구상하고 있어요…</p>}

          {BLOCKS.map((b, idx) => {
            if (b.tag === "image") {
              if (imgStage === "none") return null;
              if (imgStage === "btn")
                return (
                  <button key={idx} className="ateflo-pop mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-[#1D75F7]/50 bg-[#1D75F7]/[0.04] px-3 py-2 text-[13px] font-medium text-[#1D75F7]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                    이미지 추가
                  </button>
                );
              // shown — 샘플 이미지 삽입(파닉스 카드 일러스트)
              return (
                <div key={idx} className="ateflo-box-in mt-3 overflow-hidden rounded-xl border border-neutral-100 bg-gradient-to-br from-[#1D75F7]/[0.07] to-[#b69cff]/[0.07] p-4">
                  <div className="flex items-center justify-center gap-2">
                    {["cat", "cap", "can"].map((w) => (
                      <span key={w} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-neutral-800 shadow-sm">
                        <span className="text-[#1D75F7]">c</span>{w.slice(1)}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2.5 text-center text-[11px] text-neutral-400">같은 소리로 시작하는 단어 묶어 읽기</p>
                </div>
              );
            }
            const text = typed[idx];
            if (!text) return null;
            if (b.tag === "title") return <p key={idx} className="text-[15px] font-bold leading-snug text-neutral-900 sm:text-base">{text}{isActive(idx) && cursor}</p>;
            if (b.tag === "h3") return <h3 key={idx} className="mt-4 text-sm font-semibold text-neutral-900">{text}{isActive(idx) && cursor}</h3>;
            if (b.tag === "promo") return <p key={idx} className="mt-3 rounded-lg bg-[#1D75F7]/[0.06] px-3 py-2.5 text-[13px] leading-relaxed text-neutral-700">{text}{isActive(idx) && cursor}</p>;
            return <p key={idx} className="mt-2 text-[13px] leading-relaxed text-neutral-600">{text}{isActive(idx) && cursor}</p>;
          })}

          {/* 업체 정보 박스 — 글 끝 1.5초 뒤 자동 등장 */}
          {showBox && (
            <div className="ateflo-box-in mt-4 rounded-xl border border-[#E5E8EB] p-4">
              <p className="text-[15px] font-bold text-neutral-900">에이트플로 영어학원</p>
              <p className="mt-0.5 text-xs text-neutral-400">영어학원 · 초등~중등</p>
              <div className="mt-3 space-y-1.5 text-[13px] text-neutral-700">
                <p><span className="font-semibold">주소</span> 서울 강남구 테헤란로 123</p>
                <p><span className="font-semibold">전화</span> <span className="text-[#1D75F7]">02-1234-5678</span></p>
                <p><span className="font-semibold">영업시간</span> 평일 14:00–22:00 · 주말 휴무</p>
              </div>
              <div
                className="relative mt-3 flex h-24 items-center justify-center overflow-hidden rounded-lg border border-neutral-100"
                style={{
                  backgroundColor: "#f3f6fb",
                  backgroundImage:
                    "linear-gradient(0deg, rgba(29,117,247,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(29,117,247,0.06) 1px, transparent 1px), linear-gradient(120deg, rgba(29,117,247,0.10) 0 8px, transparent 8px 60px)",
                  backgroundSize: "26px 26px, 26px 26px, 200px 200px",
                }}
              >
                <span className="flex flex-col items-center" style={{ animation: "ateflo-load-mark 1.8s ease-in-out infinite" }}>
                  <MapPin />
                </span>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-medium text-neutral-600 shadow-sm">
                  에이트플로 영어학원
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 상단 페이드 — 스크롤됐을 때만 (글이 위로 올라가면 생김) */}
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-12 rounded-t-2xl bg-gradient-to-b from-white via-white/80 to-transparent transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`} />
      </div>

      <p className="mt-2.5 text-center text-xs leading-relaxed text-neutral-400">
        정보 글이 끝에서 자연스럽게 <span className="font-medium text-neutral-500">내 가게로 연결</span>되고, <span className="font-medium text-neutral-500">업체 정보·지도</span>까지 자동으로 붙어요
      </p>
    </div>
  );
}
