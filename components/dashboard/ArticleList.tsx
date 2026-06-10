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
type Sort = "new" | "old" | "long" | "short";

const SORT_LABEL: Record<Sort, string> = {
  new: "최신순",
  old: "오래된순",
  long: "글자 많은순",
  short: "글자 적은순",
};

export default function ArticleList({
  articles: allArticles,
  onOpen,
  onGoGenerate,
  onUpdated,
  wpConnected,
}: {
  articles: Article[];
  onOpen: (article: Article) => void;
  onGoGenerate: () => void;
  onUpdated?: (a: Article) => void;
  wpConnected?: boolean;
}) {
  // 생성 중인 자리표시 글은 목록·카운트에서 제외 (메인의 '생성 중' 카드에서만 보여줌)
  const articles = allArticles.filter((a) => a.status !== "generating");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [sortOpen, setSortOpen] = useState(false);
  const [confirmUnpub, setConfirmUnpub] = useState<Article | null>(null);
  const [unpubBusy, setUnpubBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // 워드프레스에서 직접 내리거나 지운 글을 우리 상태로 동기화
  async function syncWp() {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/wordpress/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.changed)) {
        for (const c of data.changed as { id: string; status: Article["status"]; clearedWp: boolean }[]) {
          const a = articles.find((x) => x.id === c.id);
          if (a) onUpdated?.({ ...a, status: c.status, ...(c.clearedWp ? { wp_post_id: null, wp_link: null } : {}) });
        }
        setSyncMsg(data.changed.length ? `${data.changed.length}개 글 상태를 맞췄어요` : "이미 최신이에요");
      } else {
        setSyncMsg(data.error ?? "동기화하지 못했어요");
      }
    } catch {
      setSyncMsg("동기화하지 못했어요");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 2500);
    }
  }

  async function doUnpublish() {
    if (!confirmUnpub || unpubBusy) return;
    setUnpubBusy(true);
    try {
      const res = await fetch("/api/wordpress/unpublish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: confirmUnpub.id }),
      });
      const data = await res.json();
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
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" /><path d="M9 13h6M9 17h4" />
          </svg>
        </div>
        <p className="mt-4 text-base font-semibold text-neutral-900">아직 만든 글이 없어요</p>
        <p className="mt-1 text-sm text-neutral-500">키워드 하나만 입력하면 첫 글이 완성돼요.</p>
        <button
          onClick={onGoGenerate}
          className="mt-5 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
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
        <Segmented
          options={statusChips.map((c) => ({ value: c.key, label: c.label, count: counts[c.key] }))}
          value={status}
          onChange={setStatus}
        />

        <div className="flex shrink-0 items-center gap-2">
          {wpConnected && (
            <button
              onClick={syncWp}
              disabled={syncing}
              title="워드프레스에서 직접 글을 삭제·발행·숨김 처리했을 때, 누르면 내 글 목록 상태에도 반영돼요. (예약 발행은 자동으로 맞춰져요)"
              className="flex items-center gap-1.5 rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-900 disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={syncing ? "animate-spin" : ""}><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
              {syncing ? "동기화 중…" : "동기화"}
            </button>
          )}
          <div className="relative">
          <button
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-900"
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
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-neutral-700">조건에 맞는 글이 없어요</p>
          <p className="mt-1 text-xs text-neutral-500">검색어나 필터를 바꿔보세요.</p>
          <button
            onClick={() => { setQuery(""); setStatus("all"); setSort("new"); }}
            className="mt-4 rounded-lg border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900"
          >
            필터 초기화
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-neutral-100 bg-white shadow-sm p-5 transition hover:border-neutral-400"
            >
              <button onClick={() => onOpen(a)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  {a.locked ? (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">🔒 미리보기</span>
                  ) : (
                    <span className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status]}`}>
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
              {(a.status === "published" || a.status === "future") && !a.locked ? (
                <button
                  onClick={() => setConfirmUnpub(a)}
                  title="발행 취소(글 내리기)"
                  className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17V3M6 11l6 6 6-6M5 21h14" /></svg>
                  내리기
                </button>
              ) : (
                <span className="shrink-0 text-sm text-neutral-300">→</span>
              )}
            </div>
          ))}
        </div>
      )}

      <CenterToast message={syncMsg} />

      {/* 글 내리기 확인 */}
      {confirmUnpub && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-6" onClick={() => !unpubBusy && setConfirmUnpub(null)}>
          <div className="ateflo-fade-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold">정말로 글을 내리시겠어요?</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              워드프레스에서 비공개로 바뀌고 ‘초안’이 돼요. 글은 지워지지 않아서 언제든 다시 발행할 수 있어요.
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
