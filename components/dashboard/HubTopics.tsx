"use client";

import { useState } from "react";

// ★허브 글감(2026-07-29 유저 요청) — 유입 검색어를 붙여넣으면 뭉친 주제를 찾아 '허브 글감'을 제안한다.
//  왜 붙여넣기인가: 네이버는 서치콘솔 같은 API가 없어 유입 검색어를 자동으로 가져올 방법이 없다.
//  주 1회 복사-붙여넣기 한 번이면 되고, 그 대가로 '어느 주제에 허브를 세울지'가 자동으로 나온다.

interface HubTopic { core: string; keyword: string; title: string; why: string; queries: string[]; share: number }
interface Cluster { core: string; queries: string[]; share: number }

export default function HubTopics({ onWriteKeyword }: { onWriteKeyword?: (keyword: string, title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [topics, setTopics] = useState<HubTopic[] | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [note, setNote] = useState<string | null>(null);

  async function analyze() {
    if (busy || !text.trim()) return;
    setBusy(true); setErr(null); setNote(null);
    try {
      const r = await fetch("/api/hub-topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(120_000) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? "분석하지 못했어요"); return; }
      setTopics(Array.isArray(d.topics) ? d.topics : []);
      setClusters(Array.isArray(d.clusters) ? d.clusters : []);
      if (d.note) setNote(String(d.note));
    } catch { setErr("네트워크 오류예요"); }
    setBusy(false);
  }

  return (
    <div className="rounded-2xl at-glass p-5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start justify-between gap-3 text-left">
        <span className="min-w-0">
          <span className="block text-[15px] font-bold text-neutral-900">허브 글감 찾기</span>
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-neutral-400">
            한 주제의 꼬리 질문을 여러 개 먹고 있으면, 그 위에 글 하나를 세울 때예요.
          </span>
        </span>
        <span className={`shrink-0 pt-1 text-[12px] font-bold text-[#1D75F7] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="mt-4">
          <p className="text-[12px] leading-relaxed text-neutral-500">
            네이버 블로그 <b className="text-neutral-700">통계 → 유입분석 → 상세 유입경로</b>를 드래그해 복사한 뒤 그대로 붙여넣으세요. 한 줄에 검색어 하나면 됩니다.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={"삼성카드 발급 심사 시간 3.13%\n삼성카드 발급취소 1.88%\n삼성카드 배송조회 1.25%\n채무탕감제도 2.27%\n…"}
            className="mt-3 w-full rounded-xl bg-white/70 p-3.5 text-[13px] leading-relaxed text-neutral-800 outline-none ring-1 ring-black/[0.06] focus:ring-[#1D75F7]/40"
          />
          <button onClick={analyze} disabled={busy || !text.trim()} className="at-press mt-2 w-full rounded-[12px] tk-grad-cta py-3 text-[13.5px] font-bold text-white disabled:opacity-50">
            {busy ? <><span className="tk-wand" aria-hidden>✦</span> 뭉친 주제를 찾는 중…</> : "✦ 허브 글감 찾기"}
          </button>
          {err && <p className="mt-2 text-[12.5px] font-medium text-amber-600">{err}</p>}
          {note && <p className="mt-2 text-[12.5px] leading-relaxed text-neutral-400">{note}</p>}

          {topics && topics.length > 0 && (
            <div className="mt-4 space-y-2.5">
              {topics.map((t) => (
                <div key={t.keyword} className="rounded-xl bg-white/70 p-4 ring-1 ring-black/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-md bg-[#1D75F7]/10 px-2 py-0.5 text-[11px] font-bold text-[#1D75F7]">{t.core}</span>
                    <span className="text-[11.5px] font-semibold text-neutral-400">꼬리 질문 {t.queries.length}개{t.share > 0 ? ` · 유입 ${t.share}%` : ""}</span>
                  </div>
                  <p className="mt-2 text-[14px] font-bold leading-snug text-neutral-900">{t.title}</p>
                  <p className="mt-1 text-[12px] text-neutral-400">노리는 검색어 · {t.keyword}</p>
                  {t.why && <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">{t.why}</p>}
                  <p className="mt-2 truncate text-[11.5px] text-neutral-300">{t.queries.slice(0, 4).join(" · ")}</p>
                  {onWriteKeyword && (
                    <button onClick={() => onWriteKeyword(t.keyword, t.title)} className="at-press mt-3 w-full rounded-[12px] bg-[#1D75F7]/[0.07] py-2.5 text-[13px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/[0.12]">
                      이 허브 글감으로 쓰기
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {topics && topics.length === 0 && clusters.length > 0 && (
            <div className="mt-4 rounded-xl bg-white/70 p-4 ring-1 ring-black/[0.04]">
              <p className="text-[13px] font-bold text-neutral-800">뭉친 주제는 찾았지만 글감이 남지 않았어요</p>
              <p className="mt-1 text-[12px] leading-relaxed text-neutral-400">이미 쓴 글과 겹치거나 글감 검문에 걸렸어요. 뭉친 주제는 이렇습니다 — 직접 각도를 잡아보셔도 좋아요.</p>
              <p className="mt-2 text-[12px] text-neutral-500">{clusters.map((c) => `${c.core}(${c.queries.length})`).join(" · ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
