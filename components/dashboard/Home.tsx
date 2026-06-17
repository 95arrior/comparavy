"use client";

import SearchPerformance from "./SearchPerformance";
import ArticleList from "./ArticleList";
import type { Article } from "./types";

// 토스식 메인 홈 — '연구소' 컨셉/탭 제거. [미니 진척] → [성과] → [글감 자리+새 글 쓰기] → [내 글].
// 미니 진척 배너는 3단계 완료되면 자동으로 사라진다(새 유저만 가이드).

export default function Home({
  displayName,
  blogName,
  articles,
  wpConnected,
  onWrite,
  onSelect,
  onUpdated,
  onAllArticles,
  onGoConnect,
}: {
  displayName: string;
  blogName: string;
  articles: Article[];
  wpConnected: boolean;
  onWrite: () => void;
  onSelect: (a: Article) => void;
  onUpdated: (a: Article) => void;
  onAllArticles: () => void;
  onGoConnect: () => void;
}) {
  const visible = articles.filter((a) => a.status !== "generating");
  const hasArticles = visible.length > 0;
  const hasPublished = visible.some((a) => a.status === "published");

  const steps = [
    { label: "첫 글 쓰기", done: hasArticles, go: onWrite },
    { label: "워드프레스 연결", done: wpConnected, go: onGoConnect },
    { label: "발행", done: hasPublished, go: onAllArticles },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const firstUndone = steps.findIndex((s) => !s.done);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8 sm:py-10">
      {/* 헤더 */}
      <p className="text-sm text-neutral-400">{displayName}님, 안녕하세요</p>
      <h1 className="font-pretendard mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{blogName}</h1>

      {/* 미니 진척 — 3단계 완료 시 자동 숨김 */}
      {!allDone && (
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-[#3f91ff]/25 bg-[#3f91ff]/[0.04] px-4 py-2.5">
          <span className="shrink-0 text-xs font-bold text-[#3f91ff]">시작하기 {doneCount}/3</span>
          {steps.map((s, i) => (
            <button key={s.label} onClick={s.go} className="flex items-center gap-1 text-xs transition active:scale-95">
              {s.done ? (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>
              ) : (
                <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold ${i === firstUndone ? "bg-[#3f91ff] text-white" : "border border-neutral-300 text-neutral-400"}`}>{i + 1}</span>
              )}
              <span className={`font-medium ${s.done ? "text-neutral-400 line-through decoration-neutral-300" : i === firstUndone ? "text-neutral-800" : "text-neutral-400"}`}>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 성과 */}
      <div className="mt-5">
        <SearchPerformance onGoConnect={onGoConnect} />
      </div>

      {/* 글감 추천 자리 + 새 글 쓰기 */}
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-[15px] font-semibold text-neutral-900">오늘 글 한 편 어때요?</p>
        <p className="mt-1 text-xs text-neutral-500">곧 여기서 오늘 쓸 글감을 추천해드릴게요.</p>
        <button onClick={onWrite} className="mt-4 w-full rounded-xl bg-[#3f91ff] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99]">
          ✍️ 새 글 쓰기
        </button>
      </div>

      {/* 내 글 (최근 5개 + 전체 보기) */}
      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-neutral-900">내 글</h2>
          {visible.length > 5 && (
            <button onClick={onAllArticles} className="text-xs font-medium text-[#3f91ff] transition hover:underline">전체 보기 →</button>
          )}
        </div>
        {hasArticles ? (
          <ArticleList
            articles={visible.slice(0, 5)}
            onOpen={onSelect}
            onGoGenerate={onWrite}
            onUpdated={onUpdated}
            wpConnected={wpConnected}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center">
            <p className="text-sm text-neutral-500">아직 쓴 글이 없어요.</p>
            <p className="mt-1 text-xs text-neutral-400">위 ‘새 글 쓰기’로 첫 글을 만들어 보세요.</p>
          </div>
        )}
      </div>
    </main>
  );
}
