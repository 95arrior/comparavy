"use client";

import { useEffect, useRef, useState } from "react";

// [글 모드 토글] 홍보/정보 — 상태는 풀페이지 컨트롤러(NewLanding)가 관리. info/onToggle props.
export default function WriteModeSection({ info, onToggle }: { info: boolean; onToggle: () => void }) {
  const [reduce, setReduce] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const headline = info ? "사장님이 아니어도 괜찮아요" : "블로그, 누구나 시작할 수 있어요";
  const handleTransition = reduce
    ? "transform 0.2s ease"
    : "transform 0.35s cubic-bezier(0.68, -0.55, 0.27, 1.55)";

  return (
    <section ref={ref} data-page className="flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-white px-6 py-20">
      {/* 상단 카피 — 토글 상태 따라 부드럽게 페이드 전환 */}
      <h2
        key={headline}
        className="ateflo-soft-in font-pretendard text-center text-[clamp(24px,6.2vw,42px)] font-bold leading-[1.2] tracking-[-0.02em]"
      >
        {headline}
      </h2>

      {/* 토글 — 흰 트랙 + 큰 입체 핸들 */}
      <button
        type="button"
        role="switch"
        aria-checked={info}
        aria-label="글 모드 선택: 홍보 / 정보"
        onClick={onToggle}
        className="relative mt-14 h-14 w-36 rounded-full shadow-[inset_0_2px_6px_rgba(20,40,90,0.16)] transition-colors duration-300"
        style={{ backgroundColor: info ? "#eef4ff" : "#f1f3f5" }}
      >
        <span
          aria-hidden
          className="absolute left-[-3px] top-[-2px] h-[60px] w-[60px] rounded-full"
          style={{
            transform: `translateX(${info ? 90 : 0}px)`,
            transition: handleTransition,
            background: "radial-gradient(125% 125% at 32% 26%, #6aa6ff 0%, #1D75F7 52%, #1559c4 100%)",
            boxShadow:
              "inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -5px 7px rgba(8,30,80,0.3), 0 12px 24px -6px rgba(29,117,247,0.6)",
          }}
        />
      </button>

      {/* 하단 라벨 — 양쪽 고정, 선택된 쪽 진하게 */}
      <div className="mt-7 flex w-full max-w-sm items-center justify-between gap-6 text-center">
        <span className={`flex-1 text-[13px] font-semibold transition-colors duration-300 sm:text-sm ${!info ? "text-[#1D75F7]" : "text-neutral-400"}`}>
          가게 홍보도 자연스럽게
        </span>
        <span className={`flex-1 text-[13px] font-semibold transition-colors duration-300 sm:text-sm ${info ? "text-[#1D75F7]" : "text-neutral-400"}`}>
          정보 위주로 깔끔하게
        </span>
      </div>
    </section>
  );
}
