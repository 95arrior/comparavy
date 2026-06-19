"use client";

import { useEffect, useRef, useState } from "react";

// 홈 데모: 키워드 → 정보 글(중간에 이미지 삽입) → 자연스러운 가게 연결 → 업체 박스(NAP+지도)까지.
// 한 편이 써지는 전 과정을 시퀀스로 연출(API 0). 예시 업체=에이트플로 영어학원(가상).

type Block = { tag: "title" | "h3" | "p" | "promo" | "image"; text?: string };

const BLOCKS: Block[] = [
  { tag: "title", text: "집에서 파닉스 시작할 때, 이 순서만 지키면 돼요" },
  { tag: "p", text: "파닉스를 영어 단어 외우기로 시작하면 아이가 금방 지쳐요. 소리부터예요. 알파벳 이름(에이·비·씨)이 아니라 소리(아·브·크)를 먼저 들려주세요." },
  { tag: "image" },
  { tag: "p", text: "하루 10분이면 충분해요. 같은 소리로 시작하는 단어를 묶어서 읽어보세요. cat·cap·can처럼요. 완벽한 발음보다 '소리와 글자가 연결되는 경험'이 먼저예요." },
  { tag: "promo", text: "다만 아이마다 막히는 지점이 달라요. 어떤 아이는 자음에서, 어떤 아이는 모음에서 헷갈리거든요. 혼자 잡기 어렵다면 이 시기를 옆에서 봐주는 곳의 도움을 받는 것도 방법이에요." },
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
  const [status, setStatus] = useState<"thinking" | "writing" | "image" | "done">("thinking");
  const [pad, setPad] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const follow = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; };
    const slowScroll = () => {
      const el = scrollRef.current; if (!el) return;
      const start = el.scrollTop, dist = (el.scrollHeight - el.clientHeight) - start;
      if (dist <= 0) return;
      let t0 = 0;
      const step = (t: number) => {
        if (cancelled) return;
        if (!t0) t0 = t;
        const p = Math.min(1, (t - t0) / 950);
        el.scrollTop = start + dist * (1 - Math.pow(1 - p, 3)); // easeOutCubic
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    async function typeBlock(idx: number, text: string, onProgress?: (i: number, len: number) => void) {
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return;
        setTyped((p) => { const c = [...p]; c[idx] = text.slice(0, i); return c; });
        follow();
        onProgress?.(i, text.length);
        await sleep(22);
      }
    }
    async function run() {
      while (!cancelled) {
        setTyped([]); setImgStage("none"); setShowBox(false); setStatus("thinking"); setPad(false);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        await sleep(900);
        for (let idx = 0; idx < BLOCKS.length && !cancelled; idx++) {
          const b = BLOCKS[idx];
          if (b.tag === "image") {
            setStatus("image");
            setImgStage("btn"); follow(); await sleep(700);     // 이미지 추가 버튼 등장
            setImgStage("shown"); await sleep(40); follow(); await sleep(700); // 클릭 → 이미지 삽입
          } else {
            setStatus("writing");
            await typeBlock(idx, b.text!);   // 타이핑하며 천천히 따라 올라감
            await sleep(b.tag === "title" ? 240 : b.tag === "h3" ? 180 : 120);
          }
        }
        if (cancelled) return;
        setStatus("done");
        // ★ 글 다 쓰면 → 하단 빈칸을 잠깐 보여주며 쓰윽 스크롤 → 그 자리에 박스+지도 부드럽게
        await sleep(400);
        setPad(true);                 // 하단 빈 공간
        await sleep(60); slowScroll(); // 빈칸 보이게 스크롤
        await sleep(750);             // 빈칸 잠깐 보여줌
        if (cancelled) return;
        setShowBox(true); setPad(false); // 빈칸 자리에 박스/지도 등장(soft-in)
        await sleep(180); slowScroll(); // 박스/지도까지 부드럽게
        await sleep(4400);
      }
    }
    run();
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, []);

  const cursor = <span className="ml-0.5 inline-block animate-pulse text-neutral-400">▍</span>;
  const isActive = (idx: number) => typed[idx] !== undefined && typed[idx].length < (BLOCKS[idx].text?.length ?? 0);

  return (
    <div className="mx-auto w-full max-w-xl text-left">
      {/* 상태 표시 — 우리 로고 + "생각/글쓰는 중" (GPT·클로드처럼) */}
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-neutral-500">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ateflo-mark.png?v=2"
          alt=""
          aria-hidden
          className="h-4 w-4 shrink-0"
          style={status === "done" ? undefined : { animation: "ateflo-load-mark 1.5s ease-in-out infinite" }}
        />
        <span>
          {status === "thinking" && "키워드 “초등 영어”를 보고 생각하고 있어요"}
          {status === "writing" && "글을 쓰고 있어요"}
          {status === "image" && "어울리는 이미지를 넣고 있어요"}
          {status === "done" && "완성됐어요 · 이렇게 써져요"}
        </span>
        {status !== "done" && <span className="ateflo-dots text-neutral-400">···</span>}
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={(e) => setScrolled((e.target as HTMLDivElement).scrollTop > 6)}
          className="ateflo-demo-scroll h-[50vh] min-h-[300px] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:h-[380px] sm:p-6"
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
              // shown — 실제 이미지 삽입
              return (
                <div key={idx} className="ateflo-soft-in mt-3 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo-class.png" alt="영어 수업 일러스트" className="mx-auto block max-h-[170px] w-full object-cover object-center" />
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

          {/* 빈칸 — 글 다 쓰고 박스 나오기 전, 잠깐 보여줄 공간 */}
          {pad && <div className="h-28" />}

          {/* 업체 정보 박스 — 빈칸 보여준 뒤 부드럽게 등장 */}
          {showBox && (
            <div className="ateflo-soft-in mt-4 rounded-xl border border-[#E5E8EB] p-4">
              <p className="text-[15px] font-bold text-neutral-900">에이트플로 영어학원</p>
              <p className="mt-0.5 text-xs text-neutral-400">영어학원 · 초등~중등</p>
              <div className="mt-3 space-y-1.5 text-[13px] text-neutral-700">
                <p><span className="font-semibold">주소</span> 서울 강남구 역삼동 000-00</p>
                <p><span className="font-semibold">전화</span> <span className="text-[#1D75F7]">070-8983-9559</span></p>
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
        정보 글에서 자연스럽게 <span className="font-medium text-neutral-500">가게 홍보글로 연결</span>. <span className="font-medium text-neutral-500">업체 정보·지도</span>까지 자동으로 붙어요
      </p>
    </div>
  );
}
