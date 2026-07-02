"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SeriesSheet from "./SeriesSheet";
import TodayCard from "./TodayCard";
import CourseRing from "./CourseRing";
import { courseInfo } from "@/lib/course";
import type { Comp } from "@/lib/topicScore";
import type { Article } from "./types";

interface Topic { keyword: string; title: string; demandLabel: string; ssak?: boolean; region?: boolean; vol: number; comp: Comp; tag?: string; blogTotal?: number | null }

// 글감 모으는 동안 순환 안내(멈춘 듯 안 보이게 — 첫 카테고리는 네이버 수집이라 잠깐 걸림)
const LOAD_MSGS = ["검색되는 키워드를 찾는 중…", "경쟁 낮은 글감을 고르는 중…", "글감 제목을 다듬는 중…"];

// 소주제 군집 키(서버와 동일 규칙: 띄어쓰기·기호 제거 후 앞 4글자) — 교체 시 비슷한 소주제 중복 방지
const clusterOf = (s: string) => s.replace(/\s+/g, "").replace(/[^가-힣a-z0-9]/gi, "").slice(0, 4);

// ★표시 글감 정제(하드코딩) — 키워드/제목/소주제 중 하나라도 겹치면 제외 + 최대 3개.
function sanitizeTopics(arr: Topic[], limit = 3): Topic[] {
  const kw = new Set<string>(), ti = new Set<string>(), cl = new Set<string>();
  const out: Topic[] = [];
  for (const t of arr ?? []) {
    if (!t || !t.keyword) continue;
    const c = clusterOf(t.title ?? t.keyword);
    if (kw.has(t.keyword) || ti.has(t.title) || cl.has(c)) continue;
    kw.add(t.keyword); ti.add(t.title); cl.add(c);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

// ★홈 대격변(A안 — 루틴 대시보드): 코스 진행 링이 히어로, 오늘의 글 카드가 단일 CTA.
// 나머지(다른 글감·내 이야기)는 접힘 — '오늘 해야 할 단 하나'만 화면에 남긴다.

export default function Home({
  displayName,
  blogName,
  articles,
  credits,
  onWrite,
  onWriteKeyword,
  onSelect,
  onUpdated,
  onAllArticles,
  onGoPerformance,
  onOpenCredits,
  isAdmin,
  profileKey,
}: {
  displayName: string;
  blogName: string;
  articles: Article[];
  /** 크레딧 잔액 — 0이면 '오늘의 글' 카드가 잠김(글감은 보임) */
  credits: number;
  onWrite: () => void;
  onWriteKeyword: (keyword: string, title: string) => void;
  onSelect: (a: Article) => void;
  onUpdated: (a: Article) => void;
  onAllArticles: () => void;
  onGoPerformance: () => void;
  /** 크레딧 칩 탭 → 충전·사용내역 페이지 */
  onOpenCredits: () => void;
  isAdmin?: boolean;
  profileKey?: string; // 주제:세부 — 글감 캐시 분리(주제 바꾸면 새 글감)
}) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [loadStage, setLoadStage] = useState(0);
  const [swapping, setSwapping] = useState<string[]>([]);
  const [cluster, setCluster] = useState<string | null>(null); // '주제 이어가기' 활성 토픽(null=기본 다양)
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false); // '다른 글감' 접힘 토글

  // 교체 무제한(풀 조회라 원가 0 — 실비용은 크레딧이 지킴). 교체한 글감은 그날 다시 안 나옴(기기에 기억).
  const todayKey = `ateflo_dismissed_${new Date().toISOString().slice(0, 10)}`;
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { const raw = typeof window !== "undefined" ? localStorage.getItem(todayKey) : null; return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const dismissedRef = useRef(dismissed);
  dismissedRef.current = dismissed;

  const todayDate = new Date().toISOString().slice(0, 10);
  const topicsCacheKey = (md: string) => `ateflo_topics_v15_${todayDate}_${profileKey ?? ""}_${md}`;
  const curModeKey = cluster ? `cluster:${cluster}` : "normal";

  const swapTopic = async (kw: string) => {
    if (swapping.includes(kw)) return;
    const modeKey = curModeKey;
    setSwapping((s) => [...s, kw]);
    try {
      const exclude = [...topics.map((t) => t.keyword), ...dismissedRef.current].join(",");
      const params = new URLSearchParams({ exclude });
      if (cluster) params.set("cluster", cluster);
      const res = await fetch(`/api/topics?${params.toString()}`);
      const data = await res.json();
      const fresh: Topic[] = Array.isArray(data.topics) ? data.topics : [];
      const current = new Set(topics.map((t) => t.keyword));
      const currentTitles = new Set(topics.map((t) => t.title));
      const currentClusters = new Set(topics.map((t) => clusterOf(t.title)));
      const cands = fresh.filter((t) => !current.has(t.keyword) && !currentTitles.has(t.title) && !currentClusters.has(clusterOf(t.title)) && !dismissedRef.current.includes(t.keyword));
      const repl = cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
      if (repl) {
        setTopics((prev) => {
          if (prev.some((t) => t.keyword !== kw && (t.keyword === repl.keyword || t.title === repl.title || clusterOf(t.title) === clusterOf(repl.title)))) return prev;
          const next = sanitizeTopics(prev.map((t) => (t.keyword === kw ? repl : t)));
          try { localStorage.setItem(topicsCacheKey(modeKey), JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
        const nd = [...dismissedRef.current, kw];
        setDismissed(nd);
        try { localStorage.setItem(todayKey, JSON.stringify(nd)); } catch { /* ignore */ }
      }
    } catch { /* 유지 */ }
    finally { setSwapping((s) => s.filter((x) => x !== kw)); }
  };

  useEffect(() => {
    if (!topicsLoading) { setLoadStage(0); return; }
    const t = setInterval(() => setLoadStage((s) => (s + 1) % LOAD_MSGS.length), 1800);
    return () => clearInterval(t);
  }, [topicsLoading]);

  const loadTopics = useCallback(async () => {
    const md = cluster ? `cluster:${cluster}` : "normal";
    const ck = `ateflo_topics_v15_${new Date().toISOString().slice(0, 10)}_${profileKey ?? ""}_${md}`;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(ck) : null;
      if (raw) { const p = JSON.parse(raw); const c = Array.isArray(p) ? sanitizeTopics(p) : []; if (c.length >= 3) { setTopics(c); setTopicsLoading(false); return; } }
    } catch { /* 캐시 미스 → 아래로 */ }

    setTopicsLoading(true);
    setCollecting(false);
    const collectTimer = setTimeout(() => setCollecting(true), 4000);
    try {
      const ex = dismissedRef.current;
      const params = new URLSearchParams();
      if (ex.length) params.set("exclude", ex.join(","));
      if (cluster) params.set("cluster", cluster);
      const qs = params.toString();
      const res = await fetch(`/api/topics${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      const t = sanitizeTopics(Array.isArray(data.topics) ? data.topics : []);
      setTopics(t);
      try { if (t.length >= 3) localStorage.setItem(ck, JSON.stringify(t)); } catch { /* ignore */ }
    } catch {
      setTopics([]);
    } finally {
      clearTimeout(collectTimer);
      setCollecting(false);
      setTopicsLoading(false);
    }
  }, [cluster, profileKey]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // 코스 상태 + 오늘의 초안
  const info = courseInfo(articles);
  const now = new Date();
  const sameDay = (iso: string) => { const d = new Date(iso); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate(); };
  const todayDraft = articles.find((a) => a.status === "draft" && sameDay(a.created_at));
  const clean = sanitizeTopics(topics);
  const first = clean[0] ?? null;
  const rest = clean.slice(1);

  // ── 클러스터 모드('주제 이어가기') — 전용 화면 ──
  if (cluster) {
    return (
      <main className="mx-auto max-w-2xl px-6 pb-10">
        <div className="ateflo-page-in pt-8">
          <button onClick={() => setCluster(null)} className="-ml-1 flex items-center gap-1 text-[13px] font-medium text-neutral-400 transition hover:text-neutral-700">
            <span className="text-base leading-none">←</span> 홈으로
          </button>
          <h2 className="mt-2 text-[17px] font-bold tracking-tight text-neutral-900">‘{cluster}’ 이어가기</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-neutral-400">한 주제를 깊이 쓰면 그 분야 <b className="text-[#1D75F7]">블로그 지수</b>가 쌓여 상위에 유리해요</p>
          {topicsLoading ? (
            <TopicsSkeleton collecting={collecting} loadStage={loadStage} />
          ) : clean.length > 0 ? (
            <div className="mt-3 flex flex-col gap-3">
              {clean.map((t) => (
                <TopicRow key={t.keyword} topic={t} onClick={() => onWriteKeyword(t.keyword, t.title)} onSwap={() => swapTopic(t.keyword)} swapping={swapping.includes(t.keyword)} />
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-3xl bg-neutral-50 p-8 text-center text-sm text-neutral-400">
              이 주제로 더 쓸 글감이 없어요. <button onClick={() => setCluster(null)} className="font-medium text-[#1D75F7]">홈으로</button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── 기본 홈(A안 루틴 대시보드): 링 히어로 → 오늘의 글 카드 → 접힘 섹션 ──
  return (
    <main className="mx-auto max-w-2xl px-6 pb-10">
      {/* 상단 — 블로그명 + 크레딧 칩(탭 → 충전·내역) */}
      <div className="at-rise flex items-center justify-between pt-7">
        <p className="at-label">{blogName}</p>
        <button onClick={onOpenCredits} className="at-press flex items-center gap-1 rounded-full bg-white px-3 py-1.5 ring-1 ring-black/[0.05] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#1D75F7"><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" /></svg>
          <span className="text-[13px] font-bold text-[color:var(--at-grey-900)]">{credits.toLocaleString("ko-KR")}</span>
        </button>
      </div>

      {/* 히어로 — 코스 진행 링 */}
      <div className="at-rise at-d1 mt-4">
        <CourseRing info={info} />
      </div>

      {/* 오늘의 글 — 단일 CTA */}
      <div className="at-rise at-d2 mt-6">
        <TodayCard
          topic={first ? { keyword: first.keyword, title: first.title } : null}
          loading={topicsLoading}
          credits={credits}
          info={info}
          onWriteKeyword={onWriteKeyword}
          onOpenTodayDraft={() => { if (todayDraft) onSelect(todayDraft); }}
          onGoPerformance={onGoPerformance}
        />
      </div>

      {/* 접힘 — 다른 글감 */}
      <div className="at-rise at-d3 mt-3">
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="at-press flex w-full items-center gap-3 rounded-2xl bg-white px-5 py-4 text-left ring-1 ring-black/[0.04]"
        >
          <span className="min-w-0 flex-1 text-[14px] font-bold text-[color:var(--at-grey-700)]">
            다른 글감 {topicsLoading ? "" : rest.length}
          </span>
          <svg className={`shrink-0 text-neutral-300 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {moreOpen && (
          <div className="at-rise mt-2">
            {topicsLoading ? (
              <TopicsSkeleton collecting={collecting} loadStage={loadStage} />
            ) : rest.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {rest.map((t) => (
                  <TopicRow key={t.keyword} topic={t} onClick={() => onWriteKeyword(t.keyword, t.title)} onSwap={() => swapTopic(t.keyword)} swapping={swapping.includes(t.keyword)} />
                ))}
                <button onClick={() => setSeriesOpen(true)} className="at-press flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-black/[0.04] transition hover:ring-violet-300">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg></span>
                  <span className="min-w-0 flex-1 truncate text-left text-[13.5px] font-bold text-neutral-900">주제 시리즈로 전문 블로그 되기</span>
                  <svg className="shrink-0 text-neutral-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-neutral-50 p-6 text-center text-[13px] text-neutral-400">
                오늘 글감은 위 카드가 전부예요. <button onClick={loadTopics} className="font-medium text-[#1D75F7]">다시 받기</button>
              </div>
            )}
          </div>
        )}
      </div>

      {seriesOpen && <SeriesSheet articles={articles} onWrite={onWriteKeyword} onClose={() => setSeriesOpen(false)} />}
    </main>
  );
}

// ★글감 카드 v2 — '골라준 서비스' 느낌: 상단 데이터 배지 → 제목 → 명시적 CTA. 교체(↻)는 우상단 분리.
function TopicRow({ topic, onClick, onSwap, swapping }: {
  topic: { keyword: string; title: string; vol: number; comp: Comp; blogTotal?: number | null };
  onClick: () => void;
  onSwap?: () => void;
  swapping?: boolean;
}) {
  const compMeta = topic.comp === "low"
    ? { label: "경쟁 낮음", cls: "bg-emerald-50 text-emerald-600" }
    : topic.comp === "mid"
      ? { label: "경쟁 보통", cls: "bg-amber-50 text-amber-600" }
      : { label: "경쟁 높음", cls: "bg-rose-50 text-rose-500" };
  return (
    <div className={`rounded-2xl bg-white p-5 ring-1 ring-black/[0.04] transition ${swapping ? "opacity-40" : ""}`}>
      {/* 상단 — 데이터 배지(왜 이 글감인지) + 교체 */}
      <div className="flex items-center gap-2">
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${compMeta.cls}`}>{compMeta.label}</span>
        <span className="text-[12px] font-medium text-[color:var(--at-grey-400)]">
          {topic.vol > 0 ? `월 ${topic.vol.toLocaleString("ko-KR")}회 검색` : "숨은 수요 키워드"}
        </span>
        {onSwap && (
          <button onClick={onSwap} disabled={swapping} aria-label="다른 글감으로 교체" className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-500 disabled:opacity-40">
            <svg className={swapping ? "animate-spin" : ""} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          </button>
        )}
      </div>
      {/* 제목 — 카드의 주인공 */}
      <button onClick={onClick} className="mt-2 block w-full text-left">
        <p className="text-[15.5px] font-bold leading-snug text-[color:var(--at-grey-900)]">{topic.title}</p>
      </button>
      {/* 명시적 CTA */}
      <button onClick={onClick} className="at-press mt-3 text-[13px] font-bold text-[#1D75F7]">
        이 글 쓰기 →
      </button>
    </div>
  );
}

// 글감 로딩 스켈레톤 — 블러 카드 + 돋보기 스캔
function TopicsSkeleton({ collecting, loadStage }: { collecting: boolean; loadStage: number }) {
  return (
    <div className="relative mt-3">
      <div className="flex select-none flex-col gap-3 blur-[2.5px]" aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl bg-white px-5 py-4 ring-1 ring-black/[0.05]">
            <div className="h-[18px] w-12 rounded-full bg-neutral-200" />
            <div className="mt-1.5 h-[22px] w-3/4 rounded bg-neutral-200" />
            <div className="mt-1.5 h-3.5 w-2/3 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2.5 rounded-full bg-white/85 px-5 py-2.5 shadow-[0_6px_20px_-8px_rgba(20,40,90,0.3)] backdrop-blur-sm">
          <svg className="ateflo-search-scan shrink-0 text-[#1D75F7]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <p key={collecting ? "collect" : loadStage} className="ateflo-soft-in text-sm font-semibold text-neutral-700">{collecting ? "처음이라 글감을 모으는 중이에요" : LOAD_MSGS[loadStage]}</p>
        </div>
      </div>
    </div>
  );
}
