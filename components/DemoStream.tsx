"use client";

import { useEffect, useState } from "react";

// 홈 데모: 키워드 → 검색되는 정보 글 → 자연스러운 가게 연결 → 업체 정보 박스(NAP+지도)까지
// 한 번에 보여주는 '결정적 장면'. API 호출 0(정적 연출), 자동 루프. 예시 업체=에이트플로 영어학원(가상).

type Block = { tag: "title" | "h3" | "p" | "promo"; text: string };

const ARTICLE: Block[] = [
  { tag: "title", text: "초등 영어, 파닉스부터 시작해야 하는 이유" },
  { tag: "p", text: "알파벳은 외웠는데 단어를 못 읽는다면, 소리 규칙(파닉스)을 건너뛴 경우가 많아요. 읽기의 토대가 흔들리면 그 위에 단어를 아무리 쌓아도 무너집니다." },
  { tag: "h3", text: "집에서 파닉스, 이렇게 시작하세요" },
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
  const [n, setN] = useState(0);
  const [showBox, setShowBox] = useState(false);

  const total = ARTICLE.reduce((s, b) => s + b.text.length, 0);

  useEffect(() => {
    let cancelled = false;
    let t: ReturnType<typeof setTimeout>;
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      i += 1;
      setN(i);
      if (i < total) {
        t = setTimeout(tick, 24);
      } else {
        t = setTimeout(() => {
          if (cancelled) return;
          setShowBox(true); // 글 완성 → 업체 박스 등장
          t = setTimeout(() => {
            if (cancelled) return;
            setShowBox(false);
            setN(0);
            t = setTimeout(() => { if (!cancelled) { i = 0; tick(); } }, 450);
          }, 4600);
        }, 650);
      }
    };
    t = setTimeout(tick, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [total]);

  let remaining = n;
  const rendered = ARTICLE.map((b, idx) => {
    const shown = Math.max(0, Math.min(b.text.length, remaining));
    remaining -= b.text.length;
    return { idx, tag: b.tag, text: b.text.slice(0, shown), active: shown > 0 && shown < b.text.length, started: shown > 0 };
  }).filter((b) => b.started);

  const cursor = <span className="ml-0.5 inline-block animate-pulse text-neutral-400">▍</span>;

  return (
    <div className="mx-auto w-full max-w-xl text-left">
      <div className="mb-2 text-xs font-medium text-neutral-400">키워드 “초등 영어” 하나로, 이렇게 써져요</div>

      <div className="min-h-[460px] rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        {rendered.length === 0 && <p className="text-sm text-neutral-300">글을 구상하고 있어요…</p>}

        {rendered.map((b) => {
          if (b.tag === "title")
            return <p key={b.idx} className="text-[15px] font-bold leading-snug text-neutral-900 sm:text-base">{b.text}{b.active && cursor}</p>;
          if (b.tag === "h3")
            return <h3 key={b.idx} className="mt-4 text-sm font-semibold text-neutral-900">{b.text}{b.active && cursor}</h3>;
          if (b.tag === "promo")
            return (
              <p key={b.idx} className="mt-3 rounded-lg bg-[#1D75F7]/[0.06] px-3 py-2.5 text-[13px] leading-relaxed text-neutral-700">
                {b.text}{b.active && cursor}
              </p>
            );
          return <p key={b.idx} className="mt-2 text-[13px] leading-relaxed text-neutral-600">{b.text}{b.active && cursor}</p>;
        })}

        {/* 업체 정보 박스 — 글 끝나면 자동으로 딸려 나옴 (실제 발행물에 들어가는 NAP 카드) */}
        {showBox && (
          <div className="ateflo-reveal mt-4 rounded-xl border border-[#E5E8EB] p-4">
            <p className="text-[15px] font-bold text-neutral-900">에이트플로 영어학원</p>
            <p className="mt-0.5 text-xs text-neutral-400">영어학원 · 초등~중등</p>

            <div className="mt-3 space-y-1.5 text-[13px] text-neutral-700">
              <p><span className="font-semibold">주소</span> 서울 강남구 테헤란로 123</p>
              <p><span className="font-semibold">전화</span> <span className="text-[#1D75F7]">02-1234-5678</span></p>
              <p><span className="font-semibold">영업시간</span> 평일 14:00–22:00 · 주말 휴무</p>
            </div>

            {/* 지도 핀 (NAP 좌표 시각화) */}
            <div
              className="ateflo-rise relative mt-3 flex h-24 items-center justify-center overflow-hidden rounded-lg border border-neutral-100"
              style={{
                backgroundColor: "#f3f6fb",
                backgroundImage:
                  "linear-gradient(0deg, rgba(29,117,247,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(29,117,247,0.06) 1px, transparent 1px), linear-gradient(120deg, rgba(29,117,247,0.10) 0 8px, transparent 8px 60px)",
                backgroundSize: "26px 26px, 26px 26px, 200px 200px",
              }}
            >
              <span className="ateflo-load-mark flex flex-col items-center" style={{ animation: "ateflo-load-mark 1.8s ease-in-out infinite" }}>
                <MapPin />
              </span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-medium text-neutral-600 shadow-sm">
                에이트플로 영어학원
              </span>
            </div>
          </div>
        )}
      </div>

      <p className="mt-2.5 text-center text-xs leading-relaxed text-neutral-400">
        정보 글이 끝에서 자연스럽게 <span className="font-medium text-neutral-500">내 가게로 연결</span>되고, <span className="font-medium text-neutral-500">업체 정보·지도</span>까지 자동으로 붙어요
      </p>
    </div>
  );
}
