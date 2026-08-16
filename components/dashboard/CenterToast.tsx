"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 화면 상단 중앙에서 위→아래로 쓱 내려오고, 사라질 때 아래→위로 쓱 올라가는 토스트.
 * document.body로 portal해서 어떤 transform 조상이 있어도 viewport 기준으로 뜬다.
 * 좌측 사이드바가 차지하는 폭은 --toast-shift(콘텐츠 영역 중앙 보정)로 반영한다.
 *
 * message가 있으면 표시, null이 되면 퇴장 애니메이션 후 언마운트한다.
 *   사용: <CenterToast message={notice} />
 */
export default function CenterToast({ message }: { message: React.ReactNode | null }) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState<React.ReactNode | null>(null); // 현재 그리고 있는 내용(퇴장 동안 유지)
  const [visible, setVisible] = useState(false); // true=입장 위치, false=화면 밖(위)

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (message != null) {
      setShown(message);
      // 다음 프레임에 visible=true로 → 입장 트랜지션 재생
      const r = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r);
    }
    // message가 사라짐 → 퇴장 애니메이션 후 언마운트
    setVisible(false);
    const t = setTimeout(() => setShown(null), 280);
    return () => clearTimeout(t);
  }, [message]);

  if (!mounted || shown == null) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed top-0 z-[100] -translate-x-1/2"
      style={{ left: "calc(50% + var(--toast-shift, 0px))" }}
    >
      <div
        className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-300 ease-out"
        style={{
          transform: visible ? "translateY(1.25rem)" : "translateY(-150%)",
          opacity: visible ? 1 : 0,
        }}
      >
        {shown}
      </div>
    </div>,
    document.body,
  );
}
