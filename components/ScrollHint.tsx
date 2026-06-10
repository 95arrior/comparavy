"use client";

import { useEffect, useState } from "react";

/**
 * 스크롤 유도 — 원형(아래 화살표)이 핑퐁하며 가로로 늘어나 '끝까지 스크롤 해주세요!'가 펼쳐지고,
 * 미세 바운스를 계속하다 스크롤하면 사라진다. (랜딩 전용)
 */
export default function ScrollHint() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY < 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2 transition-opacity duration-500 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="ateflo-scrollpill flex h-9 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full bg-neutral-900 pl-2.5 pr-4 text-[11px] font-medium text-white shadow-lg">
        <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
        끝까지 스크롤 해주세요!
      </div>
    </div>
  );
}
