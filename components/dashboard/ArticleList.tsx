"use client";

import { useMemo, useState } from "react";
import type { Article } from "./types";
import CenterToast from "./CenterToast";

// ★내 글 v2 — 발행 여정 중심의 토스식 리스트.
// 위계: 상태 점(발행=초록/초안=회색) → 제목 → 메타 한 줄. 필터는 텍스트 필 3개.

type StatusFilter = "all" | "published" | "draft";

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
  // 생성 중인 자리표시 글은 목록·카운트에서 제외
  const articles = allArticles.filter((a) => a.status !== "generating");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [confirmUnpub, setConfirmUnpub] = useState<Article | null>(null);
  const [unpubBusy, setUnpubBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
        setMsg(data.error ?? "되돌리지 못했어요. 다시 시도해 주세요.");
        setTimeout(() => setMsg(null), 2500);
      }
    } catch {
      setMsg("되돌리지 못했어요. 다시 시도해 주세요.");
      setTimeout(() => setMsg(null), 2500);
    } finally {
      setUnpubBusy(false);
    }
  }

  const counts = useMemo(() => {
    const c = { all: articles.length, published: 0, draft: 0 } as Record<StatusFilter, number>;
    for (const a of articles) { if (a.status === "published") c.published++; else c.draft++; }
    return c;
  }, [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles
      .filter((a) => {
        if (status === "published" && a.status !== "published") return false;
        if (status === "draft" && a.status === "published") return false;
        if (q && !(`${a.title} ${a.keyword}`.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [articles, query, status]);

  if (articles.length === 0) {
    return (
      <div className="at-rise rounded-2xl at-glass px-6 py-14 text-center ">
        <p className="text-[16px] font-bold text-[color:var(--at-grey-900)]">아직 쓴 글이 없어요</p>
        <p className="mt-1 text-[13px] text-neutral-400">오늘의 글부터 시작해 보세요</p>
        <button
          onClick={onGoGenerate}
          className="at-press mt-5 rounded-xl bg-[#1D75F7] px-6 py-3 text-[14px] font-bold text-white transition hover:opacity-90"
        >
          첫 글 쓰러 가기
        </button>
      </div>
    );
  }

  const pills: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "published", label: "발행" },
    { key: "draft", label: "초안" },
  ];

  return (
    <div>
      {/* 필터 필 + 검색 */}
      <div className="at-rise flex items-center gap-1.5">
        {pills.map((p) => (
          <button
            key={p.key}
            onClick={() => setStatus(p.key)}
            className={`at-press rounded-full px-3.5 py-2 text-[13px] font-bold transition ${
              status === p.key ? "bg-[color:var(--at-grey-900)] text-white" : "bg-white text-[color:var(--at-grey-600)] ring-1 ring-black/[0.05]"
            }`}
          >
            {p.label} <span className={status === p.key ? "text-white/60" : "text-neutral-300"}>{counts[p.key]}</span>
          </button>
        ))}
      </div>
      <div className="at-rise at-d1 relative mt-3">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="글 검색"
          className="w-full rounded-2xl at-glass py-3.5 pl-11 pr-4 text-sm  outline-none transition placeholder:text-neutral-300 focus:ring-2 focus:ring-[#1D75F7]/25"
        />
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="mt-3 rounded-2xl at-glass px-6 py-12 text-center ">
          <p className="text-sm font-semibold text-neutral-600">찾는 글이 없어요</p>
          <button onClick={() => { setQuery(""); setStatus("all"); }} className="mt-3 text-[13px] font-bold text-[#1D75F7]">전체 보기</button>
        </div>
      ) : (
        <div className="at-rise at-d2 mt-3 divide-y divide-neutral-50 overflow-hidden rounded-2xl at-glass ">
          {filtered.map((a) => {
            const published = a.status === "published";
            return (
              <div key={a.id} className="flex items-center gap-3.5 px-5 py-4 transition active:bg-neutral-50">
                <span className={`h-2 w-2 shrink-0 rounded-full ${published ? "bg-emerald-500" : "bg-neutral-200"}`} aria-hidden />
                <button onClick={() => onOpen(a)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[14.5px] font-bold text-[color:var(--at-grey-900)]">{a.title}</p>
                  <p className="mt-0.5 text-[11.5px] font-medium text-neutral-400">
                    {published ? "발행됨" : "초안"} · {(a.char_count ?? 0).toLocaleString()}자 · {new Date(a.created_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                  </p>
                </button>
                {published ? (
                  <button onClick={() => setConfirmUnpub(a)} className="shrink-0 text-[12px] font-semibold text-neutral-300 transition hover:text-neutral-500">
                    초안으로
                  </button>
                ) : (
                  <button onClick={() => onOpen(a)} className="shrink-0 text-[12px] font-bold text-[#03C75A]">
                    올리기 →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CenterToast message={msg} />

      {/* 초안으로 되돌리기 확인 */}
      {confirmUnpub && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-6" onClick={() => !unpubBusy && setConfirmUnpub(null)}>
          <div className="ateflo-fade-in w-full max-w-sm at-glass-strong rounded-3xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-[16px] font-bold text-[color:var(--at-grey-900)]">‘초안’으로 되돌릴까요?</p>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
              여기선 표시만 바뀌어요. 네이버에 올린 글을 실제로 내리려면 네이버 블로그에서 직접 삭제·비공개로 바꿔주세요.
            </p>
            <p className="mt-3 truncate text-[13.5px] font-semibold text-neutral-800">“{confirmUnpub.title}”</p>
            <div className="mt-5 flex gap-2">
              <button onClick={doUnpublish} disabled={unpubBusy} className="at-press flex-1 rounded-xl bg-[color:var(--at-grey-900)] py-3 text-[13.5px] font-bold text-white transition disabled:opacity-50">
                {unpubBusy ? "되돌리는 중…" : "초안으로"}
              </button>
              <button onClick={() => setConfirmUnpub(null)} disabled={unpubBusy} className="at-press rounded-xl bg-neutral-100 px-5 py-3 text-[13.5px] font-bold text-neutral-600 transition disabled:opacity-50">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
