"use client";

import { useEffect, useState } from "react";

const COLORS = ["#3f91ff", "#ffd23a", "#ff4d6d", "#2fd07a", "#b06bff"];

type Piece = { key: number; dx: number; dy: number; rot: number; color: string; delay: number; round: boolean };

/**
 * 첫 페인트부터 화면을 덮는 인트로(깜빡임 0) — 시그니처 모션(파란 로고 팝 → 무지개 회전 등장 + 폭죽)을
 * 보여준 뒤 부드럽게 사라지며 랜딩이 드러난다. 새로고침·재방문마다 매번 재생.
 *
 * phase 기본값을 "playing"으로 둬 SSR HTML에 오버레이가 포함됨 → 콘텐츠가 먼저 보이는 깜빡임 없음.
 * 폭죽(랜덤)은 마운트 후 생성해 hydration 불일치를 피한다(로고/배경은 결정적이라 SSR 안전).
 */
export default function LandingIntro() {
  const [phase, setPhase] = useState<"playing" | "leaving" | "done">("playing");
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
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
          delay: 2.4 + Math.random() * 0.35,
          round: i % 2 === 0,
        };
      }),
    );
    const t1 = setTimeout(() => setPhase("leaving"), 4800);
    const t2 = setTimeout(() => setPhase("done"), 5300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
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
    </div>
  );
}
