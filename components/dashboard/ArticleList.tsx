"use client";

import { useMemo, useState } from "react";
import type { Article } from "./types";

const STATUS_LABEL: Record<Article["status"], string> = {
  draft: "초안",
  published: "발행됨",
  future: "예약됨",
};

const STATUS_STYLE: Record<Article["status"], string> = {
  draft: "bg-neutral-100 text-neutral-600",
  // 발행됨은 한눈에 띄게 진한 초록 + 흰 글씨
  published: "bg-emerald-600 text-white",
  future: "bg-amber-100 text-amber-700",
};

type StatusFilter = "all" | Article["status"];
type Sort = "new" | "old" | "long" | "short";

const SORT_LABEL: Record<Sort, string> = {
  new: "최신순",
  old: "오래된순",
  long: "글자 많은순",
  short: "글자 적은순",
};

export default function ArticleList({
  articles,
  onOpen,
  onGoGenerate,
}: {
  articles: Article[];
  onOpen: (article: Article) => void;
  onGoGenerate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [sortOpen, setSortOpen] = useState(false);

  // 상태별 개수 (필터 칩에 표시)
  const counts = useMemo(() => {
    const c = { all: articles.length, draft: 0, published: 0, future: 0 } as Record<StatusFilter, number>;
    for (const a of articles) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = articles.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (q && !(`${a.title} ${a.keyword}`.toLowerCase().includes(q))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "long") return (b.char_count ?? 0) - (a.char_count ?? 0);
      if (sort === "short") return (a.char_count ?? 0) - (b.char_count ?? 0);
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sort === "old" ? ta - tb : tb - ta;
    });
    return list;
  }, [articles, query, status, sort]);

  // 글이 아예 없을 때
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
        <p className="text-sm text-neutral-500">아직 생성한 글이 없습니다.</p>
        <button
          onClick={onGoGenerate}
          className="mt-4 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          첫 글 생성하기
        </button>
      </div>
    );
  }

  const statusChips: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "published", label: "발행됨" },
    { key: "future", label: "예약됨" },
    { key: "draft", label: "초안" },
  ];

  return (
    <div>
      {/* 검색 */}
      <div className="relative">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·키워드 검색"
          className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-neutral-900"
        />
      </div>

      {/* 상태 필터 + 정렬 */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusChips.map((c) => (
            <button
              key={c.key}
              onClick={() => setStatus(c.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                status === c.key ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {c.label}
              {counts[c.key] > 0 && <span className={status === c.key ? "ml-1 text-white/60" : "ml-1 text-neutral-400"}>{counts[c.key]}</span>}
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-900"
          >
            {SORT_LABEL[sort]}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-neutral-400 transition-transform ${sortOpen ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
              <div className="ateflo-dropdown absolute right-0 top-full z-50 mt-2 w-36 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl">
                {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSort(s); setSortOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-neutral-100 ${sort === s ? "font-medium text-neutral-900" : "text-neutral-600"}`}
                  >
                    {SORT_LABEL[s]}
                    {sort === s && <span className="text-emerald-600">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          조건에 맞는 글이 없어요.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400"
            >
              <button onClick={() => onOpen(a)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  {a.locked ? (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">🔒 미리보기</span>
                  ) : (
                    <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  )}
                  <span className="min-w-0 truncate text-xs text-neutral-400">{a.keyword}</span>
                </div>
                <h3 className="mt-2 truncate text-base font-medium tracking-tight">{a.title}</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  {(a.char_count ?? 0).toLocaleString()}자 · {new Date(a.created_at).toLocaleDateString("ko-KR")}
                </p>
              </button>
              <span className="shrink-0 text-sm text-neutral-300">→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
