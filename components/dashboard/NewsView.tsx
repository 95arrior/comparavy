"use client";

import Reveal from "@/components/Reveal";
import { ANNOUNCEMENTS } from "@/lib/announcements";

const BRAND = "#3f91ff";
// 페이지 슬라이드(약 0.35s)가 끝난 뒤 박스가 올라오도록 등장 지연
const BASE_DELAY = 420;

export default function NewsView({ onBack }: { onBack: () => void }) {
  return (
    <div className="ateflo-page-in">
      {/* 상단바 */}
      <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-6 py-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
            <span className="text-base leading-none">←</span> 돌아가기
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <Reveal delay={BASE_DELAY}>
          <p className="text-sm font-semibold tracking-tight" style={{ color: BRAND }}>공지 · 업데이트</p>
          <h1 className="mt-3 text-3xl font-bold leading-[1.2] tracking-tight sm:text-4xl">새로워진 소식</h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-500">AteFlo가 무엇이 좋아졌는지 알려드려요.</p>
        </Reveal>

        <div className="mt-12 space-y-5">
          {ANNOUNCEMENTS.map((a, i) => (
            <Reveal key={a.id} delay={BASE_DELAY + (i + 1) * 70}>
              <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-6 shadow-sm">
                <p className="text-xs font-medium text-neutral-400">{a.date}</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">{a.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{a.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
