"use client";

import { useEffect, useRef, useState } from "react";

const COLORS = ["#3f91ff", "#ffd23a", "#ff4d6d", "#2fd07a", "#b06bff"];

type Piece = { key: number; dx: number; dy: number; rot: number; color: string; delay: number; round: boolean };

/**
 * 시그니처 인트로 — 시그니처 모션(파란 로고 핑퐁 → 무지개 회전 등장 + 폭죽)을 보여준 뒤 사라진다.
 *
 * 전환 최적화: 세션당 1회만 재생(skip=true면 즉시 통과 → 재방문·새로고침은 바로 콘텐츠).
 * skip은 서버에서 쿠키로 판단해 넘겨줌 → 깜빡임 없음. 탭하면 즉시 건너뛰기 가능.
 */
export default function LandingIntro({ skip = false }: { skip?: boolean }) {
  const [phase, setPhase] = useState<"playing" | "leaving" | "done">(skip ? "done" : "playing");
  const [pieces, setPieces] = useState<Piece[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (skip) return;
    // 이번 세션은 봤다고 표시 (세션 쿠키 — 브라우저 닫으면 초기화)
    document.cookie = "ateflo_intro=1; path=/; SameSite=Lax";
    setPieces(
      Array.from({ length: 36 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 150 + Math.random() * 220;
        return {
          key: i,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          rot: Math.random() * 720 - 360,
          color: COLORS[i % COLORS.length],
          delay: 1.5 + Math.random() * 0.35,
          round: i % 2 === 0,
        };
      }),
    );
    document.body.style.overflow = "hidden";
    timers.current = [
      setTimeout(() => setPhase("leaving"), 3700),
      setTimeout(() => {
        setPhase("done");
        document.body.style.overflow = "";
      }, 4200),
    ];
    return () => {
      timers.current.forEach(clearTimeout);
      document.body.style.overflow = "";
    };
  }, [skip]);

  function skipNow() {
    if (phase !== "playing") return;
    timers.current.forEach(clearTimeout);
    document.body.style.overflow = "";
    setPhase("leaving");
    setTimeout(() => setPhase("done"), 400);
  }

  if (phase === "done") return null;

  return (
    <div
      onClick={skipNow}
      className={`fixed inset-0 z-[200] flex cursor-pointer flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex h-32 w-32 items-center justify-center">
        {pieces.map((p) => (
          <span
            key={p.key}
            className="ateflo-confetti pointer-events-none absolute h-2.5 w-2.5"
            style={
              {
                background: p.color,
                borderRadius: p.round ? "9999px" : "2px",
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                "--rot": `${p.rot}deg`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
        {/* 파란 로고: 팝 등장 → 입 벌리며 사라짐 */}
        <span className="ateflo-logo ateflo-celebrate-blue absolute" style={{ width: 96, height: 96 }} />
        {/* 무지개 로고: 한바퀴 돌며 등장 */}
        <span className="ateflo-celebrate-pro absolute">
          <span className="ateflo-logo ateflo-logo--pro ateflo-celebrate-pro-chew block" style={{ width: 96, height: 96 }} />
        </span>
      </div>
      <p className="ateflo-intro-word mt-8 text-2xl font-bold tracking-tight text-neutral-900">AteFlo</p>
      <button
        onClick={skipNow}
        className="absolute bottom-7 text-xs font-medium text-neutral-300 transition hover:text-neutral-500"
      >
        건너뛰기
      </button>
    </div>
  );
}
