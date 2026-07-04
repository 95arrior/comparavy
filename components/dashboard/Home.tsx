"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TodayCard from "./TodayCard";
import GlassIcon from "@/components/GlassIcon";
import CourseRing from "./CourseRing";
import CheckinCard from "./CheckinCard";
import NeighborMission from "./NeighborMission";
import DiagnosisCard from "./DiagnosisCard";
import { courseInfo, yesterdayPublished, pickNextTopic, todayKeywords, localPubFlagKey, progressPercent } from "@/lib/course";
import { depletionForecast, attackEligible } from "@/lib/checkin";
import { GENERATE_COST } from "@/lib/creditPacks";
import { nextSeedRefreshLabel } from "@/lib/seedRefresh";
import { revenuePath } from "@/lib/revenue";
import CountUp from "@/components/CountUp";
import { isVerifiedStatus } from "@/lib/course";
import { REVIEW_WEEKLY_MIN } from "@/lib/scoreWeights";
import type { Comp } from "@/lib/topicScore";
import type { Article } from "./types";

interface Topic { keyword: string; title: string; demandLabel: string; vol: number; comp: Comp; tag?: string; blogTotal?: number | null; newsContext?: string; briefText?: string; titleSearch?: string; thumb?: { mainCopy: string; subCopy: string; badge: string } }

// 소주제 군집 키(서버와 동일 규칙) — 교체 시 비슷한 소주제 중복 방지
let freshDoneRef = false; // ?fresh=1 1회 가드
const clusterOf = (s: string) => s.replace(/\s+/g, "").replace(/[^가-힣a-z0-9]/gi, "").slice(0, 4);

// ★표시 글감 정제 — 키워드/제목/소주제 중 하나라도 겹치면 제외 + 최대 6개(오늘 1 + 다른 글감 5, 소모 시 교체로 풀 리필).
const STALE_YEAR_RE = /20(1[0-9]|2[0-5])/; // 2010~2025 — '2024 최신' 같은 구식 글감은 어디서 왔든 화면에서 차단
function sanitizeTopics(arr: Topic[], limit = 6): Topic[] {
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
  subCategory,
  onAddBlog,
}: {
  displayName: string;
  blogName: string;
  articles: Article[];
  /** 크레딧 잔액 — 0이면 '오늘의 글' 카드가 잠김(글감은 보임) */
  credits: number;
  onWriteKeyword: (keyword: string, title: string, newsContext?: string, briefText?: string, titleSearch?: string, thumb?: { mainCopy: string; subCopy: string; badge: string }, extra?: { seriesId?: string; series?: unknown }) => void;
  onSelect: (a: Article) => void;
  onGoPerformance: () => void;
  /** 크레딧 칩 탭 → 충전·사용내역 페이지 */
  onOpenCredits: () => void;
  /** 공지 벨 — 안 읽은 소식 있으면 빨간 점+흔들림 */
  unreadNews?: boolean;
  onOpenNews?: () => void;
  profileKey?: string; // 주제:세부 — 글감 캐시 분리(주제 바꾸면 새 글감)
  subCategory?: string | null; // 이웃 미션 검색어·인사말 개인화
  onAddBlog?: () => void; // ★멀티 블로그 — 새 블로그 추가(온보딩 재사용)
}) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  // ★?fresh=1 — 글감만 리셋(콘솔 불필요, 여정 테스트용). 발행·체크인·진행 데이터는 무관.
  //  useState 초기화보다 먼저 동기 실행돼야 dismissed·캐시 초기값에 반영된다.
  if (typeof window !== "undefined" && !freshDoneRef && new URLSearchParams(window.location.search).has("fresh")) {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("ateflo_topics_") || k.startsWith("ateflo_dismissed_") || k.startsWith("ateflo_swaps_"))
        .forEach((k) => localStorage.removeItem(k));
      window.history.replaceState(null, "", window.location.pathname);
    } catch { /* ignore */ }
    freshDoneRef = true;
  }

  const [swapping, setSwapping] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false); // '다른 글감' 접힘 토글(시트로 대체 — 유지: 스크롤 ref)
  const [routineSheet, setRoutineSheet] = useState<null | "checkin" | "neighbor" | "topics">(null);
  const [blogSheet, setBlogSheet] = useState(false); // ★블로그 스위처
  const [blogCount, setBlogCount] = useState(1);
  useEffect(() => { fetch("/api/blogs").then((r) => r.json()).then((d) => { const n = Array.isArray(d.blogs) ? d.blogs.length : 1; setBlogCount(Math.max(1, n)); }).catch(() => { /* ignore */ }); }, []);
  const [blogList, setBlogList] = useState<{ id: string; blog_name: string | null; sub_category: string | null; is_active: boolean }[]>([]);
  async function openBlogSheet() {
    setBlogSheet(true);
    try { const r = await fetch("/api/blogs"); const d = await r.json(); setBlogList(Array.isArray(d.blogs) ? d.blogs : []); } catch { /* ignore */ }
  } // ★토스식 — 루틴은 행, 상세는 시트
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

  // ★사전 생성(생성 경험 v2) — 홈 진입 시 오늘의 글 1편을 서버 백그라운드로. 홈에 어떤 진행 표시도 없다(침묵 원칙).
  const preFiredRef = useRef<string | null>(null);
  const [preReadyId, setPreReadyId] = useState<string | null>(null);
  const todayDate = new Date().toISOString().slice(0, 10);
  const topicsCacheKey = () => `ateflo_topics_v29_${todayDate}_${profileKey ?? ""}_normal`;

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
      const res = await fetch(`/api/topics?${new URLSearchParams({ exclude, ...(localStorage.getItem("ateflo_attack_mode") === "1" ? { attack: "1" } : {}) }).toString()}`);
      const data = await res.json();
      const fresh: Topic[] = Array.isArray(data.topics) ? data.topics : [];
      const current = new Set(topics.map((t) => t.keyword));
      const currentTitles = new Set(topics.map((t) => t.title));
      const currentClusters = new Set(topics.map((t) => clusterOf(t.title)));
      const cands = fresh.filter((t) => !current.has(t.keyword) && !currentTitles.has(t.title) && !currentClusters.has(clusterOf(t.title)) && !dismissedRef.current.includes(t.keyword));
      // ★같은 계열 우선 — 트렌드 자리는 트렌드로 먼저 교체(재고 소진 시에만 풀로). 교체 반복 시 전부 풀로 수렴하는 체감 완화.
      const outgoing = topics.find((t) => t.keyword === kw);
      const isTrendy = (t: { tag?: string }) => t.tag === "trend" || t.tag === "issue" || t.tag === "steady";
      const sameKind = outgoing && isTrendy(outgoing) ? cands.filter(isTrendy) : cands;
      const pickPool = sameKind.length ? sameKind : cands;
      const repl = pickPool.length ? pickPool[Math.floor(Math.random() * pickPool.length)] : null;
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
    const ck = `ateflo_topics_v29_${new Date().toISOString().slice(0, 10)}_${profileKey ?? ""}_normal`;
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
      let atk = ""; try { atk = localStorage.getItem("ateflo_attack_mode") === "1" ? (qs ? "&" : "") + "attack=1" : ""; } catch { /* ignore */ }
      const res = await fetch(`/api/topics${qs || atk ? `?${qs}${atk}` : ""}`);
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
  const infoRaw = courseInfo(articles);
  // ★발행 후 삭제 케이스 — 당일 미션 유지(이미 수행): 로컬 발행 플래그 병합. 게이지 차감은 별도 규칙.
  let pubFlag = false;
  try { pubFlag = typeof window !== "undefined" && localStorage.getItem(localPubFlagKey()) === "1"; } catch { /* ignore */ }
  const info = pubFlag && !infoRaw.publishedToday ? { ...infoRaw, publishedToday: true } : infoRaw;
  const clean = sanitizeTopics(topics);
  // ★'오늘의 글' 후보 — 오늘 이미 만든 글감(발행분 포함)은 제외(한 편 더 = 같은 글감 재생성 버그 방지).
  // 랭크: 후속(증폭)·시리즈 > 트렌드(이슈 인터럽트 훅: 시리즈보다 뜨거운 이슈는 유저가 아래 목록에서 즉시 선택 가능) > 꾸준 > 풀.
  // 주간 리뷰형 최소 보장(REVIEW_WEEKLY_MIN) — 증폭·시리즈 없을 때 리뷰형 후보 승격(쇼핑커넥트 경로가 굶지 않게).
  const usedToday = todayKeywords(articles);
  const normK = (k: string) => k.replace(/\s+/g, "").toLowerCase();
  const availClean = clean.filter((t) => !usedToday.map(normK).includes(normK(t.keyword)));
  const boost = availClean.find((t) => t.tag === "followup" || (t as { seriesId?: string }).seriesId);
  const weekAgo = Date.now() - 7 * 86400000;
  const reviewThisWeek = articles.filter((a) => a.status !== "generating" && new Date(a.created_at).getTime() >= weekAgo && revenuePath({ keyword: a.keyword ?? "", title: a.title }) === "shopping").length;
  const reviewPick = reviewThisWeek < REVIEW_WEEKLY_MIN ? availClean.find((t) => revenuePath({ keyword: t.keyword, title: t.title }) === "shopping") : undefined;
  const first = boost ?? reviewPick ?? pickNextTopic(clean, usedToday);
  // ★오늘의 글 교체 — 하루 2회(무한 고르기 방지·뇌빼고 유지). 파쇄기류 미스매치 탈출구.
  const heroSwapKey = `ateflo_heroswap_${new Date().toISOString().slice(0, 10)}`;
  function heroSwap() {
    if (!first) return;
    let n = 0; try { n = Number(localStorage.getItem(heroSwapKey) ?? "0") || 0; } catch { /* ignore */ }
    if (n >= 2) { setSwapNotice(true); setTimeout(() => setSwapNotice(false), 2600); return; }
    try { localStorage.setItem(heroSwapKey, String(n + 1)); } catch { /* ignore */ }
    const kw = first.keyword;
    const nd = [...dismissedRef.current, kw];
    setDismissed(nd);
    try { localStorage.setItem(todayKey, JSON.stringify(nd)); } catch { /* ignore */ }
    setTopics((prev) => { const next = prev.filter((t) => t.keyword !== kw); try { localStorage.setItem(topicsCacheKey(), JSON.stringify(next)); } catch { /* ignore */ } return next; });
  }
  // 트리거 조건: 글감 확정 + 크레딧 있음 + 오늘 미완료·무초안. 같은 글감 재트리거 금지(ref).
  useEffect(() => {
    const f = first;
    if (!f || credits < GENERATE_COST || info.publishedToday || info.hasDraftToday) return;
    if (preFiredRef.current === f.keyword) return;
    preFiredRef.current = f.keyword;
    (async () => {
      try {
        const r = await fetch("/api/pregen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: f.keyword, title: f.title, newsContext: f.newsContext, briefText: f.briefText, userTitle: f.title }) });
        const d = await r.json();
        if (d.status === "ready" && d.articleId) { setPreReadyId(d.articleId); return; }
        if (d.status === "started" || d.status === "exists") {
          setTimeout(async () => { // 조용한 1회 확인(라벨 전환용) — UI 표시 없음
            try { const g = await fetch(`/api/pregen?keyword=${encodeURIComponent(f.keyword)}`); const gd = await g.json(); if (gd.status === "ready" && gd.articleId) setPreReadyId(gd.articleId); } catch { /* ignore */ }
          }, 75000);
        }
      } catch { /* 침묵 — 실패해도 일반 경로 그대로 */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first?.keyword, credits, info.publishedToday, info.hasDraftToday]);

  // ★열람 = 차감 → 0초 검토. 실패는 일반 경로 자연 폴백.
  async function readToday() {
    const f = first;
    if (!preReadyId || !f) return;
    const t0 = performance.now();
    try {
      const r = await fetch("/api/pregen/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId: preReadyId }) });
      const d = await r.json();
      if (r.ok && d.article) {
        console.log(`[pregen] tap→shown ${(performance.now() - t0).toFixed(0)}ms`); // 계측: 열람 체감
        onSelect(d.article);
        return;
      }
    } catch { /* 폴백 */ }
    setPreReadyId(null);
    onWriteKeyword(f.keyword, f.title, f.newsContext, f.briefText, f.titleSearch, f.thumb);
  }
  const rest = clean.filter((t) => t !== first);

  return (
    <main className="mx-auto max-w-[520px] px-5 pb-16">
      {/* 인사말 */}
      <button onClick={openBlogSheet} className="tk-seq-1 flex items-center gap-1 pt-6 text-[15px] font-semibold text-[color:var(--color-text-sub)]">
        {blogName}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {/* 상태 카드 — 큰 숫자(그라데이션) + 살아있는 게이지 */}
      <button onClick={onGoPerformance} className="tk-seq-1 tk-cta tk-card-glow mt-3 block w-full rounded-[20px] p-6 text-left shadow-[0_2px_12px_-4px_rgba(29,117,247,0.12)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-[color:var(--color-text-weak)]">애드포스트 승인까지</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="tk-grad-text text-[36px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">{info.finished ? "완주" : info.day > 0 ? `D-${info.day}` : "D-20"}</span>
              <span className="text-[15px] font-semibold tabular-nums text-[color:var(--color-brand)]"><CountUp to={progressPercent(info)} duration={800} />%</span>
            </div>
          </div>
        </div>
        <div className="tk-gauge mt-5 h-2.5 w-full rounded-full bg-[#E8EDF7]">
          <div className="tk-gauge-fill" style={{ width: `${Math.max(progressPercent(info), 3)}%` }} />
        </div>
        <p className="mt-4 text-[13px] text-[color:var(--color-text-sub)]">
          {info.streak > 0 ? `${info.streak}일 연속 발행 중 · ` : ""}
          {yesterdayPublished(articles) ? "어제 발행 확인 · " : ""}
          {(() => { const d = Math.floor(credits / (GENERATE_COST * blogCount)); return d > 0 ? `크레딧 약 ${d > 999 ? "999+" : d}일치` : "크레딧 충전이 필요해요"; })()}
          {blogCount > 1 ? ` (블로그 ${blogCount}개 기준)` : ""}
        </p>
      </button>

      {/* 크레딧 소진 예고 — 잔여 3편 이하 + 실사용 페이스로 예측 가능할 때만(지어내기 금지) */}
      {(() => {
        const f = depletionForecast(credits, GENERATE_COST, articles);
        if (!f || f.postsLeft > 3) return null;
        return (
          <button onClick={onOpenCredits} className="at-rise mt-3 flex w-full items-center justify-between rounded-2xl bg-amber-50 px-5 py-3.5 text-left ring-1 ring-amber-200/60 transition hover:bg-amber-100/70">
            <span className="min-w-0 flex-1">
              <span className="text-[13px] font-bold text-amber-700">글 {f.postsLeft}편 분량 남았어요</span>
              <span className="mt-0.5 block text-[12px] text-amber-600/80">이번 페이스면 {f.weekday}쯤 다 떨어져요 · 미리 충전하면 흐름이 안 끊겨요</span>
            </span>
            <span className="shrink-0 text-[12.5px] font-bold text-amber-700">충전</span>
          </button>
        );
      })()}


      {/* ★공격 모드 잠금해제(Part 3) — 조건 충족 시 자동 제안(사다리 문법). 조건 미달 초보 = 존재 자체 비노출. */}
      {(() => {
        try {
          if (typeof window === "undefined") return null;
          if (localStorage.getItem("ateflo_attack_mode") === "1" || localStorage.getItem("ateflo_attack_offer") === "1") return null;
          const verified = articles.filter((a) => isVerifiedStatus(a.status)).length;
          const approved = localStorage.getItem("ateflo_adpost_approved") === "1";
          const last7 = articles.filter((a) => a.status !== "generating" && new Date(a.created_at).getTime() >= Date.now() - 7 * 86400000).length;
          if (!attackEligible(verified, approved, last7)) return null;
          return (
            <button onClick={() => { try { localStorage.setItem("ateflo_attack_mode", "1"); localStorage.setItem("ateflo_attack_offer", "1"); } catch { /* ignore */ } loadTopics(); }}
              className="at-rise mt-3 flex w-full items-center justify-between rounded-2xl bg-neutral-900 px-5 py-4 text-left transition hover:bg-neutral-800">
              <span className="min-w-0 flex-1">
                <span className="text-[13.5px] font-bold text-white">공격 모드가 열렸어요</span>
                <span className="mt-0.5 block text-[12px] text-white/60">단가 높은 글감과 더 큰 싸움 — 신뢰 쌓인 블로그의 다음 단계예요. 켜면 오늘 글감부터 바뀌어요.</span>
              </span>
              <span className="shrink-0 text-[12.5px] font-bold text-white">켜기</span>
            </button>
          );
        } catch { return null; }
      })()}

      {/* 진단 분기 — 3일 연속 방문 0 + 발행 있음일 때만(원인 단정 없이 확인 안내) */}
      <DiagnosisCard articles={articles} />

      {/* 잠금해제 1회성 — 승인 입력 시 새 수익원 안내 */}
      {(() => {
        try {
          if (typeof window !== "undefined" && localStorage.getItem("ateflo_adpost_approved") === "1" && localStorage.getItem("ateflo_unlock_shown") !== "1") {
            return (
              <button onClick={() => { try { localStorage.setItem("ateflo_unlock_shown", "1"); } catch { /* ignore */ } onGoPerformance(); }}
                className="at-rise mt-3 flex w-full items-center justify-between rounded-[12px] border border-[color:var(--color-line)] bg-[color:var(--color-brand-weak)] px-5 py-3.5 text-left tk-tr">
                <span className="min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-[color:var(--color-text)]">새로운 수익원이 열렸어요</span>
                  <span className="mt-0.5 block text-[13px] text-[color:var(--color-text-sub)]">쇼핑커넥트를 시작할 수 있어요 · 가이드 보기</span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-[color:var(--color-text)]">열기</span>
              </button>
            );
          }
        } catch { /* ignore */ }
        return null;
      })()}

      {/* 오늘의 글 — 단일 CTA */}
      <div className="at-rise at-d2 mt-6">
        <TodayCard
          plain
          topic={first ? { keyword: first.keyword, title: first.title, tag: first.tag, newsContext: first.newsContext, briefText: first.briefText, titleSearch: first.titleSearch, thumb: first.thumb, vol: first.vol, comp: first.comp, blogTotal: first.blogTotal } : null}
          loading={topicsLoading}
          credits={credits}
          info={info}
          onWriteKeyword={onWriteKeyword}
          onGoPerformance={onGoPerformance}
          onHeroSwap={heroSwap}
          onOpenTodayDraft={(() => { const d = articles.find((a) => a.status === "draft" && new Date(a.created_at).toDateString() === new Date().toDateString()); return d ? () => onSelect(d) : undefined; })()}
          preReady={!!preReadyId}
          onReadToday={readToday}
        />
      </div>

      {/* ★오늘의 루틴 — 토스식: 홈엔 행 하나씩, 상세는 시트. 홈의 주인공은 위 '오늘의 글' 하나뿐. */}
      <div className="tk-seq-3 mt-8">
        <p className="px-2 text-[13px] font-semibold text-[color:var(--color-text-weak)]">오늘의 루틴</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {([
            { key: "checkin" as const, label: "아침 체크인", sub: "30초", icon: <GlassIcon name="check" tint="green" size={30} /> },
            { key: "neighbor" as const, label: "이웃 미션", sub: "이웃 5 · 댓글 2", icon: <GlassIcon name="gift" tint="rose" size={30} /> },
            { key: "topics" as const, label: "다른 글감", sub: topicsLoading ? "로딩" : `${rest.length}개`, icon: <GlassIcon name="search" tint="amber" size={30} /> },
          ]).map((r, i) => (
            <button key={r.key} onClick={() => setRoutineSheet(r.key)}
              className="at-press tk-chip rounded-[20px] bg-white p-4 text-left shadow-[0_2px_12px_-4px_rgba(29,117,247,0.12)] tk-tr hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(29,117,247,0.2)]"
              style={{ animationDelay: `${200 + i * 80}ms` }}>
              <span className="flex h-10 w-10 items-center">{r.icon}</span>
              <span className="mt-3 block text-[14px] font-bold text-[color:var(--color-text)]">{r.label}</span>
              <span className="mt-0.5 block text-[12px] text-[color:var(--color-text-weak)]">{r.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ★블로그 스위처 시트 */}
      {blogSheet && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setBlogSheet(false)}>
          <div className="ateflo-sheet-up w-full max-w-md at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <p className="text-[17px] font-bold text-[color:var(--color-text)]">내 블로그</p>
            <div className="mt-3 space-y-2">
              {blogList.map((b) => (
                <button key={b.id} onClick={async () => {
                  if (b.is_active) { setBlogSheet(false); return; }
                  const r = await fetch("/api/blogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activate: b.id }) });
                  if (r.ok) window.location.reload(); // 활성 전환 — 홈 데이터 전체가 그 블로그 기준으로
                }} className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-3.5 text-left tk-tr ${b.is_active ? "bg-[color:var(--color-brand-weak)]" : "bg-[#F7F8FA] hover:bg-[#EFF2F6]"}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-[color:var(--color-text)]">{b.blog_name ?? "내 블로그"}</span>
                    {b.sub_category && <span className="mt-0.5 block text-[12px] text-[color:var(--color-text-weak)]">{b.sub_category}</span>}
                  </span>
                  {b.is_active && <span className="shrink-0 text-[12px] font-bold text-[color:var(--color-brand)]">사용 중</span>}
                </button>
              ))}
            </div>
            {onAddBlog && (
              <button onClick={() => { setBlogSheet(false); onAddBlog(); }} className="at-press mt-3 w-full rounded-[14px] border border-dashed border-[color:var(--color-text-weak)]/40 py-3.5 text-[14px] font-semibold text-[color:var(--color-text-sub)]">
                새 블로그 만들기
              </button>
            )}
            <p className="mt-2 text-center text-[11.5px] text-[color:var(--color-text-weak)]">새 블로그는 기존 블로그와 다른 주제를 추천해요 · 크레딧은 함께 써요</p>
          </div>
        </div>
      )}

      {/* 루틴 시트 — 한 화면 한 주제 */}
      {routineSheet && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setRoutineSheet(null)}>
          <div className="ateflo-sheet-up max-h-[88vh] w-full max-w-md overflow-y-auto at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-[17px] font-bold text-neutral-900">
                {routineSheet === "checkin" ? "아침 체크인" : routineSheet === "neighbor" ? "이웃 미션" : "다른 글감"}
              </p>
              <button onClick={() => setRoutineSheet(null)} className="rounded-lg px-2 py-1 text-[13px] font-medium text-neutral-400 transition hover:text-neutral-700">닫기</button>
            </div>
            <div className="mt-3">
              {routineSheet === "checkin" && (
                <>
                  {yesterdayPublished(articles) && <p className="mb-2 text-[12.5px] font-semibold text-emerald-600">어제 글, 발행 확인됐어요.</p>}
                  <CheckinCard articles={articles} />
                </>
              )}
              {routineSheet === "neighbor" && <NeighborMission subCategory={subCategory} sheet />}
              {routineSheet === "topics" && (
                topicsLoading ? <TopicsSkeleton collecting={collecting} /> : rest.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {rest.map((t, ti) => (
                      <div key={t.keyword} className="tk-chip" style={{ animationDelay: `${ti * 50}ms` }}><TopicRow topic={t} onClick={() => { setRoutineSheet(null); onWriteKeyword(t.keyword, t.title, t.newsContext, t.briefText, t.titleSearch, t.thumb); }} onSwap={() => swapTopic(t.keyword)} swapping={swapping.includes(t.keyword)} /></div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-neutral-50 p-6 text-center text-[13px] text-neutral-400">
                    오늘 글감은 오늘의 글이 전부예요. <button onClick={loadTopics} className="font-semibold text-[color:var(--color-text)] underline">다시 받기</button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
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
    <div className={`rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition ${swapping ? "at-ai-swap" : ""}`}>
      <div className="flex items-center gap-1.5">
        {topic.tag === "issue" || topic.tag === "trend" ? (
          <span className="rounded-full bg-[color:var(--color-brand-weak)] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--color-brand)]">실시간 트렌드</span>
        ) : topic.tag === "steady" ? (
          <span className="rounded-full bg-[color:var(--color-brand-weak)] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--color-text-sub)]">꾸준한 수요</span>
        ) : (
          <span className="rounded-full bg-[#F7F8FA] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--color-text-sub)]">{compMeta.label}</span>
        )}
        {(topic as { bidHigh?: boolean }).bidHigh && <span className="rounded-full bg-[#FFF8EB] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--color-warning)]">단가 높음</span>}
        {onSwap && (
          <button onClick={(e) => { e.stopPropagation(); onSwap(); }} disabled={swapping} aria-label="새 글감 받기" className="at-press ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-300 transition hover:bg-[#F7F8FA] hover:text-[color:var(--color-text-sub)] disabled:opacity-40">
            <span className={`flex h-[18px] w-[18px] items-center justify-center ${swapping ? "animate-spin" : ""}`}><GlassIcon name="refresh" tint="grey" size={18} /></span>
          </button>
        )}
      </div>
      {swapping ? (
        <div className="mt-3" aria-hidden>
          <div className="ateflo-skel h-[22px] w-4/5 rounded" />
          <p className="mt-3 text-[13px] font-semibold text-[color:var(--color-text-weak)]">새 글감을 고르고 있어요</p>
        </div>
      ) : (
        <button onClick={onClick} className="mt-3 block w-full text-left">
          <p className="text-[17px] font-bold leading-[1.4] text-[color:var(--color-text)]">{topic.title}</p>
          <p className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-[color:var(--color-brand)]">이 글 쓰기<span aria-hidden>→</span></p>
        </button>
      )}
    </div>
  );
}

function TopicsSkeleton({ collecting }: { collecting: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1, 2, 3, 4].map((i) => (
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
