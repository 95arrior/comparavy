"use client";

import { useState } from "react";

/**
 * ★결핍 레이더(2026-08-10) — 버튼 하나로 지식iN 질문·카페 버즈를 수확해 오늘 심을 소재를 받는다.
 * 어드바이저 스크린샷 카드(MorningBriefing)의 후속 — 유저 입력이 아예 없다.
 */

interface RadarItem { keyword: string; src: "kin" | "cafe"; heat: number; docs: number | null; verdict: "direct" | "variant" | "written" | "unmeasured" | "blocked"; reason?: string }

const SRC_LABEL: Record<RadarItem["src"], string> = { kin: "질문", cafe: "카페" };

export default function RadarCard({ onWrite }: { onWrite: (keyword: string, sel: Record<string, unknown>) => void }) {
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<RadarItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function scan() {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/radar", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "수확에 실패했어요. 다시 시도해 주세요."); return; }
      setItems(data.items as RadarItem[]);
    } catch {
      setErr("네트워크가 잠깐 불안정해요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const picks = (items ?? []).filter((i) => i.verdict === "direct");
  const variants = (items ?? []).filter((i) => i.verdict === "variant");
  const writtenOnes = (items ?? []).filter((i) => i.verdict === "written");

  return (
    <section className="mb-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-extrabold text-neutral-900">결핍 레이더</h2>
          <p className="mt-0.5 text-[12px] text-neutral-500">사람들이 지금 묻고 있는 돈 고민에서, 심을 만한 소재만 골라드려요</p>
        </div>
        <button
          onClick={scan}
          disabled={busy}
          className="at-press shrink-0 rounded-full bg-[#1D75F7] px-3.5 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#1667DE] disabled:opacity-60"
        >
          {busy ? "수확 중…" : items ? "다시 수확" : "지금 수확하기"}
        </button>
      </div>
      {err && <p className="mt-2 text-[12px] font-semibold text-rose-500">{err}</p>}

      {items && (
        <div className="mt-3 space-y-1.5">
          {picks.length === 0 && (
            <p className="rounded-xl bg-[#FAFBFC] px-3 py-2.5 text-[12.5px] text-neutral-500">
              지금은 선점 구간 소재가 없어요 — 몇 시간 뒤 다시 수확해 보세요.
            </p>
          )}
          {picks.slice(0, 8).map((i) => (
            <div key={i.keyword} className="flex items-center gap-2 rounded-xl bg-[#F5F9FF] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-neutral-900">{i.keyword}</span>
              <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#1D75F7]">{SRC_LABEL[i.src]}{i.heat >= 2 ? ` ${i.heat}건` : ""}</span>
              {i.docs != null && <span className="shrink-0 text-[11.5px] font-semibold text-neutral-500">글 {i.docs.toLocaleString()}편</span>}
              <button
                onClick={() => onWrite(i.keyword, { species: "lack_radar", radarSrc: i.src, radarHeat: i.heat, radarDocs: i.docs })}
                className="at-press shrink-0 rounded-full bg-[#1D75F7] px-3 py-1 text-[11.5px] font-bold text-white transition hover:bg-[#1667DE]"
              >
                이 키워드로 쓰기
              </button>
            </div>
          ))}
          {variants.slice(0, 3).map((i) => (
            <div key={i.keyword} className="flex items-center gap-2 rounded-xl bg-[#FAFBFC] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-neutral-600">{i.keyword}</span>
              <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-600">글 {i.docs?.toLocaleString()}편 — 이미 붐벼요</span>
            </div>
          ))}
          {writtenOnes.slice(0, 3).map((i) => (
            <div key={i.keyword} className="flex items-center gap-2 rounded-xl bg-[#FAFBFC] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-neutral-400">{i.keyword}</span>
              <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">이미 심었어요 ✓</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
