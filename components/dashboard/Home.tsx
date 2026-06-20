"use client";

import { useState, useEffect, useCallback } from "react";
import SearchPerformance from "./SearchPerformance";
import ArticleList from "./ArticleList";
import JourneyRoadmap from "./JourneyRoadmap";
import type { Article } from "./types";

interface Topic { keyword: string; title: string; demandLabel: string; ssak?: boolean; region?: boolean }

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
  const [featuredIdx, setFeaturedIdx] = useState(0);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      const list: Topic[] = Array.isArray(data.topics) ? data.topics : [];
      setTopics(list);
      // 우리 동네(지역) 글감 우선 → 없으면 전설(싹 키워드) → 없으면 첫 번째
      const rIdx = list.findIndex((t) => t.region);
      const sIdx = list.findIndex((t) => t.ssak);
      setFeaturedIdx(rIdx >= 0 ? rIdx : sIdx >= 0 ? sIdx : 0);
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
  const featured = topics[featuredIdx];
  const nextFeatured = () => {
    if (featuredIdx + 1 < topics.length) setFeaturedIdx(featuredIdx + 1);
    else loadTopics(); // 다 봤으면 새로 받기
  };

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

      {/* 딱 하나 크게 — 오늘의 글감 */}
      {topicsLoading ? (
        <div className="mt-8 h-[168px] animate-pulse rounded-3xl bg-neutral-100" />
      ) : featured ? (
        <div className={`mt-8 rounded-3xl p-7 ${
          featured.ssak ? "ateflo-chip-aurora ring-1 ring-white/60"
          : featured.region ? "border border-[#1D75F7]/30 bg-[#1D75F7]/[0.035] shadow-[0_10px_30px_-14px_rgba(29,117,247,0.25)]"
          : "border border-neutral-200 bg-white shadow-[0_10px_30px_-14px_rgba(20,40,90,0.15)]"
        }`}>
          {featured.ssak ? (
            <span className="inline-block rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-bold text-[#7c3aed]">싹 키워드 · 지금이 기회</span>
          ) : featured.region ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1D75F7]/10 px-2.5 py-1 text-[11px] font-bold text-[#1D75F7]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>
              우리 동네 키워드
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#1D75F7]">{featured.demandLabel}</span>
          )}
          <p className={`font-pretendard mt-3 text-[22px] font-bold leading-snug tracking-tight ${featured.ssak ? "text-[#3f3a6b]" : "text-neutral-900"}`}>
            {featured.title}
          </p>
          <p className={`mt-1.5 text-sm ${featured.ssak ? "font-medium text-[#7c3aed]" : featured.region ? "font-medium text-[#1D75F7]" : "text-neutral-500"}`}>
            {featured.ssak ? "남들은 아직 안 썼어요. 먼저 쓰면 손님이 먼저 와요."
              : featured.region ? "우리 동네 손님이 바로 찾는 검색이에요."
              : "손님이 자주 찾는 주제예요."}
          </p>
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={() => onWriteKeyword(featured.keyword, featured.title)}
              className={`rounded-xl px-6 py-3 text-sm font-bold shadow-sm transition active:scale-[0.98] ${featured.ssak ? "bg-white text-[#7c3aed] hover:opacity-90" : "bg-[#1D75F7] text-white hover:opacity-90"}`}
            >
              이 글 쓰기
            </button>
            <button onClick={nextFeatured} className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800">다른 글감 →</button>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
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
        <JourneyRoadmap publishedCount={publishedCount} wpConnected={wpConnected} onWrite={onWrite} onGoConnect={onGoConnect} />
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
