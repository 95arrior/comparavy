"use client";

import { useEffect, useState } from "react";
import Brand from "@/components/Brand";

// 랜딩 헤더 — 최상단에선 숨김(없음), 스크롤하면 위에서 내려와 등장(토스st).
export default function LandingHeader() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 사전신청 버튼 → 신청 인풋 포커스(모바일 키보드) + 스크롤
  const toForm = () => {
    const input = document.getElementById("hero-email") as HTMLInputElement | null;
    if (input) {
      input.focus({ preventScroll: true });
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      document.getElementById("signup")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        shown
          ? "translate-y-0 border-neutral-200/60 bg-white/80 opacity-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.15)] backdrop-blur-md"
          : "pointer-events-none -translate-y-full border-transparent bg-transparent opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <Brand size={24} />
        <button
          onClick={toForm}
          className="hidden rounded-full bg-[#1D75F7] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 sm:block"
        >
          사전신청
        </button>
      </div>
    </header>
  );
}
