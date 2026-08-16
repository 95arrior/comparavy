"use client";

import { useEffect } from "react";

// ★전역 에러 화면 — 배포 직후 옛 청크 유실(deployment skew)이 대부분: 자동 새로고침 1회로 조용히 복구.
//  그 외 예외는 한국어 안내 + 새로고침 버튼(영문 기본 화면 대체).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const msg = `${error?.name ?? ""} ${error?.message ?? ""}`;
    const chunky = /ChunkLoadError|Loading chunk|dynamically imported module|import\(\) failed|Failed to fetch/i.test(msg);
    if (!chunky) return;
    // 같은 세션에서 무한 리로드 방지 — 1회만
    try {
      if (sessionStorage.getItem("ateflo_chunk_reload") === "1") return;
      sessionStorage.setItem("ateflo_chunk_reload", "1");
      window.location.reload();
    } catch { /* ignore */ }
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: "#f2f5ff" }}>
      <p className="text-[17px] font-bold text-neutral-900">화면을 불러오지 못했어요</p>
      <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-neutral-500">
        방금 업데이트가 배포됐을 수 있어요. 새로고침하면 대부분 해결돼요.
      </p>
      <div className="mt-5 flex items-center gap-2">
        <button onClick={() => { try { sessionStorage.removeItem("ateflo_chunk_reload"); } catch { /* ignore */ } window.location.reload(); }}
          className="tk-grad-cta rounded-[12px] px-5 py-3 text-[14px] font-bold text-white">새로고침</button>
        <button onClick={() => reset()} className="rounded-[12px] bg-white px-5 py-3 text-[14px] font-bold text-neutral-600 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">다시 시도</button>
      </div>
    </main>
  );
}
