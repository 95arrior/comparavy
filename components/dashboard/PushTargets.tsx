"use client";

import { useEffect, useState } from "react";

// ★승부처 목록(2026-07-29 유저 요청) — "지금 밀면 넘어가는 글".
//  배경(실측): 3주차에 전 키워드가 5.8~7.9위인데 클릭 0. 순위를 못 잡는 게 아니라 1페이지 아래쪽이라 안 눌리는 것.
//  그래서 이 화면은 '순위표'가 아니라 '오늘 어느 글에 화력을 쓸지' 하나만 답한다(선택의 여지 제거).

interface QueryRow { query: string; impressions: number; clicks: number; position: number }
interface Opportunity {
  page: string; title: string | null; articleId: string | null;
  impressions: number; clicks: number; position: number; gain: number; queries: QueryRow[];
}
interface Data { opportunities: Opportunity[]; zeroClick: QueryRow[]; totalGain: number; days: number }

const fmtGain = (g: number): string => (g >= 10 ? String(Math.round(g)) : String(Math.round(g * 10) / 10));

export default function PushTargets({ onOpenArticle }: { onOpenArticle?: (articleId: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "unconnected" | "error">("loading");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/searchconsole/opportunities?days=28");
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setState(d?.connect ? "unconnected" : "error"); return; }
        setData(d as Data);
        setState("ok");
      } catch { setState("error"); }
    })();
  }, []);

  // 로딩 — 높이를 미리 잡아 카드가 튀지 않게(레이아웃 안정성 원칙)
  if (state === "loading") {
    return (
      <div className="rounded-2xl at-glass p-5">
        <p className="text-[15px] font-bold text-neutral-900">지금 밀면 넘어가는 글</p>
        <div className="mt-3 space-y-2.5">
          {[0, 1, 2].map((i) => <div key={i} className="at-ai-swap h-[58px] rounded-xl bg-neutral-50" />)}
        </div>
      </div>
    );
  }

  if (state === "unconnected") {
    return (
      <div className="rounded-2xl at-glass p-5">
        <p className="text-[15px] font-bold text-neutral-900">지금 밀면 넘어가는 글</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-400">구글 서치콘솔을 연결하면, 1페이지에 걸친 글을 자동으로 골라드려요.</p>
        <a href="/api/searchconsole/connect" className="at-press mt-3 block w-full rounded-[12px] tk-grad-cta py-3 text-center text-[13.5px] font-bold text-white">서치콘솔 연결하기</a>
      </div>
    );
  }

  if (state === "error") return null; // 조용히 — 성과 화면 전체를 막지 않는다

  const opps = data?.opportunities ?? [];
  if (opps.length === 0) {
    return (
      <div className="rounded-2xl at-glass p-5">
        <p className="text-[15px] font-bold text-neutral-900">지금 밀면 넘어가는 글</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-400">아직 1페이지에 걸친 글이 없어요. 발행이 쌓이면 여기에 나타나요 — 그때부터가 진짜 시작이에요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl at-glass p-5">
      <p className="text-[15px] font-bold text-neutral-900">지금 밀면 넘어가는 글</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-400">
        1페이지에 걸쳐 있는데 상위 3 밖이에요. 새 글보다 이 글들을 올리는 게 빨라요.
        {data && data.totalGain >= 1 && <> 전부 3위로 올리면 <b className="text-[#1D75F7]">한 달 +{fmtGain(data.totalGain)}클릭</b>.</>}
      </p>

      <div className="mt-3 space-y-2">
        {opps.map((o) => {
          const top = o.queries[0];
          const row = (
            <>
              <div className="flex items-center gap-3">
                <span className="shrink-0 rounded-lg bg-[#1D75F7]/10 px-2 py-1 text-[12px] font-extrabold tabular-nums text-[#1D75F7]">{o.position.toFixed(1)}위</span>
                <p className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-neutral-900">{o.title ?? o.page.replace(/^https?:\/\/[^/]+/, "")}</p>
              </div>
              <p className="mt-1.5 truncate text-[11.5px] text-neutral-400">
                {top && <>‘{top.query}’ </>}노출 {o.impressions.toLocaleString("ko-KR")}
                {o.clicks > 0 && <> · 클릭 {o.clicks}</>}
                {o.gain >= 0.5 && <> · 3위면 <b className="font-bold text-neutral-500">+{fmtGain(o.gain)}클릭</b></>}
              </p>
            </>
          );
          return o.articleId && onOpenArticle ? (
            <button key={o.page} onClick={() => onOpenArticle(o.articleId!)} className="at-press block w-full rounded-xl bg-white/70 px-3.5 py-3 text-left ring-1 ring-black/[0.04] transition hover:bg-[#1D75F7]/[0.04]">{row}</button>
          ) : (
            <div key={o.page} className="rounded-xl bg-white/70 px-3.5 py-3 ring-1 ring-black/[0.04]">{row}</div>
          );
        })}
      </div>

      {data && data.zeroClick.length > 0 && (
        <p className="mt-3 text-[11.5px] leading-relaxed text-neutral-300">
          집계에서 뺀 검색어 · {data.zeroClick.slice(0, 3).map((z) => z.query).join(", ")} — 뜻만 묻는 검색어는 1위를 해도 AI 요약이 답을 끝내요.
        </p>
      )}
    </div>
  );
}
