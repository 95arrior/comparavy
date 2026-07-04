"use client";

import { useMemo, useState, useEffect } from "react";
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

  // ★색인 상태 — 이제 크론이 하루 1번 검사해 DB(article.indexed_status)에 저장. 화면은 저장값만 읽는다.
  //  (유저가 열 때마다 네이버 검색을 부르던 방식 폐기 → 1만 명 쿼터 문제 해소.)
  const idxLabel = (a: Article): { text: string; cls: string } | null => {
    if (a.status !== "published") return null;
    const st = a.indexed_status;
    if (st === "indexed") return { text: "검색 노출 중", cls: "text-emerald-600" };
    const hours = (Date.now() - new Date(a.created_at).getTime()) / 3600_000;
    // 아직 크론 검사 전이거나 pending — 시간 기준으로 안내(48h 내는 정상 대기)
    if (hours < 48) return { text: "색인 중 (보통 2일)", cls: "text-neutral-400" };
    if (st === "pending") return { text: "아직 색인 전", cls: "text-amber-600" };
    return null; // unknown/미검사 + 48h 경과 — 라벨 생략(과잉 경고 방지)
  };

  const [delBusy, setDelBusy] = useState(false);
  async function doDelete() {
    if (!confirmUnpub || delBusy) return;
    setDelBusy(true);
    try {
      const res = await fetch(`/api/articles/${confirmUnpub.id}`, { method: "DELETE" });
      if (res.ok) {
        onUpdated?.({ ...confirmUnpub, status: "deleted" as Article["status"] });
        setConfirmUnpub(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg(data.error ?? "삭제하지 못했어요.");
        setTimeout(() => setMsg(null), 2500);
      }
    } catch {
      setMsg("삭제하지 못했어요.");
      setTimeout(() => setMsg(null), 2500);
    } finally { setDelBusy(false); }
  }

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
      <div className="rounded-2xl at-glass px-6 py-14 text-center ">
        <p className="text-[16px] font-bold text-[color:var(--at-grey-900)]">아직 쓴 글이 없어요</p>
        <p className="mt-1 text-[13px] text-neutral-400">오늘의 글부터 시작해 보세요</p>
        <button
          onClick={onGoGenerate}
          className="at-press mt-5 rounded-xl tk-grad-cta px-6 py-3 text-[14px] font-bold text-white transition hover:opacity-90"
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
      <div className="flex items-center gap-1.5">
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
      <div className="relative mt-3">
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
        <div className="mt-3 divide-y divide-neutral-50 overflow-hidden rounded-2xl at-glass ">
          {filtered.map((a) => {
            const published = a.status === "published";
            return (
              <div key={a.id} className="flex items-center gap-3.5 px-5 py-4 transition active:bg-neutral-50">
                <span className={`h-2 w-2 shrink-0 rounded-full ${published ? "bg-emerald-500" : "bg-neutral-200"}`} aria-hidden />
                <button onClick={() => onOpen(a)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[14.5px] font-bold text-[color:var(--at-grey-900)]">{a.title}</p>
                  <p className="mt-0.5 text-[11.5px] font-medium text-neutral-400">
                    {published ? "발행됨" : "초안"} · {(a.char_count ?? 0).toLocaleString()}자 · {new Date(a.created_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                    {(() => { const b = idxLabel(a); return b ? <> · <span className={`font-bold ${b.cls}`}>{b.text}</span></> : null; })()}
                  </p>
                </button>
                {published ? (
                  <button onClick={() => setConfirmUnpub(a)} className="shrink-0 text-[12px] font-semibold text-neutral-300 transition hover:text-neutral-500">
                    내렸어요
                  </button>
                ) : (
                  <button onClick={() => onOpen(a)} aria-label="네이버에 올리기" className="at-press flex h-8 w-8 shrink-0 items-center justify-center text-[#03C75A] transition hover:opacity-70">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V4" /><path d="M7 9l5-5 5 5" /><path d="M4 20h16" /></svg>
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
            <p className="text-[16px] font-bold text-[color:var(--at-grey-900)]">이 글, 어떻게 할까요?</p>
            <p className="mt-2 truncate text-[13.5px] font-semibold text-neutral-800">“{confirmUnpub.title}”</p>
            <div className="mt-4 space-y-2">
              <button onClick={doUnpublish} disabled={unpubBusy || delBusy} className="at-press w-full rounded-xl bg-[color:var(--at-grey-900)] p-3.5 text-left transition disabled:opacity-50">
                <span className="block text-[13.5px] font-bold text-white">{unpubBusy ? "처리 중…" : "내렸어요 (초안으로 보관)"}</span>
                <span className="mt-0.5 block text-[11.5px] text-white/60">발행 카운트에서 빠져요 · 글은 남아서 다시 올릴 수 있어요</span>
              </button>
              <button onClick={doDelete} disabled={unpubBusy || delBusy} className="at-press w-full rounded-xl bg-red-50 p-3.5 text-left ring-1 ring-red-100 transition hover:bg-red-100/70 disabled:opacity-50">
                <span className="block text-[13.5px] font-bold text-red-600">{delBusy ? "삭제 중…" : "완전 삭제"}</span>
                <span className="mt-0.5 block text-[11.5px] text-red-400">발행·작성·코스 모든 카운트에서 사라져요 · 복구 불가 · 크레딧 환불 없음</span>
              </button>
            </div>
            <button onClick={() => setConfirmUnpub(null)} disabled={unpubBusy || delBusy} className="mt-2 w-full py-2 text-center text-[13px] font-medium text-neutral-400 transition hover:text-neutral-600 disabled:opacity-50">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
