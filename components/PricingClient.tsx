"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { PLANS, formatKRW, type PlanKey } from "@/lib/plans";

export default function PricingClient({
  loggedIn,
  currentPlan,
  customerKey,
  email,
}: {
  loggedIn: boolean;
  currentPlan: PlanKey;
  customerKey: string | null;
  email: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribePro() {
    setError(null);
    if (!loggedIn || !customerKey) {
      router.push("/login");
      return;
    }
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      setError("결제 설정이 완료되지 않았습니다.");
      return;
    }
    setLoading(true);
    try {
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey });
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/pricing/success`,
        failUrl: `${window.location.origin}/pricing?fail=1`,
        customerEmail: email || undefined,
      });
      // 성공 시 successUrl로 리다이렉트된다.
    } catch {
      setError("결제 인증을 시작하지 못했습니다.");
      setLoading(false);
    }
  }

  const cards: { plan: typeof PLANS.free; cta: string; action: "current" | "free" | "pro" }[] = [
    {
      plan: PLANS.free,
      cta: currentPlan === "free" ? "현재 이용 중" : "무료 플랜",
      action: currentPlan === "free" ? "current" : "free",
    },
    {
      plan: PLANS.pro,
      cta: currentPlan === "pro" ? "현재 이용 중" : loggedIn ? "프로 구독하기" : "로그인하고 시작",
      action: currentPlan === "pro" ? "current" : "pro",
    },
  ];

  return (
    <div className="mt-12">
      <div className="grid gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2">
        {cards.map(({ plan, cta, action }) => (
          <div key={plan.key} className="flex flex-col bg-white p-8">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-medium tracking-tight">{plan.name}</h3>
              {plan.highlight && <span className="text-xs text-neutral-400">가장 인기</span>}
            </div>
            <p className="mt-3">
              <span className="text-4xl font-semibold tracking-tight">
                {plan.price === 0 ? "무료" : formatKRW(plan.price)}
              </span>
              {plan.price !== 0 && <span className="text-sm text-neutral-400">/월</span>}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-neutral-600">
              <li>월 {plan.articles}편 생성</li>
              <li>글당 최대 {plan.maxWords.toLocaleString()}자</li>
              <li>워드프레스 발행</li>
            </ul>
            <button
              disabled={action === "current" || (action === "pro" && loading)}
              onClick={() => {
                if (action === "pro") subscribePro();
                else if (action === "free") router.push(loggedIn ? "/dashboard" : "/login");
              }}
              className={`mt-8 rounded-full px-5 py-2.5 text-center text-sm font-medium transition ${
                plan.highlight
                  ? "bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50"
                  : "border border-neutral-300 text-neutral-900 hover:border-neutral-900 disabled:opacity-50"
              }`}
            >
              {action === "pro" && loading ? "결제창 여는 중…" : cta}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}

      <p className="mt-8 text-center text-xs text-neutral-400">
        프로는 월 정기결제(자동갱신)이며 언제든 해지할 수 있습니다. 가격은 추후 확정될 수 있습니다.
      </p>
    </div>
  );
}
