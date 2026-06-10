"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 화면 정중앙 상단에 뜨는 토스트. document.body로 portal해서
 * 어떤 transform 조상(스택 컨텍스트)이 있어도 항상 viewport 기준 정중앙에 표시된다.
 * 표시/숨김은 부모가 조건부 렌더로 제어(예: {cond && <CenterToast>…</CenterToast>}).
 */
export default function CenterToast({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="pointer-events-none fixed left-1/2 top-5 z-[100] -translate-x-1/2">
      <div className="ateflo-fade-in rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
        {children}
      </div>
    </div>,
    document.body,
  );
}
