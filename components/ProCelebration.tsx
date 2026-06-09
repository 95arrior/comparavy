"use client";

import { useMemo } from "react";

const COLORS = ["#3f91ff", "#ffd23a", "#ff4d6d", "#2fd07a", "#b06bff"];

export default function ProCelebration() {
  // 폭죽 조각 — 무지개 로고가 터지며 등장하는 타이밍(약 0.8s)에 맞춰 발사
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 130 + Math.random() * 180;
        return {
          key: i,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          rot: Math.random() * 720 - 360,
          color: COLORS[i % COLORS.length],
          delay: 0.78 + Math.random() * 0.25,
          round: i % 2 === 0,
        };
      }),
    [],
  );

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative flex h-32 w-32 items-center justify-center">
        {/* 폭죽 */}
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

        {/* 파란 로고: 팝 등장 → 입 쫙 벌리며 사라짐 */}
        <span className="ateflo-logo ateflo-celebrate-blue absolute" style={{ width: 92, height: 92 }} />

        {/* 프로 무지개 로고: 등장 + 요동(mesh/chew) */}
        <span className="ateflo-celebrate-pro absolute">
          <span className="ateflo-logo ateflo-logo--pro ateflo-logo--anim block" style={{ width: 92, height: 92 }} />
        </span>
      </div>

      <h1 className="mt-7 text-2xl font-bold tracking-tight">프로 멤버십 시작! 🎉</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        이제 5,000자 깊이로 쓰고, 워드프레스에 바로 발행하세요.
      </p>
    </div>
  );
}
