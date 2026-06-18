"use client";

import type { QueueItem } from "@/lib/keywordQueue";

const STATUS: Record<string, { label: string; cls: string }> = {
  queued: { label: "대기", cls: "bg-neutral-100 text-neutral-500" },
  generating: { label: "생성 중", cls: "bg-[#1D75F7]/10 text-[#2f7fe6]" },
  done: { label: "완료", cls: "bg-emerald-50 text-emerald-600" },
  failed: { label: "실패", cls: "bg-amber-50 text-amber-600" },
};

function fmtDate(d: string | null): string {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${Number(m)}/${Number(day)}`;
}

/** 발행 계획(키워드 예약 큐) — 담은 키워드의 예정일·상태를 보여준다. */
export default function KeywordQueue({
  queue,
  onDelete,
  onOpenArticle,
  onGoFind,
}: {
  queue: QueueItem[];
  onDelete: (id: string) => void;
  onOpenArticle: (articleId: string) => void;
  onGoFind: () => void;
}) {
  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-pretendard text-2xl font-bold tracking-tight">발행 계획</h1>
        <p className="mt-3 text-sm text-neutral-500">아직 큐가 비어 있어요. 키워드를 골라 담아보세요.</p>
        <button
          onClick={onGoFind}
          className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition"
          style={{ backgroundColor: "#1D75F7" }}
        >
          키워드 발굴하러 가기 →
        </button>
      </div>
    );
  }

  const done = queue.filter((q) => q.status === "done").length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <h1 className="font-pretendard text-2xl font-bold tracking-tight sm:text-3xl">발행 계획</h1>
        <p className="mx-auto mt-3 text-sm text-neutral-500">
          담은 키워드 {queue.length}개 · 완료 {done}개. 예정일에 맞춰 하나씩 발행돼요.
        </p>
      </div>

      <ul className="mt-8 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
        {queue.map((q) => {
          const st = STATUS[q.status] ?? STATUS.queued;
          return (
            <li key={q.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="w-10 shrink-0 text-center text-xs font-medium text-neutral-400">{fmtDate(q.scheduled_for)}</span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">{q.keyword}</p>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
              {q.status === "done" && q.article_id && (
                <button onClick={() => onOpenArticle(q.article_id!)} className="shrink-0 text-xs font-medium text-[#2f7fe6] hover:underline">보기</button>
              )}
              {q.status !== "done" && (
                <button onClick={() => onDelete(q.id)} aria-label="삭제" className="shrink-0 text-neutral-300 transition hover:text-red-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
