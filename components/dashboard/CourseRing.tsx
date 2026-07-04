"use client";

import { useEffect, useState } from "react";
import { COURSE_DAYS, progressPercent, type CourseInfo } from "@/lib/course";
import GlassIcon from "@/components/GlassIcon";

// ★코스 링 v2 — 홈의 심장. 그라데이션 스트로크(블루→시안) + 소프트 글로우 +
// 20일 눈금 + 진행 끝점에 빛나는 펄(그룹 회전으로 링과 함께 이동). 마운트 시 0→현재 드로잉.
export default function CourseRing({ info }: { info: CourseInfo }) {
  const R = 64;
  const C = 2 * Math.PI * R;
  const progress = progressPercent(info) / 100; // ★발행 기준 — 오늘 미발행이면 오늘 몫 미채움
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setDrawn(progress));
    return () => cancelAnimationFrame(t);
  }, [progress]);

  const pct = Math.round(progress * 100);
  // 20일 눈금 — 링 바깥쪽에 짧은 마크
  const ticks = Array.from({ length: COURSE_DAYS }, (_, i) => (i / COURSE_DAYS) * 2 * Math.PI);

  return (
    <div className="flex flex-col items-center pt-2">
      <div className="relative h-[176px] w-[176px]">
        <svg width="176" height="176" viewBox="0 0 176 176" className="-rotate-90">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1D75F7" />
              <stop offset="55%" stopColor="#4f9df9" />
              <stop offset="100%" stopColor="#38cdf8" />
            </linearGradient>
            <filter id="ringGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          {/* 20일 눈금 */}
          {ticks.map((a, i) => {
            const r1 = R + 11, r2 = R + 15;
            const x1 = 88 + r1 * Math.cos(a), y1 = 88 + r1 * Math.sin(a);
            const x2 = 88 + r2 * Math.cos(a), y2 = 88 + r2 * Math.sin(a);
            const passed = i / COURSE_DAYS < drawn - 0.001;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={passed ? "#1D75F7" : "#dde4ee"} strokeWidth="2.5" strokeLinecap="round" style={{ transition: `stroke 0.4s ease ${0.9 * (i / COURSE_DAYS)}s` }} />;
          })}

          {/* 트랙 */}
          <circle cx="88" cy="88" r={R} fill="none" stroke="rgba(120,140,175,0.16)" strokeWidth="12" />

          {/* 글로우(뒤) + 본 링 */}
          <circle cx="88" cy="88" r={R} fill="none" stroke="url(#ringGrad)" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - drawn)} filter="url(#ringGlow)" opacity="0.45"
            style={{ transition: "stroke-dashoffset 0.9s var(--at-ease)" }} />
          <circle cx="88" cy="88" r={R} fill="none" stroke="url(#ringGrad)" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - drawn)}
            style={{ transition: "stroke-dashoffset 0.9s var(--at-ease)" }} />

          {/* 진행 끝점 펄 — 그룹 회전으로 링 끝을 따라감 */}
          {drawn > 0.001 && (
            <g style={{ transformOrigin: "88px 88px", transform: `rotate(${drawn * 360}deg)`, transition: "transform 0.9s var(--at-ease)" }}>
              <circle cx={88 + R} cy="88" r="9" fill="#fff" opacity="0.9" filter="url(#ringGlow)" />
              <circle cx={88 + R} cy="88" r="5.5" fill="#fff" stroke="url(#ringGrad)" strokeWidth="3" />
            </g>
          )}
        </svg>

        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {info.finished ? (
            <span className="text-[30px] font-extrabold tracking-tight text-[color:var(--at-grey-900)]">완주</span>
          ) : info.day > 0 ? (
            <>
              <span className="text-[36px] font-extrabold leading-none tracking-tight text-[color:var(--at-grey-900)]">D-{info.day}</span>
              <span className="mt-1 text-[13px] font-semibold text-[color:var(--at-grey-400)]">{pct}%</span>
            </>
          ) : (
            <>
              <span className="text-[26px] font-extrabold leading-none tracking-tight text-[color:var(--at-grey-900)]">시작 전</span>
              <span className="mt-1 text-[12px] font-semibold text-[color:var(--at-grey-400)]">첫 글이 D-1</span>
            </>
          )}
        </div>

        {/* 스트릭 칩 */}
        {info.streak >= 2 && (
          <span className="absolute -right-6 top-2 flex items-center gap-1 rounded-full at-glass px-2.5 py-1 text-[12px] font-bold text-orange-500 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.15)]">
            <GlassIcon name="fire" tint="orange" size={14} /> {info.streak}일 연속
          </span>
        )}
      </div>
      <p className="mt-3 text-[13px] font-semibold text-[color:var(--at-grey-600)]">
        {info.finished ? "애드포스트 신청해볼 차례예요" : "승인 준비 코스 진행 중"}
      </p>
    </div>
  );
}
