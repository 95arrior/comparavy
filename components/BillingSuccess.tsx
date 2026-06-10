"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProCelebration from "@/components/ProCelebration";

type State = "processing" | "done" | "error";

export default function BillingSuccess({
  authKey,
  customerKey,
}: {
  authKey: string | null;
  customerKey: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("processing");
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!authKey || !customerKey) {
      setState("error");
      setMessage("결제 인증 정보가 올바르지 않습니다.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/billing/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey }),
        });
        const data = await res.json();
        if (!res.ok) {
          setState("error");
          setMessage(data.error ?? "결제 처리에 실패했습니다.");
          return;
        }
        setState("done");
        setTimeout(() => router.push("/"), 4200); // 축하 애니메이션을 다 보여준 뒤 이동
      } catch {
        setState("error");
        setMessage("네트워크 오류가 발생했습니다.");
      }
    })();
  }, [authKey, customerKey, router]);

  return (
    <div className="max-w-sm">
      {state === "processing" && (
        <>
          <h1 className="text-xl font-semibold tracking-tight">결제를 확인하는 중…</h1>
          <p className="mt-2 text-sm text-neutral-500">잠시만 기다려 주세요.</p>
        </>
      )}
      {state === "done" && (
        <>
          <ProCelebration />
          <button
            onClick={() => router.push("/")}
            className="ateflo-rainbow mt-8 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition"
          >
            바로 시작하기 →
          </button>
        </>
      )}
      {state === "error" && (
        <>
          <h1 className="text-xl font-semibold tracking-tight text-red-600">결제에 실패했습니다</h1>
          <p className="mt-2 text-sm text-neutral-500">{message}</p>
          <button
            onClick={() => router.push("/pricing")}
            className="mt-6 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            요금제로 돌아가기
          </button>
        </>
      )}
    </div>
  );
}
