"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ★머니 랭킹 카드(2026-08-11, 작전 승인) — 네이버 '많이 본 뉴스'에서 돈 되는 소재만.
 * 하루 4회(06:30·09:30·13:00·17:30 KST) 자동 교체 — 버튼 없이 시각이 지나면 스스로 갈아끼운다(유저: "확실하게 자동").
 * 카운트다운을 상시 명시(유저: "명시해주거나 카운트다운"). 소재마다 검색각(게이트 통과)·홈판각(붐빔=대중 관심) 분기.
 */

interface Item { issue: string; keyword: string; cat: string; docs: number | null; verdict: "direct" | "crowded" | "written" | "blocked" | "unmeasured"; reason?: string; newsTitle: string; similar?: { title: string; published: boolean }; big?: boolean }

/** ★소재 근접 중복 배지(2026-08-11 유저: "글 썼던 건 표기 좀 — 발행완료까지 된 건 중복 걱정") — 막지 않고 알린다 */
function SimilarChip({ similar }: { similar?: { title: string; published: boolean } }) {
  if (!similar) return null;
  return (
    <span title={similar.title}
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${similar.published ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-600"}`}>
      {similar.published ? "발행한 소재 ⚠" : "초안에 있음"}
    </span>
  );
}

const SLOTS: [number, string][] = [[6 * 60 + 30, "06:30"], [9 * 60 + 30, "09:30"], [13 * 60, "13:00"], [17 * 60 + 30, "17:30"]];
const CACHE_KEY = "ateflo_money_rank";

function kstNow(): { ymd: string; min: number } {
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
  const hm = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  const [h, m] = hm.split(":").map(Number);
  return { ymd, min: h * 60 + m };
}
/** 현재 수확 슬롯 키 — 같은 키면 재수확 안 함(교체 시각이 지나면 키가 바뀐다). */
function slotKey(): string {
  const { ymd, min } = kstNow();
  let idx = -1;
  for (let i = 0; i < SLOTS.length; i++) if (SLOTS[i][0] <= min) idx = i;
  return idx === -1 ? `${ymd}@pre` : `${ymd}@${SLOTS[idx][1]}`;
}
/** 다음 교체 안내 — "17:30 · 1시간 24분 후" */
function nextChangeLabel(): string {
  const { min } = kstNow();
  const next = SLOTS.find(([m]) => m > min);
  const [nm, label] = next ?? SLOTS[0];
  const left = next ? nm - min : 24 * 60 - min + SLOTS[0][0];
  const h = Math.floor(left / 60), mm = left % 60;
  return `${label} 교체 · ${h > 0 ? `${h}시간 ` : ""}${mm}분 후`;
}

const CAT_COLOR: Record<string, string> = {
  지원금: "bg-emerald-50 text-emerald-600", 주식: "bg-rose-50 text-rose-500", 대출: "bg-amber-50 text-amber-600",
  부동산: "bg-indigo-50 text-indigo-500", 세금: "bg-cyan-50 text-cyan-600", 생활비: "bg-orange-50 text-orange-500", 앱테크: "bg-violet-50 text-violet-500",
};

export default function MoneyRankCard({ onWrite }: { onWrite: (keyword: string, newsContext: string | undefined, sel: Record<string, unknown>) => void }) {
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const slotRef = useRef<string>("");
  // ★빈틈 찾기(2026-08-11) — 붐빔 소재의 꼬리를 실측 재료에서 발굴(머리 키워드별 결과/로딩 상태)
  const [gaps, setGaps] = useState<Record<string, Item[] | "loading">>({});

  async function findGap(head: string, newsTitle: string) {
    if (gaps[head]) return;
    setGaps((g) => ({ ...g, [head]: "loading" }));
    try {
      const res = await fetch("/api/money-rank/gap", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: head, newsTitle }),
      });
      const data = await res.json();
      setGaps((g) => ({ ...g, [head]: res.ok ? (data.items as Item[]) : [] }));
    } catch {
      setGaps((g) => ({ ...g, [head]: [] }));
    }
  }

  async function scan() {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/money-rank", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "수확에 실패했어요. 잠시 후 자동으로 다시 시도돼요."); return; }
      setItems(data.items as Item[]);
      slotRef.current = slotKey();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ slot: slotRef.current, items: data.items })); } catch { /* 무해 */ }
    } catch {
      setErr("네트워크가 잠깐 불안정해요. 잠시 후 자동으로 다시 시도돼요.");
    } finally {
      setBusy(false);
    }
  }

  // 자동 교체 — 진입 시 이 슬롯 수확이 없으면 수확, 열려 있는 동안에도 교체 시각이 지나면 스스로 갈아끼운다.
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as { slot: string; items: Item[] } | null;
      if (c?.items?.length && c.slot === slotKey()) { setItems(c.items); slotRef.current = c.slot; }
      else void scan();
    } catch { void scan(); }
    setCountdown(nextChangeLabel());
    const t = setInterval(() => {
      setCountdown(nextChangeLabel());
      if (slotRef.current && slotRef.current !== slotKey()) void scan();
    }, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bigFirst = (a: Item, b: Item) => Number(b.big === true) - Number(a.big === true); // ★대형 스파이크 후보 우선(2026-08-12 판정: 300 벽의 답은 대형 히트 재현)
  const picks = (items ?? []).filter((i) => i.verdict === "direct").sort(bigFirst);
  const crowded = (items ?? []).filter((i) => i.verdict === "crowded").sort(bigFirst);
  const writtenOnes = (items ?? []).filter((i) => i.verdict === "written");

  return (
    <section className="mb-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-extrabold text-neutral-900">머니 랭킹</h2>
          <p className="mt-0.5 text-[12px] text-neutral-500">많이 본 뉴스에서 돈 되는 소재만 — 06:30 · 09:30 · 13:00 · 17:30 자동 교체</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#1D75F7]/[0.08] px-3 py-1.5 text-[11.5px] font-bold text-[#1D75F7] tabular-nums">
          {busy ? "새 소재 수확 중…" : countdown}
        </span>
      </div>
      {err && <p className="mt-2 text-[12px] font-semibold text-rose-500">{err}</p>}

      {items && (
        <div className="mt-3 space-y-1.5">
          {picks.length === 0 && crowded.length === 0 && (
            <p className="rounded-xl bg-[#FAFBFC] px-3 py-2.5 text-[12.5px] text-neutral-500">이 시간대 랭킹엔 돈 되는 소재가 없어요 — {countdown.replace("교체 · ", "에 자동으로 다시 수확해요 (")})</p>
          )}
          {picks.slice(0, 5).map((i) => (
            <div key={i.keyword} className="flex items-center gap-2 rounded-xl bg-[#F5F9FF] px-3 py-2">
              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${CAT_COLOR[i.cat] ?? "bg-neutral-100 text-neutral-500"}`}>{i.cat}</span>
              <span className="min-w-0 flex-1 truncate text-[13px]">{i.big && <span className="mr-1 rounded bg-orange-100 px-1 py-0.5 text-[10px] font-extrabold text-orange-600">🔥 대형</span>}<b className="font-bold text-neutral-900">{i.issue}</b><span className="text-neutral-400"> — {i.keyword}</span></span>
              <SimilarChip similar={i.similar} />
              {i.docs != null && <span className="shrink-0 text-[11.5px] font-semibold text-neutral-500">글 {i.docs.toLocaleString()}편</span>}
              <button onClick={() => onWrite(i.keyword, i.newsTitle || undefined, { species: "money_rank", mrAngle: "search", mrCat: i.cat, mrDocs: i.docs })}
                className="at-press shrink-0 rounded-full bg-[#1D75F7] px-3 py-1 text-[11.5px] font-bold text-white transition hover:bg-[#1667DE]">
                검색각 쓰기
              </button>
            </div>
          ))}
          {crowded.slice(0, 4).map((i) => {
            const gap = gaps[i.keyword];
            return (
              <div key={i.keyword}>
                <div className="flex items-center gap-2 rounded-xl bg-[#FAFBFC] px-3 py-2">
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${CAT_COLOR[i.cat] ?? "bg-neutral-100 text-neutral-500"}`}>{i.cat}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{i.big && <span className="mr-1 rounded bg-orange-100 px-1 py-0.5 text-[10px] font-extrabold text-orange-600">🔥 대형</span>}<b className="font-semibold text-neutral-700">{i.issue}</b><span className="text-neutral-400"> — 검색은 붐빔({(i.docs ?? 0) >= 10000 ? `${Math.round((i.docs ?? 0) / 10000)}만` : i.docs}편)</span></span>
                  <SimilarChip similar={i.similar} />
                  <button onClick={() => void findGap(i.keyword, i.newsTitle)} disabled={gap === "loading"}
                    className="at-press shrink-0 rounded-full bg-white px-3 py-1 text-[11.5px] font-bold text-emerald-600 shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition hover:bg-emerald-50 disabled:opacity-60">
                    {gap === "loading" ? "빈틈 찾는 중…" : "빈틈 찾기"}
                  </button>
                  <button onClick={() => onWrite(i.keyword, i.newsTitle || undefined, { species: "money_rank", mrAngle: "homefeed", mrCat: i.cat, mrDocs: i.docs })}
                    className="at-press shrink-0 rounded-full bg-white px-3 py-1 text-[11.5px] font-bold text-[#1D75F7] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition hover:bg-[#F5F9FF]">
                    홈판각 쓰기
                  </button>
                </div>
                {Array.isArray(gap) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {gap.filter((t) => t.verdict === "direct").length === 0 && (
                      <p className="px-3 py-1.5 text-[12px] text-neutral-400">빈 꼬리가 안 보여요 — 이 소재는 홈판각이 답이에요</p>
                    )}
                    {gap.filter((t) => t.verdict === "direct").map((t) => (
                      <div key={t.keyword} className="flex items-center gap-2 rounded-xl bg-emerald-50/60 px-3 py-1.5">
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-neutral-800">{t.keyword}<span className="ml-1.5 font-semibold text-emerald-600">· {t.issue}</span></span>
                        <SimilarChip similar={t.similar} />
                        {t.docs != null && <span className="shrink-0 text-[11px] font-semibold text-neutral-500">글 {t.docs.toLocaleString()}편</span>}
                        <button onClick={() => onWrite(t.keyword, t.newsTitle || i.newsTitle || undefined, { species: "money_rank", mrAngle: "gap", mrHead: i.keyword, mrDocs: t.docs })}
                          className="at-press shrink-0 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-600">
                          이 꼬리로 쓰기
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {writtenOnes.slice(0, 3).map((i) => (
            <div key={i.keyword} className="flex items-center gap-2 rounded-xl bg-[#FAFBFC] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-neutral-400">{i.issue} — {i.keyword}</span>
              <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">이미 심었어요 ✓</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
