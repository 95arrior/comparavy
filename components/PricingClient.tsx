"use client";

import { useState } from "react";
import Link from "next/link";
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
  const [showConsent, setShowConsent] = useState(false);
  const [agreeOrder, setAgreeOrder] = useState(false);
  const [agreeRecurring, setAgreeRecurring] = useState(false);

  const proPrice = formatKRW(PLANS.pro.price);

  // 프로 CTA → 비로그인은 로그인, 로그인 상태면 결제 전 고지·동의 단계 표시
  function startPro() {
    setError(null);
    if (!loggedIn || !customerKey) {
      router.push("/login");
      return;
    }
    setShowConsent(true);
  }

  // 전자상거래법: 결제 전 최종 금액·주기·해지·약관 고지 + 필수 동의 후에만 결제 진행
  async function confirmAndPay() {
    if (!agreeOrder || !agreeRecurring || !customerKey) return;
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
      cta: currentPlan === "free" ? "현재 이용 중" : "무료로 시작",
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
              {plan.wordpress ? (
                <li>워드프레스 자동발행</li>
              ) : (
                <li>생성·복사·내보내기 (발행은 프로)</li>
              )}
            </ul>
            <button
              disabled={action === "current" || (action === "pro" && loading)}
              onClick={() => {
                if (action === "pro") startPro();
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
        무료 3회 체험 후 결제하세요. 프로는 월 정기결제(자동갱신)이며 언제든 해지할 수 있습니다.
      </p>

      {/* 결제 전 고지·동의 (전자상거래법) */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold tracking-tight">프로 멤버십 결제</h3>
            <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">
              <div className="flex justify-between">
                <span>결제 금액</span>
                <span className="font-semibold">{proPrice} / 월 (부가세 포함)</span>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                매월 자동결제(정기결제)되며, 해지 전까지 갱신됩니다. 언제든 해지할 수 있고
                해지 시 현재 결제 주기 종료일까지 이용할 수 있습니다.
              </p>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={agreeOrder}
                  onChange={(e) => setAgreeOrder(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  [필수] 주문 내용(상품·금액)을 확인했으며 결제에 동의합니다.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={agreeRecurring}
                  onChange={(e) => setAgreeRecurring(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  [필수] 정기결제 및 자동갱신에 동의합니다 (매월 {proPrice} 자동결제, 해지 전까지).
                </span>
              </label>
            </div>

            <p className="mt-3 text-xs text-neutral-400">
              <Link href="/terms" className="underline">이용약관</Link>
              {" · "}
              <Link href="/refund" className="underline">환불정책</Link>
              {" "}을 확인하세요. 단순 변심 환불은 제공되지 않으나 법정 청약철회권은 우선 적용됩니다.
            </p>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setShowConsent(false);
                  setAgreeOrder(false);
                  setAgreeRecurring(false);
                }}
                className="flex-1 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium transition hover:border-neutral-900"
              >
                취소
              </button>
              <button
                disabled={!agreeOrder || !agreeRecurring || loading}
                onClick={confirmAndPay}
                className="flex-1 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
              >
                {loading ? "결제창 여는 중…" : "동의하고 결제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
