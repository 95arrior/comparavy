"use client";

// 24시간 한정 할인 — ★계정 단위 서버 강제(users.sale_until). 이 파일은 클라 헬퍼만.
// 시작: POST /api/sale (잠긴 페이월 최초 노출 시 · 이미 있으면 재시작 없음)
// 검증: /api/credits/confirm 이 sale_until > now 일 때만 할인가 승인.

export async function startSale(): Promise<number> {
  try {
    const res = await fetch("/api/sale", { method: "POST" });
    const data = await res.json();
    return typeof data.until === "number" ? data.until : 0;
  } catch { return 0; }
}

export async function fetchSaleUntil(): Promise<number> {
  try {
    const res = await fetch("/api/sale");
    const data = await res.json();
    return typeof data.until === "number" ? data.until : 0;
  } catch { return 0; }
}

/** 남은 시간 "HH:MM:SS" */
export function formatRemain(until: number): string {
  const ms = Math.max(0, until - Date.now());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
