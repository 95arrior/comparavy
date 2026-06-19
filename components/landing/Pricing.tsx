"use client";

import Reveal from "@/components/Reveal";

// [5] 가격 — 손실회피 문구 + 3-카드 비교(AteFlo 강조) + 사전신청 CTA.
type Plan = { label: string; main: string; sub: string; highlight?: boolean };
const PLANS: Plan[] = [
  { label: "직접 운영", main: "공짜지만, 며칠 못 가요", sub: "뭘 쓸지 매번 막혀요" },
  { label: "블로그 대행사", main: "월 100만 원부터", sub: "계약 끝나면 멈춰요" },
  { label: "AteFlo", main: "월 79,000원", sub: "글감이 매일 오니까, 안 멈춰요", highlight: true },
];

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
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <p className="text-[13px] leading-relaxed text-neutral-400">
            직접 해보셨다면 아실 거예요.<br />
            3일 쓰고 멈추는 이유는, 다음에 뭘 쓸지 몰라서예요.
          </p>
          <h2 className="font-pretendard mt-5 text-2xl font-bold leading-[1.3] tracking-tight sm:text-[2rem] sm:leading-[1.25]">
            대행사 한 달 비용으로,<br />
            <span className="text-[#1D75F7]">AteFlo는 일 년</span>을 써요
          </h2>
        </Reveal>

        {/* 비교 카드 3개 */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:items-center">
          {PLANS.map((p, i) => (
            <Reveal key={p.label} delay={i * 110}>
              <div
                className={`rounded-2xl border p-6 text-center transition ${
                  p.highlight
                    ? "relative border-[#1D75F7] bg-[#1D75F7] text-white shadow-[0_22px_54px_-18px_rgba(29,117,247,0.55)] sm:scale-105"
                    : "border-neutral-200 bg-white"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#1D75F7] shadow-sm">추천</span>
                )}
                <p className={`text-sm font-semibold ${p.highlight ? "text-white/80" : "text-neutral-400"}`}>{p.label}</p>
                <p className={`mt-3 font-bold ${p.highlight ? "text-2xl text-white" : "text-xl text-neutral-800"}`}>{p.main}</p>
                <p className={`mt-1.5 text-sm leading-relaxed ${p.highlight ? "text-white/85" : "text-neutral-500"}`}>{p.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <p className="mt-9 text-sm font-medium text-neutral-600">하루 2,600원. 손님 몇 명만 늘어도 남아요.</p>
          <button
            onClick={toForm}
            className="mt-6 rounded-xl bg-[#1D75F7] px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_28px_-10px_rgba(29,117,247,0.5)] transition hover:opacity-90 active:scale-[0.98]"
          >
            사전신청
          </button>
          <p className="mt-3.5 text-xs text-neutral-400">사전신청자에게 가장 먼저, 더 좋은 조건으로</p>
        </Reveal>
      </div>
    </section>
  );
}
