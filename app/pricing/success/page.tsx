import { Suspense } from "react";
import CreditSuccess from "@/components/CreditSuccess";

export const dynamic = "force-dynamic";

// 토스 결제창 successUrl — paymentKey/orderId/amount 쿼리를 받아 서버 승인(/api/credits/confirm) 후 지급 결과 표시.
export default function CreditSuccessPage() {
  return (
    <div className="at-app-bg flex min-h-screen items-center justify-center px-6 text-center text-neutral-900 antialiased">
      <Suspense>
        <CreditSuccess />
      </Suspense>
    </div>
  );
}
