"use client";

// 무거운 동작용 풀스크린 로딩 — "로딩 중…" 텍스트 대신 살아 움직이는 AteFlo 로고.
// 숨쉬는 로고 + 레이더 펄스 링 + 궤도 파티클 + 스윕 바 (#1D75F7).
export default function LoadingScreen({ label, fixed = true }: { label?: string; fixed?: boolean }) {
  return (
    <div className={`ateflo-load-screen ${fixed ? "fixed inset-0 z-[300]" : "absolute inset-0 z-30"} flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm`}>
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="ateflo-load-ring" />
        <span className="ateflo-load-ring" style={{ animationDelay: "0.63s" }} />
        <span className="ateflo-load-ring" style={{ animationDelay: "1.26s" }} />
        <span className="ateflo-load-glow" />
        <span className="ateflo-load-orbit"><i /><i /><i /></span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ateflo-mark.png?v=2" alt="" aria-hidden className="ateflo-load-mark relative h-14 w-14" style={{ objectFit: "contain" }} />
      </div>

      <div className="mt-9 h-1 w-40 overflow-hidden rounded-full bg-[#1D75F7]/10">
        <span className="ateflo-load-bar" />
      </div>

      {label && <p className="mt-4 text-sm font-medium text-neutral-500">{label}</p>}
    </div>
  );
}
