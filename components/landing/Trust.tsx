"use client";

import { useEffect, useRef, useState } from "react";

// [5] 신뢰 — "검색하면 이렇게 보여요". 설득 X, 증거(구글 검색결과 카드)만. 애플식 절제 모션.
type Card = { biz: string; title: string; preview: string; region: string };
const CARDS: Card[] = [
  {
    biz: "에이트플로 영어학원",
    title: "초등학교 여름방학, 흔한 실수와 알차게 보내는 법",
    preview: "방학 이틀이면 아이는 심심하다 하고, 부모는 계획 세웠잖아 하게 되죠. 흔한 실수만 피해도 여름이 달라져요.",
    region: "강남 · 영어학원",
  },
  {
    biz: "에이트플로 성형외과",
    title: "콧볼축소수술 비용과 부작용, 수술 전에 꼭 확인하세요",
    preview: "가장 먼저 드는 질문 두 가지, 비용과 부작용. 제대로 알고 가야 상담실에서 진짜 중요한 걸 놓치지 않아요.",
    region: "강남 · 성형외과",
  },
];

function toForm() {
  const input = document.getElementById("hero-email") as HTMLInputElement | null;
  if (input) {
    input.focus({ preventScroll: true });
    input.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export default function Trust() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(r);
    if (r) { setShown(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { rootMargin: "0px 0px -40% 0px", threshold: 0 }, // 섹션이 뷰포트 60% 진입 시
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="overflow-x-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
        <p className="text-sm font-semibold tracking-tight text-[#1D75F7]">에이트플로가 쓴 진짜 글</p>
        <h2 className="font-pretendard mt-3 text-2xl font-bold tracking-tight sm:text-[2rem]">검색하면, 이렇게 보여요</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base">
          사장님 블로그가 손님 눈에 닿는 순간이에요.
        </p>

        {/* 검색결과 카드 2개 */}
        <div className="mx-auto mt-12 grid gap-4 sm:grid-cols-2 sm:gap-6">
          {CARDS.map((c, i) => (
            <div
              key={c.biz}
              style={
                reduce
                  ? undefined
                  : {
                      transitionProperty: "opacity, transform",
                      transitionDuration: "0.7s",
                      transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                      transitionDelay: shown ? `${i * 120}ms` : "0ms",
                      opacity: shown ? 1 : 0,
                      transform: shown ? "translateY(0)" : "translateY(18px)",
                    }
              }
            >
              <div className="h-full rounded-2xl border border-[#EEEEEE] bg-white p-6 text-left shadow-none transition-all duration-300 hover:shadow-[0_18px_40px_-16px_rgba(20,40,90,0.18)] motion-safe:hover:-translate-y-1">
                {/* 출처(파비콘 + 업체명) */}
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 shrink-0 rounded-full bg-[#1D75F7]" />
                  <span className="truncate text-[13px] text-neutral-600">{c.biz}</span>
                </div>
                {/* 제목 (파란 링크 톤) */}
                <h3 className="mt-2.5 font-medium leading-snug text-[#1D75F7] text-[clamp(16px,4.4vw,18px)]">
                  {c.title}
                </h3>
                {/* 미리보기 2줄 고정 */}
                <p className="mt-2 text-[13px] leading-relaxed text-neutral-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                  {c.preview}
                </p>
                {/* 지역 라벨 */}
                <p className="mt-2.5 text-[12px] text-neutral-400">{c.region}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 캡션 + CTA */}
        <p className="mx-auto mt-10 max-w-md text-[13px] leading-relaxed text-neutral-400">
          정보 글이 자연스럽게 가게 홍보로 이어지고, 업체 정보와 지도까지 자동으로 붙어요.
        </p>
        <button
          onClick={toForm}
          className="mt-6 rounded-full bg-[#1D75F7] px-7 py-3 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-95"
        >
          사전신청
        </button>
      </div>
    </section>
  );
}
