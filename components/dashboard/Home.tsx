"use client";

import { useState, useEffect, useCallback } from "react";
import SearchPerformance from "./SearchPerformance";
import ArticleList from "./ArticleList";
import JourneyRoadmap from "./JourneyRoadmap";
import TopicCard from "@/components/TopicCard";
import type { Comp } from "@/lib/topicScore";
import type { BloggerType } from "@/lib/bloggerTypes";
import type { Article } from "./types";

interface Topic { keyword: string; title: string; demandLabel: string; ssak?: boolean; region?: boolean; tone?: "local" | "online" | "hobby"; vol: number; comp: Comp; tag?: string }

// 글감 모으는 동안 순환 안내(멈춘 듯 안 보이게 — 첫 카테고리는 네이버 수집이라 잠깐 걸림)
const LOAD_MSGS = ["검색되는 키워드를 찾는 중…", "경쟁 낮은 글감을 고르는 중…", "글감 제목을 다듬는 중…"];

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
  bloggerType,
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
  bloggerType: BloggerType;
}) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [loadStage, setLoadStage] = useState(0);

  // 로딩 동안 안내 메시지 순환
  useEffect(() => {
    if (!topicsLoading) { setLoadStage(0); return; }
    const t = setInterval(() => setLoadStage((s) => (s + 1) % LOAD_MSGS.length), 1800);
    return () => clearInterval(t);
  }, [topicsLoading]);

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

  // 모멘텀 — 한 줄 요약(총·연속·이번 주)
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days = new Set(visible.filter((a) => a.created_at).map((a) => dayKey(new Date(a.created_at))));
  const total = visible.length;
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekCount = visible.filter((a) => a.created_at && new Date(a.created_at) >= monday).length;
  let streak = 0;
  const cur = new Date(now);
  if (!days.has(dayKey(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(dayKey(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  const weekPct = Math.min(weekCount / 3, 1) * 100;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
      {/* 헤더 — 절제 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">{displayName}님</p>
        {!wpConnected && (
          <button onClick={onGoConnect} className="text-xs font-medium text-[#1D75F7] transition hover:underline">워드프레스 연결 →</button>
        )}
      </div>

      {/* HERO — 큰 한 문장 */}
      <h1 className="font-pretendard mt-5 text-[28px] font-bold leading-[1.2] tracking-tight text-neutral-900 sm:text-[34px]">
        오늘, 한 편이면 돼요
      </h1>
      <p className="mt-2 text-[15px] text-neutral-400">{blogName}</p>

      {/* 추천 글감 — 랜딩과 동일한 글감 박스(실데이터). 누르면 그 글 쓰기 */}
      <h2 className="mt-8 text-[15px] font-bold tracking-tight text-neutral-900">오늘의 추천 글감</h2>
      {topicsLoading ? (
        <div className="mt-3">
          {/* 진행 표시 — 멈춘 듯 안 보이게 순환 메시지(첫 카테고리는 수집이라 잠깐 걸림) */}
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/70 px-5 py-3.5">
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#1D75F7]/25 border-t-[#1D75F7]" />
            <p key={loadStage} className="ateflo-soft-in text-sm font-medium text-neutral-600">{LOAD_MSGS[loadStage]}</p>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-2xl bg-neutral-100" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        </div>
      ) : topics.length > 0 ? (
        <div className="mt-3">
          <div className="flex flex-col gap-3">
            {topics.map((t, i) =>
              t.region ? (
                // 지역 글감 — 검색량 데이터가 없어 '우리 동네' 카드로
                <button
                  key={t.keyword}
                  onClick={() => onWriteKeyword(t.keyword, t.title)}
                  className="rounded-2xl border border-[#1D75F7]/30 bg-[#1D75F7]/[0.035] px-5 py-4 text-left shadow-[0_10px_30px_-16px_rgba(29,117,247,0.25)] transition active:scale-[0.99] sm:px-6 sm:py-5"
                >
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1D75F7]/10 px-2 py-0.5 text-[10px] font-bold leading-none text-[#1D75F7] sm:text-[11px]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>
                    우리 동네 키워드
                  </span>
                  <p className="mt-1.5 text-[15px] font-bold leading-snug text-neutral-900 sm:text-[18px]">{t.title}</p>
                  <p className="mt-1.5 inline-flex items-center gap-0.5 text-[12px] font-bold text-[#1D75F7] sm:text-[13px]">이 글 쓰기 ›</p>
                </button>
              ) : (
                <TopicCard key={t.keyword} title={t.title} tag={t.tag || undefined} vol={t.vol} comp={t.comp} idx={i} cta="이 글 쓰기" onClick={() => onWriteKeyword(t.keyword, t.title)} />
              ),
            )}
          </div>
          <button onClick={loadTopics} className="mt-4 w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-50 active:scale-[0.99]">다른 글감 받기 ↻</button>
        </div>
      ) : (
        <div className="mt-3 rounded-3xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
          아직 추천할 글감이 없어요. <button onClick={loadTopics} className="font-medium text-[#1D75F7]">다시 받기</button>
        </div>
      )}

      {/* 한 줄 모멘텀 + 주간 진척 */}
      <div className="mt-7 border-t border-neutral-100 pt-5">
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-500">
            총 <b className="text-neutral-800">{total}편</b>
            {streak > 0 && <> · <span className="font-semibold text-orange-500">{streak}일 연속</span></>}
          </p>
          <p className="text-neutral-400">이번 주 {weekCount}/3편</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-[#1D75F7] transition-all duration-500" style={{ width: `${weekPct}%` }} />
        </div>
      </div>

      {/* 수익화 여정 */}
      <div className="mt-6">
        <JourneyRoadmap publishedCount={publishedCount} wpConnected={wpConnected} onWrite={onWrite} onGoConnect={onGoConnect} type={bloggerType} />
      </div>

      {/* 성과 */}
      <div className="mt-4">
        <SearchPerformance onGoConnect={onGoConnect} />
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
