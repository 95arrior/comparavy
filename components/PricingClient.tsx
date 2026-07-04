"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { CREDIT_PACKS, type CreditPack } from "@/lib/creditPacks";
import GlassIcon from "@/components/GlassIcon";
import { fetchSaleUntil, formatRemain } from "@/lib/sale";

// ★크레딧 팩 단건 결제 — 구독 아님. 팩 선택 → 동의 1회 → 토스 결제창 → successUrl에서 서버 승인·지급.
// orderId 규격: crd_{packKey}_{uid8}_{random} (서버가 팩·주문자·금액을 이걸로 검증)

function formatKRW(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export default function PricingClient({
  loggedIn,
  userIdFragment,
  email,
  credits,
}: {
  loggedIn: boolean;
  /** user.id 하이픈 제거 앞 8자 — orderId에 박아 주문자 검증 */
  userIdFragment: string | null;
  email: string;
  credits: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const failed = params.get("fail") === "1";
  const [selected, setSelected] = useState<CreditPack | null>(null);
  // ★24h 한정 할인 — 계정 단위(서버 users.sale_until). 살아있을 때만 salePrice.
  const [until, setUntil] = useState(0);
  useEffect(() => { fetchSaleUntil().then(setUntil); }, []);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => { tick((t) => t + 1); if (until <= Date.now()) setUntil(0); }, 1000);
    return () => clearInterval(id);
  }, [until]);
  const saleOn = until > Date.now();
  const effPrice = (p: CreditPack) => (saleOn && p.salePrice ? p.salePrice : p.price);
  const [agree, setAgree] = useState(false);
  const payBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) setTimeout(() => payBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }, [selected]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(pack: CreditPack) {
    if (!loggedIn || !userIdFragment) { router.push("/login"); return; }
    if (!agree || loading) return;
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) { setError("결제 설정이 아직이에요. 곧 열릴 예정이에요."); return; }
    setLoading(true);
    setError(null);
    try {
      const amount = effPrice(pack);
      const orderId = `crd_${pack.key}_${userIdFragment}_${Math.random().toString(36).slice(2, 12)}`;
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: `user_${userIdFragment}` });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId,
        orderName: `애트플로 ${pack.name} (${pack.credits}크레딧)`,
        successUrl: `${window.location.origin}/pricing/success`,
        failUrl: `${window.location.origin}/pricing?fail=1`,
        customerEmail: email || undefined,
      });
    } catch {
      setError("결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-10">
      {failed && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          결제가 취소됐거나 실패했어요. 다시 시도할 수 있어요.
        </p>
      )}
      {saleOn && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-[#1D75F7]/[0.07] px-4 py-2.5">
          <p className="text-[12.5px] font-bold text-[#1D75F7]">한정 할인 진행 중</p>
          <p className="text-[13px] font-extrabold tabular-nums text-[#1D75F7]">{formatRemain(until)}</p>
        </div>
      )}
      {loggedIn && (
        <p className="mb-5 text-center text-[13px] text-neutral-500">
          지금 잔액 <b className="text-[#1D75F7]">{credits.toLocaleString("ko-KR")}크레딧</b>
        </p>
      )}

      {/* 팩 목록 */}
      <div className="space-y-3">
        {CREDIT_PACKS.map((p, i) => {
          const isSel = selected?.key === p.key;

          return (
            <button
              key={p.key}
              onClick={() => { setSelected(p); setError(null); }}
              className={`at-rise at-d${i + 1} at-press relative block w-full rounded-2xl p-5 text-left transition ${
                isSel ? "at-glass-strong ring-2 ring-[#1D75F7]" : "at-glass hover:ring-1 hover:ring-[#1D75F7]/40"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-[#1D75F7] px-2.5 py-0.5 text-[11px] font-bold text-white">가장 많이 선택</span>
              )}
              <div className="flex items-center gap-4">
                <span className="relative inline-block h-10 w-10 shrink-0">
                  <GlassIcon name="credit" tint="grey" size={40} className="absolute inset-0" />
                  <GlassIcon name="credit" tint="blue" size={40} className={`at-fill absolute inset-0 ${isSel ? "at-fill-on" : ""}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-extrabold tracking-tight text-neutral-900">
                    {p.name} <span className="font-bold text-neutral-400">· {p.credits.toLocaleString("ko-KR")}크레딧</span>
                  </p>
                  <p className="mt-0.5 truncate text-[12.5px] text-neutral-500">{p.desc} · 약 {Math.floor(p.credits / 10)}일치</p>
                </div>
                <div className="shrink-0 text-right">
                  {saleOn && p.salePrice ? (
                    <>
                      <p className="text-[12px] font-medium text-neutral-300 line-through">{formatKRW(p.price)}</p>
                      <p className="text-[17px] font-extrabold text-[#1D75F7]">{formatKRW(p.salePrice)}</p>
                    </>
                  ) : (
                    <p className="text-[17px] font-extrabold text-neutral-900">{formatKRW(p.price)}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 결제 — 전자상거래법 고지 + 동의 후 진행 */}
      {selected && (
        <div ref={payBoxRef} className="at-pop mt-5 rounded-2xl at-glass-strong p-5">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-neutral-900">{selected.name} · {selected.credits.toLocaleString("ko-KR")}크레딧</p>
            <p className="text-[16px] font-extrabold text-[#1D75F7]">{formatKRW(effPrice(selected))}</p>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed text-neutral-600">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1D75F7]" />
            <span>
              위 금액의 <b>1회 결제</b>에 동의해요(자동 결제 아님). 크레딧은 구매 후 바로 지급되며, 사용하지 않은 크레딧은 구매 7일 이내 전액 환불할 수 있어요.
            </span>
          </label>
          {error && <p className="mt-2 text-[12.5px] font-medium text-amber-600">{error}</p>}
          <button
            onClick={() => pay(selected)}
            disabled={!agree || loading}
            className="at-press mt-4 w-full rounded-xl bg-[#1D75F7] py-4 text-[15px] font-bold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "결제창 여는 중…" : loggedIn ? `${formatKRW(effPrice(selected))} 결제하기` : "로그인하고 결제하기"}
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-[12px] leading-relaxed text-neutral-400">
        크레딧은 유효기간 없이 계정에 남아요 · 결제는 토스페이먼츠가 안전하게 처리해요
      </p>
    </div>
  );
}
