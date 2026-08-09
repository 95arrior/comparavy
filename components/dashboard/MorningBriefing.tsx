"use client";

import { useState } from "react";

/**
 * ★아침 브리핑(답안지 레인 1단계, 2026-08-10) — docs/answer-sheet-lane.md
 * 네이버 크리에이터 어드바이저 '인기유입검색어'를 통째로 붙여넣으면
 * 검색어 추출 → 며칠째 등장 → 문서수 측정 → "오늘 심을 것"을 골라준다.
 * 판단은 전부 서버 몫(뇌빼기) — 유저는 복사·붙여넣기·버튼 하나.
 */

interface BriefItem { keyword: string; days: number; docs: number | null; verdict: "direct" | "variant" | "unmeasured" | "blocked"; reason?: string }
interface DayLog { date: string; keywords: string[] }

const LS_KEY = "ateflo_answer_sheet_days";

function kstToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}
function loadHistory(): DayLog[] {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export default function MorningBriefing({ onWrite }: { onWrite: (keyword: string, sel: Record<string, unknown>) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<BriefItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function analyze() {
    const raw = text.trim();
    if (!raw || busy) return;
    setBusy(true); setErr(null);
    try {
      const today = kstToday();
      const history = loadHistory().filter((d) => d.date !== today);
      const res = await fetch("/api/briefing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw, history }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "분석에 실패했어요. 다시 시도해 주세요."); return; }
      setItems(data.items as BriefItem[]);
      setOpen(false); // 결과는 접힌 화면에 뜬다 — 분석이 끝나면 바로 보여줘야 한다(붙여넣기 원문은 볼 일이 끝났다)
      // 오늘 목록을 기록 — 내일부터 'N일째'가 자동으로 계산된다(같은 날 재분석은 합집합).
      const parsed: string[] = Array.isArray(data.parsedKeywords) ? data.parsedKeywords : [];
      const rest = loadHistory().filter((d) => d.date !== today);
      const prevToday = loadHistory().find((d) => d.date === today)?.keywords ?? [];
      const merged = Array.from(new Set([...prevToday, ...parsed]));
      localStorage.setItem(LS_KEY, JSON.stringify([...rest, { date: today, keywords: merged }].slice(-7)));
    } catch {
      setErr("네트워크가 잠깐 불안정해요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const picks = (items ?? []).filter((i) => i.verdict === "direct");
  const variants = (items ?? []).filter((i) => i.verdict === "variant");
  const restCount = (items ?? []).filter((i) => i.verdict === "unmeasured" || i.verdict === "blocked").length;

  return (
    <section className="mb-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-extrabold text-neutral-900">아침 브리핑</h2>
          <p className="mt-0.5 text-[12px] text-neutral-500">어제 실제로 유입을 만든 검색어에서, 오늘 심을 것만 골라드려요</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="at-press shrink-0 rounded-full bg-[#1D75F7]/[0.08] px-3.5 py-1.5 text-[12px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/[0.14]"
        >
          {open ? "접기" : items ? "다시 붙여넣기" : "붙여넣기"}
        </button>
      </div>

      {open && (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={"블로그 통계 → 크리에이터 어드바이저 → 검색 유입 트렌드 화면을\n전체 선택(⌘A) 복사해서 그대로 붙여넣으면 돼요"}
            className="w-full resize-none rounded-xl border border-neutral-200 bg-[#FAFBFC] p-3 text-[13px] leading-relaxed text-neutral-800 outline-none transition focus:border-[#1D75F7]/50 focus:bg-white"
          />
          <button
            onClick={analyze}
            disabled={busy || !text.trim()}
            className="at-press mt-2 w-full rounded-xl bg-[#1D75F7] py-2.5 text-[13px] font-bold text-white transition hover:bg-[#1667DE] disabled:opacity-50"
          >
            {busy ? "검색어 추출하고 문서수 재는 중…" : "오늘 심을 키워드 고르기"}
          </button>
          {err && <p className="mt-2 text-[12px] font-semibold text-rose-500">{err}</p>}
        </div>
      )}

      {items && !open && (
        <div className="mt-3 space-y-1.5">
          {picks.length === 0 && (
            <p className="rounded-xl bg-[#FAFBFC] px-3 py-2.5 text-[12.5px] text-neutral-500">
              오늘은 선점 구간 검색어가 없어요 — 내일 아침 다시 붙여넣어 보세요.
            </p>
          )}
          {picks.slice(0, 8).map((i) => (
            <div key={i.keyword} className="flex items-center gap-2 rounded-xl bg-[#F5F9FF] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-neutral-900">{i.keyword}</span>
              <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#1D75F7]">{i.days >= 2 ? `${i.days}일째` : "신규"}</span>
              {i.docs != null && <span className="shrink-0 text-[11.5px] font-semibold text-neutral-500">글 {i.docs.toLocaleString()}편</span>}
              <button
                onClick={() => onWrite(i.keyword, { species: "answer_sheet", asDocs: i.docs, asDays: i.days, asDate: kstToday() })}
                className="at-press shrink-0 rounded-full bg-[#1D75F7] px-3 py-1 text-[11.5px] font-bold text-white transition hover:bg-[#1667DE]"
              >
                이 키워드로 쓰기
              </button>
            </div>
          ))}
          {variants.slice(0, 4).map((i) => (
            <div key={i.keyword} className="flex items-center gap-2 rounded-xl bg-[#FAFBFC] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-neutral-600">{i.keyword}</span>
              <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-600">글 {i.docs?.toLocaleString()}편 — 이미 붐벼요</span>
            </div>
          ))}
          {restCount > 0 && (
            <p className="px-1 pt-1 text-[11.5px] text-neutral-400">그 외 {restCount}개는 측정 대기·차단으로 뺐어요</p>
          )}
        </div>
      )}
    </section>
  );
}
