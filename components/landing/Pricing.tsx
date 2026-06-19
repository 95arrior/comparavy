"use client";

import Reveal from "@/components/Reveal";

// [5] 가격 — ROI 전환형: 손님 한 명의 가치 → 직원 앵커 → 담담한 가격 → CTA.
function toForm() {
  const input = document.getElementById("hero-email") as HTMLInputElement | null;
  if (input) {
    input.focus({ preventScroll: true });
    input.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export default function Pricing() {
  return (
    <section className="overflow-x-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-xl px-6 text-center">
        <Reveal>
          <p className="text-[13px] leading-relaxed text-neutral-400">
            손님 한 명이 평생 가게에 쓰는 돈, 계산해 보신 적 있어요?
          </p>
          <h2 className="font-pretendard mt-5 text-[2rem] font-bold leading-[1.22] tracking-tight sm:text-[2.6rem] sm:leading-[1.18]">
            한 명만 와도<br />
            <span className="text-[#1D75F7]">일 년 치</span>를 넘어요
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base">
            블로그 보고 찾아온 손님 한 명.<br />
            그 한 명이면, AteFlo 일 년 값을 이미 넘겨요.
          </p>
        </Reveal>

        {/* 직원 앵커 */}
        <Reveal delay={120}>
          <div className="mx-auto mt-10 max-w-md rounded-2xl bg-[#1D75F7]/[0.05] px-6 py-5 ring-1 ring-[#1D75F7]/10">
            <p className="text-[15px] leading-relaxed text-neutral-600">블로그 챙길 직원을 뽑으면 매달 수백만 원.</p>
            <p className="mt-1 text-[15px] font-semibold leading-relaxed text-[#1D75F7]">AteFlo는 매일 출근하는 그 직원이에요.</p>
          </div>
        </Reveal>

        {/* CTA */}
        <Reveal delay={200}>
          <button
            onClick={toForm}
            className="mt-12 rounded-xl bg-[#1D75F7] px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_28px_-10px_rgba(29,117,247,0.5)] transition hover:opacity-90 active:scale-[0.98]"
          >
            사전신청
          </button>
          <p className="mt-3.5 text-xs text-neutral-400">사전신청자에게 가장 먼저, 더 좋은 조건으로</p>
        </Reveal>
      </div>
    </section>
  );
}
