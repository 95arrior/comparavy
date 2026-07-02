"use client";

// 24시간 한정 할인 — 크레딧 소진(잠김) 순간 시작되는 1회성 타이머(기기 저장).
// 심리 설계: D-3 소진 → '하려던 글이 잠김' + 24h 한정가(승인팩 34,900→29,900).
// 가격 바닥은 마진 70%(크레딧당 498원) — 서버 confirm이 정가/할인가만 허용하므로 적자 불가.

const KEY = "ateflo_sale_until";
const DURATION_MS = 24 * 60 * 60 * 1000;

/** 할인 타이머 시작(이미 있으면 유지) — 잠김 페이월이 처음 뜰 때 호출 */
export function ensureSaleStarted(): number {
  try {
    const raw = localStorage.getItem(KEY);
    const existing = raw ? Number(raw) : 0;
    if (existing > Date.now()) return existing;
    // 만료됐거나 없음 → 새로 시작은 '최초 1회'만(만료 기록이 있으면 재시작 안 함 — 한정의 신뢰)
    if (raw !== null) return 0;
    const until = Date.now() + DURATION_MS;
    localStorage.setItem(KEY, String(until));
    return until;
  } catch { return 0; }
}

/** 현재 유효한 할인 마감 시각(ms) — 없거나 지났으면 0 */
export function saleUntil(): number {
  try {
    const raw = localStorage.getItem(KEY);
    const t = raw ? Number(raw) : 0;
    return t > Date.now() ? t : 0;
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
