"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TodayCard from "./TodayCard";
import GlassIcon from "@/components/GlassIcon";
import CourseRing from "./CourseRing";
import { courseInfo } from "@/lib/course";
import type { Comp } from "@/lib/topicScore";
import type { Article } from "./types";

interface Topic { keyword: string; title: string; demandLabel: string; vol: number; comp: Comp; tag?: string; blogTotal?: number | null; newsContext?: string; briefText?: string; titleSearch?: string; thumb?: { mainCopy: string; subCopy: string; badge: string } }

// 소주제 군집 키(서버와 동일 규칙) — 교체 시 비슷한 소주제 중복 방지
const clusterOf = (s: string) => s.replace(/\s+/g, "").replace(/[^가-힣a-z0-9]/gi, "").slice(0, 4);

// ★표시 글감 정제 — 키워드/제목/소주제 중 하나라도 겹치면 제외 + 최대 3개.
const STALE_YEAR_RE = /20(1[0-9]|2[0-5])/; // 2010~2025 — '2024 최신' 같은 구식 글감은 어디서 왔든 화면에서 차단
function sanitizeTopics(arr: Topic[], limit = 3): Topic[] {
  const kw = new Set<string>(), ti = new Set<string>(), cl = new Set<string>();
  const out: Topic[] = [];
  for (const t of arr ?? []) {
    if (!t || !t.keyword) continue;
    if (STALE_YEAR_RE.test(t.keyword) || STALE_YEAR_RE.test(t.title ?? "")) continue;
    const c = clusterOf(t.title ?? t.keyword);
    if (kw.has(t.keyword) || ti.has(t.title) || cl.has(c)) continue;
    kw.add(t.keyword); ti.add(t.title); cl.add(c);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

// ★홈(A안 루틴 대시보드 · 최종형): 크레딧 칩 → 코스 링 → 오늘의 글 → 다른 글감(접힘).
// 구 UI 요소(주제 시리즈·클러스터·지역·돋보기 로딩) 전부 제거.

export default function Home({
  displayName,
  blogName,
  articles,
  credits,
  onWriteKeyword,
  onSelect,
  onGoPerformance,
  onOpenCredits,
  unreadNews,
  onOpenNews,
  profileKey,
}: {
  displayName: string;
  blogName: string;
  articles: Article[];
  /** 크레딧 잔액 — 0이면 '오늘의 글' 카드가 잠김(글감은 보임) */
  credits: number;
  onWriteKeyword: (keyword: string, title: string, newsContext?: string, briefText?: string, titleSearch?: string, thumb?: { mainCopy: string; subCopy: string; badge: string }) => void;
  onSelect: (a: Article) => void;
  onGoPerformance: () => void;
  /** 크레딧 칩 탭 → 충전·사용내역 페이지 */
  onOpenCredits: () => void;
  /** 공지 벨 — 안 읽은 소식 있으면 빨간 점+흔들림 */
  unreadNews?: boolean;
  onOpenNews?: () => void;
  profileKey?: string; // 주제:세부 — 글감 캐시 분리(주제 바꾸면 새 글감)
}) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [swapping, setSwapping] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false); // '다른 글감' 접힘 토글
  const [swapNotice, setSwapNotice] = useState(false); // 교체 한도 안내
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (moreOpen) setTimeout(() => moreRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  }, [moreOpen]);

  // 교체 무제한(풀 조회라 원가 0). 교체한 글감은 그날 다시 안 나옴(기기에 기억).
  const todayKey = `ateflo_dismissed_${new Date().toISOString().slice(0, 10)}`;
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { const raw = typeof window !== "undefined" ? localStorage.getItem(todayKey) : null; return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const dismissedRef = useRef(dismissed);
  dismissedRef.current = dismissed;

  const todayDate = new Date().toISOString().slice(0, 10);
  const topicsCacheKey = () => `ateflo_topics_v27_${todayDate}_${profileKey ?? ""}_normal`;

  const SWAP_LIMIT = 12; // 하루 교체 상한 — 풀 소진·API 낭비 방지(유저 요청)
  const swapCountKey = `ateflo_swaps_${new Date().toISOString().slice(0, 10)}`;
  const [swapCount, setSwapCount] = useState<number>(() => {
    try { return Number(localStorage.getItem(swapCountKey) ?? "0") || 0; } catch { return 0; }
  });
  const swapTopic = async (kw: string) => {
    if (swapping.includes(kw)) return;
    if (swapCount >= SWAP_LIMIT) { setSwapNotice(true); setTimeout(() => setSwapNotice(false), 2600); return; }
    setSwapCount((c) => { const n = c + 1; try { localStorage.setItem(swapCountKey, String(n)); } catch { /* ignore */ } return n; });
    setSwapping((s) => [...s, kw]);
    try {
      const exclude = [...topics.map((t) => t.keyword), ...dismissedRef.current].join(",");
      const res = await fetch(`/api/topics?${new URLSearchParams({ exclude }).toString()}`);
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
          try { localStorage.setItem(topicsCacheKey(), JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
        const nd = [...dismissedRef.current, kw];
        setDismissed(nd);
        try { localStorage.setItem(todayKey, JSON.stringify(nd)); } catch { /* ignore */ }
      }
    } catch { /* 유지 */ }
    finally { setSwapping((s) => s.filter((x) => x !== kw)); }
  };

  const loadTopics = useCallback(async () => {
    const ck = `ateflo_topics_v27_${new Date().toISOString().slice(0, 10)}_${profileKey ?? ""}_normal`;
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
      const qs = params.toString();
      const res = await fetch(`/api/topics${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      const t = sanitizeTopics(Array.isArray(data.topics) ? data.topics : []);
      // ★빈 응답 방어 — 서버가 일시적으로 0개를 주면 기존 목록 유지(화면 전멸 금지)
      setTopics((prev) => (t.length > 0 ? t : prev));
      try { if (t.length >= 3) localStorage.setItem(ck, JSON.stringify(t)); } catch { /* ignore */ }
    } catch {
      setTopics((prev) => prev); // 네트워크 실패 — 기존 유지
    } finally {
      clearTimeout(collectTimer);
      setCollecting(false);
      setTopicsLoading(false);
    }
  }, [profileKey]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // 코스 상태 + 오늘의 초안
  const info = courseInfo(articles);
  const clean = sanitizeTopics(topics);
  const first = clean[0] ?? null;
  const rest = clean.slice(1);

  return (
    <main className="mx-auto max-w-2xl px-6 pb-10">
      {swapNotice && (
        <div className="ateflo-fade-in fixed left-1/2 top-6 z-[80] -translate-x-1/2 rounded-full at-glass-strong px-4 py-2.5 text-[13px] font-bold text-neutral-700 shadow-lg">
          오늘 글감 교체는 여기까지예요 · 내일 새 글감이 와요
        </div>
      )}
      {/* 상단 — 블로그명 + 크레딧 칩(탭 → 충전·내역) */}
      <div className="at-rise flex items-center justify-between pt-7">
        <p className="at-label">{blogName}</p>
        <div className="flex items-center gap-2">
        {onOpenNews && (
          <button onClick={onOpenNews} aria-label="공지·업데이트" className="at-press relative flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-black/[0.05] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
            <span className={unreadNews ? "at-bell-shake inline-flex" : "inline-flex"}>
              <GlassIcon name="bell" tint={unreadNews ? "violet" : "grey"} size={16} />
            </span>
            {unreadNews && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
          </button>
        )}
        <button onClick={onOpenCredits} className="at-press flex items-center gap-1 rounded-full bg-white px-3 py-1.5 ring-1 ring-black/[0.05] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
          <GlassIcon name="credit" tint="blue" size={20} icon={0.7} radius={7} />
          <span className="text-[13px] font-bold text-[color:var(--at-grey-900)]">{credits.toLocaleString("ko-KR")}</span>
        </button>
        </div>
      </div>

      {/* 히어로 — 코스 진행 링 */}
      <div className="at-rise at-d1 mt-4">
        <CourseRing info={info} />
      </div>

      {/* 오늘의 글 — 단일 CTA */}
      <div className="at-rise at-d2 mt-6">
        <TodayCard
          topic={first ? { keyword: first.keyword, title: first.title, tag: first.tag, newsContext: first.newsContext, briefText: first.briefText, titleSearch: first.titleSearch, thumb: first.thumb } : null}
          loading={topicsLoading}
          credits={credits}
          info={info}
          onWriteKeyword={onWriteKeyword}
          onGoPerformance={onGoPerformance}
        />
      </div>

      {/* 접힘 — 다른 글감 */}
      <div className="at-rise at-d3 mt-3">
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="at-press flex w-full items-center gap-3 rounded-2xl at-glass px-5 py-4 text-left "
        >
          <span className="min-w-0 flex-1 text-[14px] font-bold text-[color:var(--at-grey-700)]">
            다른 글감 {topicsLoading ? "" : rest.length}
          </span>
          <svg className={`shrink-0 text-neutral-300 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {moreOpen && (
          <div ref={moreRef} className="at-rise mt-2 scroll-mb-24">
            {topicsLoading ? (
              <TopicsSkeleton collecting={collecting} />
            ) : rest.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {rest.map((t) => (
                  <TopicRow key={t.keyword} topic={t} onClick={() => onWriteKeyword(t.keyword, t.title, t.newsContext, t.briefText, t.titleSearch, t.thumb)} onSwap={() => swapTopic(t.keyword)} swapping={swapping.includes(t.keyword)} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl at-glass p-6 text-center text-[13px] text-neutral-400 ">
                오늘 글감은 위 카드가 전부예요. <button onClick={loadTopics} className="font-semibold text-[#1D75F7]">다시 받기</button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// ★글감 카드 v2 — 상단 데이터 배지 → 제목 → 명시 CTA. 교체는 우상단 텍스트 버튼(아이콘 없음).
function TopicRow({ topic, onClick, onSwap, swapping }: {
  topic: { keyword: string; title: string; vol: number; comp: Comp; blogTotal?: number | null; tag?: string; newsContext?: string; briefText?: string; titleSearch?: string; thumb?: { mainCopy: string; subCopy: string; badge: string } };
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
    <div className={`rounded-2xl at-glass p-5  transition ${swapping ? "at-ai-swap" : ""}`}>
      <div className="flex items-center gap-2">
        {topic.tag === "issue" || topic.tag === "trend" ? (
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-600">🔥 실시간 트렌드</span>
        ) : (
          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${compMeta.cls}`}>{compMeta.label}</span>
        )}
        <span className="text-[12px] font-medium text-[color:var(--at-grey-400)]">
          {topic.tag === "issue" || topic.tag === "trend" ? "지금 뜨는 중 · 선점 기회" : topic.vol > 0 ? `월 ${topic.vol.toLocaleString("ko-KR")}회 검색` : "숨은 수요 키워드"}
        </span>
        {onSwap && (
          <button onClick={onSwap} disabled={swapping} aria-label="새 글감 받기" className="at-press ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-300 transition hover:bg-neutral-50 hover:text-[#1D75F7] disabled:opacity-40">
<span className={`flex h-[18px] w-[18px] items-center justify-center ${swapping ? "animate-spin" : ""}`}><GlassIcon name="refresh" tint="grey" size={18} /></span>
          </button>
        )}
      </div>
      {swapping ? (
        <div className="mt-2.5" aria-hidden>
          <div className="ateflo-skel h-[20px] w-4/5 rounded" />
          <p className="mt-2.5 text-[12px] font-semibold text-[#8b7cf7]">AI가 새 글감을 고르고 있어요…</p>
        </div>
      ) : (
        <>
          <button onClick={onClick} className="mt-2 block w-full text-left">
            <p className="text-[15.5px] font-bold leading-snug text-[color:var(--at-grey-900)]">{topic.title}</p>
          </button>
          <button onClick={onClick} className="at-press mt-3 text-[13px] font-bold text-[#1D75F7]">
            이 글 쓰기 →
          </button>
        </>
      )}
    </div>
  );
}

// 글감 로딩 — 새 규격: v2 카드 실루엣 셔머(블러·돋보기 제거)
function TopicsSkeleton({ collecting }: { collecting: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl at-glass p-5 " aria-hidden>
          <div className="flex items-center gap-2">
            <div className="ateflo-skel h-[18px] w-14 rounded-md" />
            <div className="ateflo-skel h-3.5 w-24 rounded" />
          </div>
          <div className="ateflo-skel mt-3 h-[20px] w-4/5 rounded" />
          <div className="ateflo-skel mt-3 h-3.5 w-16 rounded" />
        </div>
      ))}
      <p className="pt-1 text-center text-[12px] font-medium text-neutral-400">
        {collecting ? "처음이라 글감을 모으고 있어요 — 잠시만요" : "검색 데이터로 글감을 고르는 중…"}
      </p>
    </div>
  );
}
