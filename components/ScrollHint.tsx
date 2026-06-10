"use client";

import { useEffect, useState } from "react";

/** 히어로 하단 스크롤 유도 — 마우스 안 점이 아래로 흐르고, 스크롤하면 사라진다. */
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
      <div className="flex h-8 w-[20px] items-start justify-center rounded-full border-2 border-neutral-300 pt-1.5">
        <span className="ateflo-scrolldot h-1.5 w-1 rounded-full bg-neutral-400" />
      </div>
    </div>
  );
}
