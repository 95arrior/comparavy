"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  isAdmin,
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
  isAdmin?: boolean;
}) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [loadStage, setLoadStage] = useState(0);
  const [swapping, setSwapping] = useState<string | null>(null); // 교체 중인 글감 keyword
  const [cluster, setCluster] = useState<string | null>(null); // '주제 이어가기' 활성 토픽(null=기본 다양)

  // 사용자가 가장 많이 쓴 주제 토큰(2편 이상) → '주제 이어가기' 제안용
  const mainTopic = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      for (const tok of String(a.keyword ?? "").split(/\s+/)) {
        if (tok.length >= 2) counts.set(tok, (counts.get(tok) ?? 0) + 1);
      }
    }
    let best: string | null = null, bestN = 1;
    for (const [tok, n] of counts) if (n > bestN) { best = tok; bestN = n; }
    return best ? { token: best, count: bestN } : null;
  }, [articles]);

  // 하루 3회 교체 + 교체한 글감은 그날 다시 안 나옴(기기에 기억 — 새로고침해도 유지)
  const SWAP_LIMIT = isAdmin ? Infinity : 3; // 관리자(테스트)는 무제한 교체
  const todayKey = `ateflo_dismissed_${new Date().toISOString().slice(0, 10)}`;
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { const raw = typeof window !== "undefined" ? localStorage.getItem(todayKey) : null; return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const dismissedRef = useRef(dismissed);
  dismissedRef.current = dismissed;
  const swapLeft = Math.max(0, SWAP_LIMIT - dismissed.length);

  // '이 글감 별로예요' → 보이는 3개 + 그날 교체분 제외하고 새 글감 1개로 그 카드만 교체
  const swapTopic = async (kw: string) => {
    if (swapping || swapLeft <= 0) return;
    setSwapping(kw);
    try {
      const exclude = [...topics.map((t) => t.keyword), ...dismissed].join(",");
      const params = new URLSearchParams({ exclude });
      if (cluster) params.set("cluster", cluster);
      const res = await fetch(`/api/topics?${params.toString()}`);
      const data = await res.json();
      const fresh: Topic[] = Array.isArray(data.topics) ? data.topics : [];
      const current = new Set(topics.map((t) => t.keyword));
      const repl = fresh.find((t) => !current.has(t.keyword));
      if (repl) {
        setTopics((prev) => prev.map((t) => (t.keyword === kw ? repl : t)));
        const nd = [...dismissed, kw];
        setDismissed(nd);
        try { localStorage.setItem(todayKey, JSON.stringify(nd)); } catch { /* ignore */ }
      }
    } catch { /* 유지 */ }
    finally { setSwapping(null); }
  };

  // 로딩 동안 안내 메시지 순환
  useEffect(() => {
    if (!topicsLoading) { setLoadStage(0); return; }
    const t = setInterval(() => setLoadStage((s) => (s + 1) % LOAD_MSGS.length), 1800);
    return () => clearInterval(t);
  }, [topicsLoading]);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const ex = dismissedRef.current; // 그날 교체한 글감은 새로고침해도 제외
      const params = new URLSearchParams();
      if (ex.length) params.set("exclude", ex.join(","));
      if (cluster) params.set("cluster", cluster);
      const qs = params.toString();
      const res = await fetch(`/api/topics${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      setTopics(Array.isArray(data.topics) ? data.topics : []);
    } catch {
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  }, [cluster]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  return (
    <main className="mx-auto max-w-2xl px-6">
      {/* 한 화면 — 헤더 + (중앙) 오늘의 글감. 탭바 높이 빼서 스크롤 없이 한눈에 중앙 */}
      <section className="flex min-h-[calc(100svh-78px)] flex-col md:min-h-[calc(100svh-4rem)]">
      {/* 헤더 — 절제 */}
      <div className="flex items-center justify-between pt-9">
        <p className="text-sm text-neutral-400">{displayName}님</p>
        {!wpConnected && (
          <button onClick={onGoConnect} className="text-xs font-medium text-[#1D75F7] transition hover:underline">워드프레스 연결 →</button>
        )}
      </div>

      {/* 중앙 — 히어로 + 오늘의 글감 3개 */}
      <div className="flex flex-1 flex-col justify-center py-6">
      {/* HERO — 큰 한 문장 */}
      <h1 className="font-pretendard text-[28px] font-bold leading-[1.2] tracking-tight text-neutral-900 sm:text-[34px]">
        오늘, 한 편이면 돼요
      </h1>
      <p className="mt-2 text-[15px] text-neutral-400">{blogName}</p>

      {/* 추천 글감 — 랜딩과 동일한 글감 박스(실데이터). 누르면 그 글 쓰기 */}
      {cluster ? (
        <div className="mt-8">
          <button onClick={() => setCluster(null)} className="-ml-1 flex items-center gap-1 text-[13px] font-medium text-neutral-400 transition hover:text-neutral-700">
            <span className="text-base leading-none">←</span> 다양한 글감으로
          </button>
          <h2 className="mt-2 text-[15px] font-bold tracking-tight text-neutral-900">‘{cluster}’ 이어가기</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-neutral-400">한 주제를 깊이 쓰면 그 분야 <b className="text-[#1D75F7]">검색 권위</b>가 생겨 상위에 유리해요</p>
        </div>
      ) : (
        <h2 className="mt-8 text-[15px] font-bold tracking-tight text-neutral-900">오늘의 추천 글감</h2>
      )}
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
                <TopicCard key={t.keyword} title={t.title} tag={t.keyword} vol={t.vol} comp={t.comp} idx={i} cta="이 글 쓰기" onClick={() => onWriteKeyword(t.keyword, t.title)} onDismiss={swapLeft > 0 ? () => swapTopic(t.keyword) : undefined} dismissing={swapping === t.keyword} />
              ),
            )}
          </div>
          {!isFinite(swapLeft) ? (
            <p className="mt-3 text-center text-[12px] text-neutral-300">마음에 안 들면 카드의 ✕로 교체 (테스트 · 무제한)</p>
          ) : swapLeft <= 0 ? (
            <p className="mt-3 text-center text-[12px] text-neutral-400">오늘 글감 교체는 다 썼어요 · 내일 새 글감이 와요</p>
          ) : (
            <p className="mt-3 text-center text-[12px] text-neutral-300">마음에 안 들면 카드의 ✕로 교체 (오늘 {swapLeft}회 남음)</p>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-3xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
          {cluster ? "이 주제로 더 쓸 글감이 없어요. " : "아직 추천할 글감이 없어요. "}
          <button onClick={cluster ? () => setCluster(null) : loadTopics} className="font-medium text-[#1D75F7]">{cluster ? "다양한 글감으로" : "다시 받기"}</button>
        </div>
      )}

      {/* 주제 이어가기 — 기본 모드 + 쓴 주제 있을 때만(선택형 · 이유 안내) */}
      {!cluster && !topicsLoading && mainTopic && (
        <button
          onClick={() => setCluster(mainTopic.token)}
          className="mt-4 w-full rounded-2xl border border-[#1D75F7]/20 bg-[#1D75F7]/[0.04] p-4 text-left transition hover:bg-[#1D75F7]/[0.07] active:scale-[0.99]"
        >
          <p className="text-[14px] font-bold text-neutral-900">‘{mainTopic.token}’ 주제로 {mainTopic.count}편 쓰셨네요</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">한 주제를 깊이 쓰면 그 분야 <b className="text-[#1D75F7]">검색 권위</b>가 생겨 상위에 유리해요.</p>
          <p className="mt-2 inline-flex items-center gap-0.5 text-[13px] font-bold text-[#1D75F7]">‘{mainTopic.token}’ 글감 더 보기 ›</p>
        </button>
      )}
      </div>
      </section>

    </main>
  );
}
