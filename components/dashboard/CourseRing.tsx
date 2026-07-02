"use client";

import { useEffect, useState } from "react";
import { COURSE_DAYS, type CourseInfo } from "@/lib/course";
import GlassIcon from "@/components/GlassIcon";

// 승인 준비 코스 진행 링 — 홈의 히어로. 매일 열 때마다 링이 차오르는 걸 보는 게 동기부여의 핵심.
// 마운트 시 0에서 현재 진행까지 부드럽게 그려짐(0.9s, at-ease). 중앙 D-n, 하단 라벨, 우측 스트릭 칩.
export default function CourseRing({ info }: { info: CourseInfo }) {
  const R = 64; // 반지름
  const C = 2 * Math.PI * R;
  const progress = info.finished ? 1 : Math.max(0, Math.min(1, info.day / COURSE_DAYS));
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    // 마운트 다음 프레임에 목표치로 — CSS transition이 그려주는 효과
    const t = requestAnimationFrame(() => setDrawn(progress));
    return () => cancelAnimationFrame(t);
  }, [progress]);

  const pct = Math.round(progress * 100);

  return (
    <div className="flex flex-col items-center pt-2">
      <div className="relative h-[168px] w-[168px]">
        <svg width="168" height="168" viewBox="0 0 168 168" className="-rotate-90">
          <circle cx="84" cy="84" r={R} fill="none" stroke="var(--at-grey-200)" strokeWidth="11" />
          <circle
            cx="84" cy="84" r={R} fill="none"
            stroke="var(--at-blue)" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - drawn)}
            style={{ transition: "stroke-dashoffset 0.9s var(--at-ease)" }}
          />
        </svg>
        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {info.finished ? (
            <span className="text-[30px] font-extrabold tracking-tight text-[color:var(--at-grey-900)]">완주 🎉</span>
          ) : info.day > 0 ? (
            <>
              <span className="text-[34px] font-extrabold leading-none tracking-tight text-[color:var(--at-grey-900)]">D-{info.day}</span>
              <span className="mt-1 text-[13px] font-semibold text-[color:var(--at-grey-400)]">{pct}%</span>
            </>
          ) : (
            <>
              <span className="text-[26px] font-extrabold leading-none tracking-tight text-[color:var(--at-grey-900)]">시작 전</span>
              <span className="mt-1 text-[12px] font-semibold text-[color:var(--at-grey-400)]">첫 글이 D-1</span>
            </>
          )}
        </div>
        {/* 스트릭 칩 — 링 우상단에 떠 있음 */}
        {info.streak >= 2 && (
          <span className="absolute -right-5 top-2 flex items-center gap-1 rounded-full at-glass py-1 pl-1 pr-2.5 text-[12px] font-bold text-orange-500 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.15)]">
            <GlassIcon name="fire" tint="orange" size={20} icon={0.7} radius={999} /> {info.streak}일 연속
          </span>
        )}
      </div>
      <p className="mt-2.5 text-[13px] font-semibold text-[color:var(--at-grey-600)]">
        {info.finished ? "애드포스트 신청해볼 차례예요" : "승인 준비 코스 진행 중"}
      </p>
    </div>
  );
}
