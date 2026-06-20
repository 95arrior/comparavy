"use client";

import { useEffect, useRef, useState } from "react";

// [글 모드 토글] 홍보/정보 선택. 스크롤 가이드:
//  - 토글 한 번(스크롤 아래 or 마우스 클릭) 하기 전엔 아래 스크롤 막음 → 아래로 = 토글 이동.
//  - 한 번 움직인 뒤엔 스크롤 = 다음 섹션(일반 스크롤). 위로는 자유.
export default function WriteModeSection() {
  const [info, setInfo] = useState(false); // false=홍보(왼쪽), true=정보(오른쪽)
  const [toggledOnce, setToggledOnce] = useState(false);
  const [reduce, setReduce] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // 게이트 — 토글 한 번 하기 전까지 아래 스크롤 막고, 아래로 = 토글 이동
  useEffect(() => {
    if (toggledOnce) return; // 이미 한 번 움직였으면 게이트 없음(일반 스크롤로 다음 섹션)
    const el = sectionRef.current;
    if (!el) return;
    let frozen = false;
    let armed = true;
    let acted = false;
    const freeze = () => {
      if (frozen) return;
      frozen = true;
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
    const doToggle = () => { if (acted) return; acted = true; setInfo(true); setToggledOnce(true); };
    const io = new IntersectionObserver(
      ([e]) => { const r = e.intersectionRatio; if (armed && r > 0.85) freeze(); if (r < 0.5) armed = true; },
      { threshold: [0, 0.25, 0.5, 0.75, 0.85, 1] },
    );
    io.observe(el);
    const onWheel = (e: WheelEvent) => { if (!frozen) return; if (e.deltaY > 0) doToggle(); else if (e.deltaY < 0) unfreeze(); };
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => {
      if (!frozen) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY;
      if (dy > 8) unfreeze();
      else if (dy < -8) doToggle();
    };
    const onKey = (e: KeyboardEvent) => {
      if (!frozen) return;
      if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home") unfreeze();
      else if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") doToggle();
    };
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
  }, [toggledOnce]);

  // 수동 클릭 — 토글 이동 + '한 번 움직임' 충족
  const toggle = () => { setInfo((v) => !v); setToggledOnce(true); };

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
