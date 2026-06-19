"use client";

import { useState, useEffect, useCallback } from "react";
import SearchPerformance from "./SearchPerformance";
import ArticleList from "./ArticleList";
import Momentum from "./Momentum";
import JourneyRoadmap from "./JourneyRoadmap";
import type { Article } from "./types";

interface Topic { keyword: string; title: string; demandLabel: string; ssak?: boolean }

// 토스식 메인 홈 — '연구소' 컨셉/탭 제거. [미니 진척] → [성과] → [글감 자리+새 글 쓰기] → [내 글].
// 미니 진척 배너는 3단계 완료되면 자동으로 사라진다(새 유저만 가이드).

export default function Home({
  displayName,
  blogName,
  articles,
  wpConnected,
  onWrite,
  onWriteKeyword,
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
  onWriteKeyword: (keyword: string, title: string) => void;
  onSelect: (a: Article) => void;
  onUpdated: (a: Article) => void;
  onAllArticles: () => void;
  onGoConnect: () => void;
}) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      setTopics(Array.isArray(data.topics) ? data.topics : []);
    } catch {
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);
  const visible = articles.filter((a) => a.status !== "generating");
  const hasArticles = visible.length > 0;
  const publishedCount = visible.filter((a) => a.status === "published").length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8 sm:py-10">
      {/* 헤더 */}
      <p className="text-sm text-neutral-400">{displayName}님, 안녕하세요</p>
      <h1 className="font-pretendard mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{blogName}</h1>

      {/* 모멘텀 — 쌓이는 게 보이게(잔디 + 누적/연속) */}
      <div className="mt-5">
        <Momentum articles={visible} />
      </div>

      {/* 수익화 여정 로드맵 */}
      <div className="mt-4">
        <JourneyRoadmap publishedCount={publishedCount} wpConnected={wpConnected} onWrite={onWrite} onGoConnect={onGoConnect} />
      </div>

      {/* 성과 */}
      <div className="mt-4">
        <SearchPerformance onGoConnect={onGoConnect} />
      </div>

      {/* 글감 추천 카드 3개 + 새 글 쓰기(보조) */}
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold text-neutral-900">오늘 글 한 편 어때요?</p>
          <button
            onClick={loadTopics}
            disabled={topicsLoading}
            className="text-xs font-medium text-[#1D75F7] transition hover:underline disabled:opacity-40"
          >
            다른 주제 보기
          </button>
        </div>

        {/* 카드 영역 — 로딩 시 스켈레톤(높이 고정, 레이아웃 시프트 방지) */}
        <div className="mt-3 space-y-2">
          {topicsLoading ? (
            [0, 1, 2].map((i) => <div key={i} className="h-[62px] animate-pulse rounded-xl bg-neutral-100" />)
          ) : topics.length > 0 ? (
            topics.map((t) =>
              t.ssak ? (
                // 싹 키워드 — 옅은 파스텔 오로라(일렁임) + 보라 배지
                <div key={t.keyword} className="ateflo-chip-aurora flex items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-sm ring-1 ring-white/60">
                  <div className="min-w-0">
                    <span className="mb-1 inline-block rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-bold text-[#7c3aed]">싹 키워드</span>
                    <p className="truncate text-sm font-semibold text-[#3f3a6b]">{t.title}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-[#7c3aed]">경쟁 적어요 · 먼저 쓰면 유리</p>
                  </div>
                  <button
                    onClick={() => onWriteKeyword(t.keyword, t.title)}
                    className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#7c3aed] shadow-sm transition hover:opacity-90 active:scale-95"
                  >
                    이걸로 쓰기
                  </button>
                </div>
              ) : (
                // 일반 글감 — 연그레이
                <div key={t.keyword} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-100 px-4 py-3 ring-1 ring-black/[0.03]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-800">{t.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{t.demandLabel}</p>
                  </div>
                  <button
                    onClick={() => onWriteKeyword(t.keyword, t.title)}
                    className="shrink-0 rounded-lg bg-[#1D75F7]/10 px-3 py-2 text-xs font-semibold text-[#1D75F7] transition hover:bg-[#1D75F7]/15 active:scale-95"
                  >
                    이걸로 쓰기
                  </button>
                </div>
              ),
            )
          ) : (
            <p className="py-3 text-xs text-neutral-400">아직 추천할 글감이 없어요. ‘다른 주제 보기’를 눌러보세요.</p>
          )}
        </div>

        {topics.some((t) => t.ssak) && (
          <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">
            보라색은 <b className="font-semibold text-[#8b5cf6]">싹 키워드</b> — 아직 경쟁이 적어 먼저 쓰면 유리해요.
          </p>
        )}
      </div>

      {/* 내 글 (최근 5개 + 전체 보기) */}
      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-neutral-900">내 글</h2>
          {visible.length > 5 && (
            <button onClick={onAllArticles} className="text-xs font-medium text-[#1D75F7] transition hover:underline">전체 보기 →</button>
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
