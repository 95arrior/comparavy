"use client";

import { useEffect, useState } from "react";
import type { Article } from "./types";

// 주제 시리즈 — 한 주제를 순서대로 깊게(연재) → 네이버·구글이 '전문 블로그'로 인식(C-Rank 가속).
interface SeriesItem { title: string; keyword: string }

export default function SeriesSheet({
  articles,
  onWrite,
  onClose,
}: {
  articles: Article[];
  onWrite: (keyword: string, title: string) => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("");
  const [items, setItems] = useState<SeriesItem[]>([]);

  useEffect(() => {
    fetch("/api/topics/series")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setItems(Array.isArray(d?.items) ? d.items : []);
        setTheme(typeof d?.theme === "string" ? d.theme : "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const written = new Set(articles.filter((a) => a.status !== "generating").map((a) => (a.keyword || "").replace(/\s/g, "")));
  const isDone = (kw: string) => written.has(kw.replace(/\s/g, ""));

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="ateflo-sheet-up flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white sm:rounded-3xl" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
        <div className="px-6 pt-6">
          <p className="text-[11px] font-bold text-[#1D75F7]">📚 주제 시리즈</p>
          <p className="mt-1 text-[17px] font-bold tracking-tight text-neutral-900">{theme || "이 분야 전문 블로그 되기"}</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">순서대로 쓰면 <b className="text-[#1D75F7]">전문 블로그</b>로 인식돼 상위노출에 유리해요</p>
        </div>
        <div className="mt-3 flex-1 overflow-y-auto px-6 pb-2">
          {loading ? (
            <div className="flex h-44 items-center justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-[#1D75F7]" /></div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-400">시리즈를 불러오지 못했어요.<br />잠시 후 다시 열어 주세요.</p>
          ) : (
            <ol className="space-y-2">
              {items.map((it, i) => {
                const done = isDone(it.keyword);
                return (
                  <li key={i} className="flex items-start gap-3 rounded-xl bg-neutral-50 px-3 py-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${done ? "bg-emerald-500 text-white" : "bg-white text-neutral-400 ring-1 ring-neutral-200"}`}>{done ? "✓" : i + 1}</span>
                    <span className={`min-w-0 flex-1 text-[13.5px] font-semibold leading-snug ${done ? "text-neutral-400 line-through decoration-neutral-300" : "text-neutral-900"}`}>{it.title}</span>
                    {!done && (
                      <button onClick={() => { onWrite(it.keyword, it.title); onClose(); }} className="mt-0.5 shrink-0 rounded-lg bg-[#1D75F7] px-3 py-1.5 text-[12px] font-bold text-white transition hover:opacity-90 active:scale-95">쓰기</button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <button onClick={onClose} className="m-4 mt-2 rounded-xl bg-neutral-100 py-3 text-[14px] font-bold text-neutral-600 transition hover:bg-neutral-200">닫기</button>
      </div>
    </div>
  );
}
