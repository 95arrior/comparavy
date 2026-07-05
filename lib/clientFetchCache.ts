"use client";
// ★클라 GET 캐시 — 같은 데이터를 여러 컴포넌트가 각자 fetch(체크인 4곳 등)하던 중복 제거.
//  메모리(즉시) + sessionStorage(탭 내 재방문 즉시) 30초 TTL. 그래프·문장이 '바로바로' 뜨게.
const mem = new Map<string, { t: number; v: unknown }>();
export async function cachedGet<T>(url: string, ttlMs = 30_000): Promise<T> {
  const now = Date.now();
  const m = mem.get(url);
  if (m && now - m.t < ttlMs) return m.v as T;
  try {
    const raw = sessionStorage.getItem(`cg:${url}`);
    if (raw) { const p = JSON.parse(raw) as { t: number; v: T }; if (now - p.t < ttlMs) { mem.set(url, p); return p.v; } }
  } catch { /* ignore */ }
  const res = await fetch(url);
  const v = (await res.json()) as T;
  const entry = { t: now, v };
  mem.set(url, entry);
  try { sessionStorage.setItem(`cg:${url}`, JSON.stringify(entry)); } catch { /* ignore */ }
  return v;
}
export function invalidateGet(url: string) {
  mem.delete(url);
  try { sessionStorage.removeItem(`cg:${url}`); } catch { /* ignore */ }
}
