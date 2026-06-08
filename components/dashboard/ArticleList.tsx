"use client";

import type { Article } from "./types";

const STATUS_LABEL: Record<Article["status"], string> = {
  draft: "초안",
  published: "발행됨",
  future: "예약됨",
};

const STATUS_STYLE: Record<Article["status"], string> = {
  draft: "bg-neutral-100 text-neutral-600",
  published: "bg-emerald-100 text-emerald-700",
  future: "bg-amber-100 text-amber-700",
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

  return (
    <div className="space-y-3">
      {articles.map((a) => (
        <div
          key={a.id}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400"
        >
          <button onClick={() => onOpen(a)} className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2">
              {a.locked ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">🔒 미리보기</span>
              ) : (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status]}`}>
                  {STATUS_LABEL[a.status]}
                </span>
              )}
              <span className="truncate text-xs text-neutral-400">{a.keyword}</span>
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
  );
}
