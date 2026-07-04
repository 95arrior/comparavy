"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GENERATE_COST } from "@/lib/creditPacks";

// 결제 성공 리다이렉트 → 서버 최종 승인 → 크레딧 지급 결과. 승인 전엔 절대 '완료' 표시 금지.
export default function CreditSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<"confirming" | "done" | "error">("confirming");
  const [credits, setCredits] = useState(0);
  const [message, setMessage] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/credits/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentKey: params.get("paymentKey"),
            orderId: params.get("orderId"),
            amount: Number(params.get("amount")),
          }),
        });
        const data = await res.json();
        if (!res.ok) { setMessage(data.error ?? "결제 승인에 실패했어요."); setState("error"); return; }
        setCredits(data.credits ?? 0);
        setState("done");
      } catch {
        setMessage("네트워크 오류가 났어요. 결제 내역은 안전하게 보관돼요 — 잠시 후 홈에서 잔액을 확인해 주세요.");
        setState("error");
      }
    })();
  }, [params]);

  if (state === "confirming") {
    return (
      <div className="flex flex-col items-center">
        <div className="at-ai-orb" aria-hidden />
        <p className="mt-6 text-[16px] font-bold text-neutral-800">결제를 확인하고 있어요…</p>
        <p className="mt-1 text-[13px] text-neutral-400">잠깐이면 돼요. 화면을 닫지 마세요.</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex max-w-sm flex-col items-center">
        <p className="text-[18px] font-extrabold text-neutral-900">앗, 확인이 필요해요</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-500">{message}</p>
        <button onClick={() => router.replace("/")} className="at-press mt-6 w-full rounded-xl tk-grad-cta py-3.5 text-[14px] font-bold text-white">
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="flex max-w-sm flex-col items-center">
      <span className="ateflo-circle-pop flex h-20 w-20 items-center justify-center rounded-full tk-grad-cta text-white shadow-[0_12px_44px_rgba(29,117,247,0.45)]">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="ateflo-check-draw" d="M5 13l4 4L19 7" /></svg>
      </span>
      <p className="at-rise mt-6 text-[20px] font-extrabold tracking-tight text-neutral-900" style={{ animationDelay: "0.3s" }}>충전 완료!</p>
      <p className="at-rise mt-1.5 text-[14px] text-neutral-500" style={{ animationDelay: "0.5s" }}>
        잔액 <b className="text-[#1D75F7]">{credits.toLocaleString("ko-KR")}크레딧</b> · 약 {Math.floor(credits / GENERATE_COST)}편 쓸 수 있어요
      </p>
      <button onClick={() => router.replace("/")} className="at-press at-rise mt-7 w-full rounded-xl tk-grad-cta py-4 text-[15px] font-bold text-white" style={{ animationDelay: "0.7s" }}>
        글 쓰러 가기
      </button>
    </div>
  );
}
