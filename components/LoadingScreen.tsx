"use client";

// 풀스크린 로딩 v2 — 미니멀: 톤 배경 + 로고 + 얇은 스피너 링 하나. (구버전 레이더 링·파티클 폐기)
export default function LoadingScreen({ label, fixed = true }: { label?: string; fixed?: boolean }) {
  return (
    <div className={`at-app-bg ${fixed ? "fixed inset-0 z-[300]" : "absolute inset-0 z-30"} flex flex-col items-center justify-center`}>
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-[2.5px] border-black/[0.06] border-t-[#1D75F7]" style={{ animationDuration: "0.9s" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ateflo-mark.png?v=2" alt="" aria-hidden className="h-11 w-11" style={{ objectFit: "contain" }} />
      </div>
      {label && <p key={label} className="ateflo-soft-in mt-6 text-[13.5px] font-medium text-neutral-500">{label}</p>}
    </div>
  );
}
