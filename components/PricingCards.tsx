"use client";

import { useRouter } from "next/navigation";
import { PLANS, formatKRW, PLAN_FEATURES, type PlanKey } from "@/lib/plans";

const BRAND = "#3f91ff";

function Features({ plan }: { plan: PlanKey }) {
  return (
    <ul className="mt-6 space-y-2.5 text-sm text-neutral-600">
      {PLAN_FEATURES[plan].map((f) => (
        <li key={f} className="flex gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <path d="M5 13l4 4L19 7" />
          </svg>
          {f}
        </li>
      ))}
    </ul>
  );
}

// 호버하면 '시작하기'로 부드럽게 크로스페이드 (크기 고정)
function CurrentBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative mt-8 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition hover:border-neutral-900"
    >
      <span className="invisible">현재 이용 중</span>
      <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0">현재 이용 중</span>
      <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">시작하기</span>
    </button>
  );
}

export default function PricingCards({ loggedIn, currentPlan }: { loggedIn: boolean; currentPlan: PlanKey }) {
  const router = useRouter();
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const isPro = currentPlan === "pro";
  const isFree = loggedIn && currentPlan === "free";

  return (
    <div className="grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2">
      {/* 무료 */}
      <div className="relative flex flex-col bg-white p-8">
        <div className={isPro ? "pointer-events-none select-none opacity-50 blur-[2px]" : ""}>
          <h3 className="text-lg font-medium tracking-tight">{PLANS.free.name}</h3>
          <p className="mt-3"><span className="text-4xl font-semibold tracking-tight">무료</span></p>
          <Features plan="free" />
          {!isPro &&
            (isFree ? (
              <CurrentBtn onClick={toTop} />
            ) : (
              <button
                onClick={() => router.push(loggedIn ? "/" : "/login")}
                className="mt-8 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition hover:border-neutral-900"
              >
                무료로 시작
              </button>
            ))}
        </div>
        {isPro && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-neutral-900/85 px-4 py-1.5 text-sm font-medium text-white">프로 이용 중</span>
          </div>
        )}
      </div>

      {/* 프로 — 버튼은 항상 무지개 */}
      <div className="flex flex-col bg-white p-8">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-medium tracking-tight">{PLANS.pro.name}</h3>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: `${BRAND}1a`, color: BRAND }}>가장 인기</span>
        </div>
        <p className="mt-3">
          <span className="text-4xl font-semibold tracking-tight">{formatKRW(PLANS.pro.price)}</span>
          <span className="text-sm text-neutral-400">/월</span>
        </p>
        <Features plan="pro" />
        {isPro ? (
          <CurrentBtn onClick={toTop} />
        ) : (
          <button
            onClick={() => router.push(loggedIn ? "/pricing" : "/login")}
            className="mt-8 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            {loggedIn ? "프로 구독하기" : "프로 선택"}
          </button>
        )}
      </div>
    </div>
  );
}
