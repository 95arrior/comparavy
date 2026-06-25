"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TopicCard from "@/components/TopicCard";
import SeriesSheet from "./SeriesSheet";
import StoryComposer from "./StoryComposer";
import type { Comp } from "@/lib/topicScore";
import type { BloggerType } from "@/lib/bloggerTypes";
import type { Article } from "./types";

interface Topic { keyword: string; title: string; demandLabel: string; ssak?: boolean; region?: boolean; tone?: "local" | "online" | "hobby"; vol: number; comp: Comp; tag?: string; blogTotal?: number | null }

// 글감 모으는 동안 순환 안내(멈춘 듯 안 보이게 — 첫 카테고리는 네이버 수집이라 잠깐 걸림)
const LOAD_MSGS = ["검색되는 키워드를 찾는 중…", "경쟁 낮은 글감을 고르는 중…", "글감 제목을 다듬는 중…"];

// 소주제 군집 키(서버와 동일 규칙: 띄어쓰기·기호 제거 후 앞 4글자) — 교체 시 비슷한 소주제 중복 방지
const clusterOf = (s: string) => s.replace(/\s+/g, "").replace(/[^가-힣a-z0-9]/gi, "").slice(0, 4);

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
  regionTrigger,
  hasBusinessInfo,
  onEditBusiness,
  onWriteStory,
  profileKey,
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
  regionTrigger?: number; // 성과 페이지 '지역 선점'에서 넘어오면 지역 강화 자동 ON
  hasBusinessInfo?: boolean; // 업체 주소 등록 여부 — 지역 강화 가능 판단
  onEditBusiness?: () => void; // 업체 등록(온보딩 재진입)
  onWriteStory?: (story: string, promo: boolean, title: string) => void; // 내 이야기로 글쓰기(메인 기능, 인라인)
  profileKey?: string; // 업종:세부 — 글감 캐시 분리(업종 바꾸면 새 글감)
}) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [collecting, setCollecting] = useState(false); // 재빌드(처음 모으는 중) — 일반 로딩과 다름
  const [loadStage, setLoadStage] = useState(0);
  const [swapping, setSwapping] = useState<string[]>([]); // 교체 중인 글감 keyword들(동시·연속 교체)
  const [cluster, setCluster] = useState<string | null>(null); // '주제 이어가기' 활성 토픽(null=기본 다양)
  const [regionMode, setRegionMode] = useState(false); // '지역 강화'(우리 동네 키워드 실데이터) 모드
  const [showGlams, setShowGlams] = useState(false); // 글감 추천 보기(기본은 내 이야기 입력, 버튼으로 글감 펼침)
  const [seriesOpen, setSeriesOpen] = useState(false); // '주제 시리즈' 시트
  const [storyTitle, setStoryTitle] = useState(""); // 사장님이 직접 정하는 제목(유지)
  const [storyDraft, setStoryDraft] = useState(""); // 내 이야기 초안 — 글감 보기 갔다 와도 유지(상태 끌어올림)
  const [storyPromo, setStoryPromo] = useState(() => bloggerType === "local"); // 동네 사장님은 '소개' 의도라 홍보용 기본
  // 성과 '지역 선점'에서 넘어오면 지역 강화 자동 ON (동네 사장님만)
  useEffect(() => {
    if (regionTrigger && bloggerType === "local") { setShowGlams(true); setRegionMode(true); }
  }, [regionTrigger, bloggerType]);

  // 사용자가 가장 많이 쓴 주제 토큰(2편 이상) → '주제 이어가기' 제안용
  // 하루 3회 교체 + 교체한 글감은 그날 다시 안 나옴(기기에 기억 — 새로고침해도 유지)
  const SWAP_LIMIT = isAdmin ? Infinity : 3; // 관리자(테스트)는 무제한 교체
  const todayKey = `ateflo_dismissed_${new Date().toISOString().slice(0, 10)}`;
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { const raw = typeof window !== "undefined" ? localStorage.getItem(todayKey) : null; return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const dismissedRef = useRef(dismissed);
  dismissedRef.current = dismissed;
  const swapLeft = Math.max(0, SWAP_LIMIT - dismissed.length);

  // 글감 캐시 키 — 하루 고정 + 모드별(새로고침·복귀·모드전환 시 재로딩·재셔플 방지)
  const todayDate = new Date().toISOString().slice(0, 10);
  const topicsCacheKey = (md: string) => `ateflo_topics_v14_${todayDate}_${profileKey ?? ""}_${md}`;
  const curModeKey = regionMode ? "region" : cluster ? `cluster:${cluster}` : "normal";

  // '이 글감 교체' → 그 카드만 새 글감으로. 동시·연속 교체 허용(하나 끝나길 안 기다림).
  const swapTopic = async (kw: string) => {
    if (swapping.includes(kw) || dismissedRef.current.length + swapping.length >= SWAP_LIMIT) return;
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
      const currentClusters = new Set(topics.map((t) => clusterOf(t.title))); // ★소주제(클러스터) 단위 중복 방지 — '눈온열안대 사용법'·'눈온열안대 효과' 둘 다 안 나오게
      const cands = fresh.filter((t) => !current.has(t.keyword) && !currentTitles.has(t.title) && !currentClusters.has(clusterOf(t.title)) && !dismissedRef.current.includes(t.keyword));
      const repl = cands.length ? cands[Math.floor(Math.random() * cands.length)] : null; // 동시 교체 충돌↓
      if (repl) {
        setTopics((prev) => {
          // 동시 교체로 다른 카드가 이미 같은 키워드/제목/소주제면 교체 취소(중복 방지)
          if (prev.some((t) => t.keyword !== kw && (t.keyword === repl.keyword || t.title === repl.title || clusterOf(t.title) === clusterOf(repl.title)))) return prev;
          const next = prev.map((t) => (t.keyword === kw ? repl : t));
          try { localStorage.setItem(topicsCacheKey(curModeKey), JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
        const nd = [...dismissedRef.current, kw];
        setDismissed(nd);
        try { localStorage.setItem(todayKey, JSON.stringify(nd)); } catch { /* ignore */ }
      }
    } catch { /* 유지 */ }
    finally { setSwapping((s) => s.filter((x) => x !== kw)); }
  };

  // 로딩 동안 안내 메시지 순환
  useEffect(() => {
    if (!topicsLoading) { setLoadStage(0); return; }
    const t = setInterval(() => setLoadStage((s) => (s + 1) % LOAD_MSGS.length), 1800);
    return () => clearInterval(t);
  }, [topicsLoading]);

  const loadTopics = useCallback(async () => {
    const md = regionMode ? "region" : cluster ? `cluster:${cluster}` : "normal";
    const ck = `ateflo_topics_v14_${new Date().toISOString().slice(0, 10)}_${profileKey ?? ""}_${md}`;
    // 하루 고정 — 캐시 있으면 즉시 표시(로딩·재셔플 없음). 새로고침·강력새로고침·모드전환 모두 안정.
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(ck) : null;
      // 꽉 찬(3개) 글감일 때만 캐시 사용 — 얇은(1~2개) 풀이 캐시되어 재빌드를 가리는 것 방지
      if (raw) { const c = JSON.parse(raw); if (Array.isArray(c) && c.length >= 3) { setTopics(c); setTopicsLoading(false); return; } }
    } catch { /* 캐시 미스 → 아래로 */ }

    setTopicsLoading(true);
    setCollecting(false);
    const collectTimer = setTimeout(() => setCollecting(true), 4000); // 4초+ = 재빌드(처음 모으는 중)
    try {
      const ex = dismissedRef.current; // 그날 교체한 글감은 새로고침해도 제외
      const params = new URLSearchParams();
      if (ex.length) params.set("exclude", ex.join(","));
      if (cluster) params.set("cluster", cluster);
      if (regionMode) params.set("region", "1");
      const qs = params.toString();
      const res = await fetch(`/api/topics${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      const t: Topic[] = Array.isArray(data.topics) ? data.topics : [];
      setTopics(t);
      try { if (t.length >= 3) localStorage.setItem(ck, JSON.stringify(t)); } catch { /* ignore */ }
    } catch {
      setTopics([]);
    } finally {
      clearTimeout(collectTimer);
      setCollecting(false);
      setTopicsLoading(false);
    }
  }, [cluster, regionMode, profileKey]);

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
        {bloggerType !== "local" && !wpConnected && (
          <button onClick={onGoConnect} className="text-xs font-medium text-[#1D75F7] transition hover:underline">워드프레스 연결</button>
        )}
      </div>

      {/* 중앙 — 히어로 + 오늘의 글감 3개 */}
      <div className="flex flex-1 flex-col justify-center py-6">
      {/* 메인 — 내 이야기 인라인 입력. 글감은 '추천받기' 버튼으로 펼친다(showGlams) */}
      {!showGlams ? (
        <div className="ateflo-page-in mt-6">
          {onWriteStory && <StoryComposer hasBiz={hasBusinessInfo ?? false} local={bloggerType === "local"} title={storyTitle} onTitleChange={setStoryTitle} story={storyDraft} onStoryChange={setStoryDraft} promo={storyPromo} onPromoChange={setStoryPromo} onSubmit={(s, p, t) => onWriteStory(s, p, t)} />}
          <button onClick={() => setShowGlams(true)} className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white py-3.5 text-[13.5px] font-bold text-neutral-600 ring-1 ring-black/[0.04] transition hover:ring-[#1D75F7]/30 active:scale-[0.99]">
            뭘 쓸지 고민된다면? <span className="text-[#1D75F7]">글감 추천받기</span>
            <svg className="text-neutral-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      ) : (
        <div className="ateflo-page-in">
          {!cluster && !regionMode && (
            <button onClick={() => setShowGlams(false)} className="mt-6 -ml-1 flex items-center gap-1 text-[13px] font-medium text-neutral-400 transition hover:text-neutral-700"><span className="text-base leading-none">←</span> 내 이야기로</button>
          )}

      {/* 추천 글감(보조) — 글감이 떠오르지 않을 때. 누르면 그 글 쓰기 */}
      {cluster ? (
        <div className="mt-8">
          <button onClick={() => setCluster(null)} className="-ml-1 flex items-center gap-1 text-[13px] font-medium text-neutral-400 transition hover:text-neutral-700">
            <span className="text-base leading-none">←</span> 다양한 글감으로
          </button>
          <h2 className="mt-2 text-[15px] font-bold tracking-tight text-neutral-900">‘{cluster}’ 이어가기</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-neutral-400">한 주제를 깊이 쓰면 그 분야 <b className="text-[#1D75F7]">검색 권위</b>가 생겨 상위에 유리해요</p>
        </div>
      ) : regionMode ? (
        <div className="mt-8">
          <button onClick={() => setRegionMode(false)} className="-ml-1 flex items-center gap-1 text-[13px] font-medium text-neutral-400 transition hover:text-neutral-700">
            <span className="text-base leading-none">←</span> 일반 글감으로
          </button>
          {/* 우리동네 = 틸 배너 + 핀으로 일반 글감과 확실히 구분 */}
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-teal-50 p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg></span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold tracking-tight text-teal-900">우리 동네 손님 공략</h2>
              <p className="truncate text-[12px] text-teal-700/80">동네 손님이 실제 검색하는 키워드예요</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <p className="text-[12px] font-medium text-neutral-400">또는, 쓸 게 안 떠오르면</p>
          <h2 className="mt-0.5 text-[15px] font-bold tracking-tight text-neutral-900">오늘의 추천 글감</h2>
        </div>
      )}
      {topicsLoading ? (
        <div className="relative mt-3">
          {/* 블러된 글감 스켈레톤 — 실제 카드와 '같은 자리' */}
          <div className="flex select-none flex-col gap-3 blur-[2.5px]" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl bg-white px-5 py-4 ring-1 ring-black/[0.05] sm:px-6 sm:py-5">
                <div className="h-[18px] w-12 rounded-full bg-neutral-200" />
                <div className="mt-1.5 h-[22px] w-3/4 rounded bg-neutral-200" />
                <div className="mt-1.5 h-3.5 w-2/3 rounded bg-neutral-100" />
                <div className="mt-3 h-3.5 w-14 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
          {/* 돋보기로 '찾는 중' — 좌측 돋보기가 훑듯 움직임 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2.5 rounded-full bg-white/85 px-5 py-2.5 shadow-[0_6px_20px_-8px_rgba(20,40,90,0.3)] backdrop-blur-sm">
              <svg className="ateflo-search-scan shrink-0 text-[#1D75F7]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <p key={collecting ? "collect" : loadStage} className="ateflo-soft-in text-sm font-semibold text-neutral-700">{collecting ? "처음이라 글감을 모으는 중이에요" : LOAD_MSGS[loadStage]}</p>
            </div>
          </div>
        </div>
      ) : topics.length > 0 ? (
        <div className="mt-3">
          <div className="flex flex-col gap-3">
            {topics.map((t, i) => (
              <TopicCard key={t.keyword} title={t.title} tag={t.tag || undefined} vol={t.vol} comp={t.comp} blogTotal={t.blogTotal} idx={i} cta="이 글 쓰기" region={t.region} onClick={() => onWriteKeyword(t.keyword, t.title)} onDismiss={!t.region && swapLeft > 0 ? () => swapTopic(t.keyword) : undefined} dismissing={swapping.includes(t.keyword)} />
            ))}
          </div>
          {regionMode ? (
            <p className="mt-3 text-center text-[12px] text-neutral-300">우리 동네 글감은 그날 고정이에요</p>
          ) : !isFinite(swapLeft) ? (
            <p className="mt-3 text-center text-[12px] text-neutral-300">마음에 안 들면 ↻로 교체 (테스트 · 무제한)</p>
          ) : swapLeft <= 0 ? (
            <p className="mt-3 text-center text-[12px] text-neutral-400">오늘 글감 교체는 다 썼어요 · 내일 새 글감이 와요</p>
          ) : (
            <p className="mt-3 text-center text-[12px] text-neutral-300">마음에 안 들면 ↻로 교체 (오늘 {swapLeft}회 남음)</p>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-3xl bg-neutral-50 p-8 text-center text-sm text-neutral-400">
          {regionMode && hasBusinessInfo === false ? (
            <>
              <p className="font-bold text-neutral-700">업체 정보를 아직 등록 안 하셨어요</p>
              <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-neutral-400">주소를 등록하면 우리 동네 손님이 찾는 글감을 찾아드려요.</p>
              <button onClick={onEditBusiness} className="mt-4 rounded-xl bg-[#1D75F7] px-5 py-2.5 text-[13px] font-bold text-white transition hover:opacity-90 active:scale-95">업체 등록하러 가기</button>
              <button onClick={() => setRegionMode(false)} className="mt-2 block w-full text-[12px] font-medium text-neutral-400">일반 글감으로</button>
            </>
          ) : (
            <>
              {cluster ? "이 주제로 더 쓸 글감이 없어요. " : regionMode ? "우리 동네 키워드를 못 찾았어요. " : "아직 추천할 글감이 없어요. "}
              <button onClick={cluster ? () => setCluster(null) : regionMode ? () => setRegionMode(false) : loadTopics} className="font-medium text-[#1D75F7]">{cluster ? "다양한 글감으로" : regionMode ? "일반 글감으로" : "다시 받기"}</button>
            </>
          )}
        </div>
      )}

      {/* 더 깊게 쓰기 — 우리 동네 키워드 강화(local) + 주제 시리즈 */}
      {!cluster && !regionMode && !topicsLoading && (
        <div className="mt-4 space-y-2">
          {bloggerType === "local" && (
            <button onClick={() => setRegionMode(true)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-black/[0.04] transition hover:ring-teal-300 active:scale-[0.99]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg></span>
              <span className="min-w-0 flex-1 truncate text-left text-[14px] font-bold text-neutral-900">우리 동네 키워드 강화</span>
              <svg className="shrink-0 text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          )}
          <button onClick={() => setSeriesOpen(true)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-black/[0.04] transition hover:ring-violet-300 active:scale-[0.99]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg></span>
            <span className="min-w-0 flex-1 truncate text-left text-[14px] font-bold text-neutral-900">주제 시리즈로 전문 블로그 되기</span>
            <svg className="shrink-0 text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      )}

      {seriesOpen && <SeriesSheet articles={articles} onWrite={onWriteKeyword} onClose={() => setSeriesOpen(false)} />}
        </div>
      )}
      </div>
      </section>

    </main>
  );
}
