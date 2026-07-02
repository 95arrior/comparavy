"use client";

import { useMemo, useState } from "react";
import type { Article } from "./types";
import CenterToast from "./CenterToast";
import Segmented from "./Segmented";

const STATUS_LABEL: Record<Article["status"], string> = {
  draft: "초안",
  published: "발행됨",
  future: "예약됨",
  generating: "생성 중", // 목록에선 필터링되어 실제로 표시되지 않음
};

const STATUS_STYLE: Record<Article["status"], string> = {
  draft: "bg-neutral-100 text-neutral-600",
  // 발행됨은 한눈에 띄게 진한 초록 + 흰 글씨
  published: "bg-emerald-600 text-white",
  future: "bg-amber-100 text-amber-700",
  generating: "bg-neutral-100 text-neutral-500",
};

type StatusFilter = "all" | Article["status"];

export default function ArticleList({
  articles: allArticles,
  onOpen,
  onGoGenerate,
  onUpdated,
}: {
  articles: Article[];
  onOpen: (article: Article) => void;
  onGoGenerate: () => void;
  onUpdated?: (a: Article) => void;
}) {
  // 생성 중인 자리표시 글은 목록·카운트에서 제외 (메인의 '생성 중' 카드에서만 보여줌)
  const articles = allArticles.filter((a) => a.status !== "generating");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [confirmUnpub, setConfirmUnpub] = useState<Article | null>(null);
  const [unpubBusy, setUnpubBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function doUnpublish() {
    if (!confirmUnpub || unpubBusy) return;
    setUnpubBusy(true);
    try {
      // 네이버는 우리가 직접 못 내림 → 우리 상태만 '초안'으로(실제 글은 사용자가 네이버에서 내림).
      const res = await fetch(`/api/articles/${confirmUnpub.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "draft" }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onUpdated?.({ ...confirmUnpub, status: "draft" });
        setConfirmUnpub(null);
      } else {
        setSyncMsg(data.error ?? "글을 내리지 못했어요. 다시 시도해 주세요.");
        setTimeout(() => setSyncMsg(null), 2500);
      }
    } catch {
      setSyncMsg("글을 내리지 못했어요. 다시 시도해 주세요.");
      setTimeout(() => setSyncMsg(null), 2500);
    } finally {
      setUnpubBusy(false);
    }
  }

  // 상태별 개수 (필터 칩에 표시)
  const counts = useMemo(() => {
    const c = { all: articles.length, draft: 0, published: 0, future: 0, generating: 0 } as Record<StatusFilter, number>;
    for (const a of articles) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles
      .filter((a) => {
        if (status !== "all" && a.status !== status) return false;
        if (q && !(`${a.title} ${a.keyword}`.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // 최신순 고정
  }, [articles, query, status]);

  // 글이 아예 없을 때
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl bg-neutral-50 px-6 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-400 ring-1 ring-black/[0.04]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" /><path d="M9 13h6M9 17h4" />
          </svg>
        </div>
        <p className="mt-4 text-base font-bold text-neutral-900">아직 쓴 글이 없어요</p>
        <p className="mt-1 text-sm text-neutral-400">키워드만 넣으면 글이 만들어져요</p>
        <button
          onClick={onGoGenerate}
          className="mt-5 rounded-xl bg-[#1D75F7] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-95"
        >
          첫 글 생성하기
        </button>
      </div>
    );
  }

  const statusChips: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "published", label: "발행" },
    { key: "draft", label: "초안" },
  ];

  return (
    <div>
      {/* 검색 */}
      <div className="relative">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="글 검색"
          className="w-full rounded-xl bg-neutral-100 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:bg-neutral-50 focus:ring-2 focus:ring-[#1D75F7]/30"
        />
      </div>

      {/* 상태 필터 */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <Segmented
          options={statusChips.map((c) => ({ value: c.key, label: c.label, count: counts[c.key] }))}
          value={status}
          onChange={setStatus}
        />
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-neutral-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-neutral-700">찾는 글이 없어요</p>
          <p className="mt-1 text-xs text-neutral-400">검색어를 바꿔보세요</p>
          <button
            onClick={() => { setQuery(""); setStatus("all"); }}
            className="mt-4 rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-neutral-600 ring-1 ring-neutral-200 transition hover:ring-neutral-400"
          >
            전체 보기
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/[0.04] transition hover:ring-[#1D75F7]/30 active:scale-[0.997] sm:p-5"
            >
              <button onClick={() => onOpen(a)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  {a.locked ? (
                    <span className="shrink-0 whitespace-nowrap rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">🔒 미리보기</span>
                  ) : (
                    <span className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  )}
                  <span className="min-w-0 truncate text-[11px] text-neutral-400">{a.keyword}</span>
                </div>
                <h3 className="mt-1.5 truncate text-[15px] font-bold tracking-tight text-neutral-900">{a.title}</h3>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {(a.char_count ?? 0).toLocaleString()}자 · {new Date(a.created_at).toLocaleDateString("ko-KR")}
                </p>
              </button>
              {(a.status === "published" || a.status === "future") && !a.locked ? (
                <button
                  onClick={() => setConfirmUnpub(a)}
                  title="발행 취소(글 내리기)"
                  className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17V3M6 11l6 6 6-6M5 21h14" /></svg>
                  내리기
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <CenterToast message={syncMsg} />

      {/* 글 내리기 확인 */}
      {confirmUnpub && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-6" onClick={() => !unpubBusy && setConfirmUnpub(null)}>
          <div className="ateflo-fade-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold">‘초안’으로 되돌릴까요?</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              네이버 글은 우리가 직접 못 내려요. 여기선 ‘초안’ 표시만 바뀌어요 — 실제로 내리려면 네이버 블로그에서 직접 삭제·비공개로 바꿔주세요.
            </p>
            <p className="mt-3 truncate text-sm font-medium text-neutral-800">“{confirmUnpub.title}”</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={doUnpublish}
                disabled={unpubBusy}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {unpubBusy ? "내리는 중…" : "내리기"}
              </button>
              <button
                onClick={() => setConfirmUnpub(null)}
                disabled={unpubBusy}
                className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm transition hover:border-neutral-900 disabled:opacity-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
