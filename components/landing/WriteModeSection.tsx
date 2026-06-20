"use client";

import { useEffect, useRef, useState } from "react";

// [글 모드 토글] 홍보/정보 선택 — 누구나 쓸 수 있다는 메시지 + 모드 선택을 한 화면에.
// 왼쪽=홍보, 오른쪽=정보. 화면 중앙 도달 후 2초마다 자동 전환(수동 클릭도 가능). 토스식 짧은 카피.
export default function WriteModeSection() {
  const [info, setInfo] = useState(false); // false=홍보(왼쪽), true=정보(오른쪽)
  const [reduce, setReduce] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // 화면 중앙에 들어오면 2초마다 자동 토글, 벗어나면 정지
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const start = () => { if (!timer.current) timer.current = setInterval(() => setInfo((v) => !v), 2000); };
    const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "-35% 0px -35% 0px", threshold: 0 });
    io.observe(el);
    return () => { io.disconnect(); stop(); };
  }, []);

  // 수동 클릭 — 즉시 전환 + 자동 타이머 리셋(바로 다시 안 튀게)
  const toggle = () => {
    setInfo((v) => !v);
    if (timer.current) { clearInterval(timer.current); timer.current = setInterval(() => setInfo((v) => !v), 2000); }
  };

  const headline = info ? "사장님이 아니어도 괜찮아요" : "블로그, 누구나 시작할 수 있어요";
  const handleTransition = reduce
    ? "transform 0.2s ease"
    : "transform 0.35s cubic-bezier(0.68, -0.55, 0.27, 1.55)";

  return (
    <section ref={sectionRef} className="flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-white px-6 py-20">
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
        onClick={toggle}
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
