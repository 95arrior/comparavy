"use client";

import { cachedGet, invalidateGet } from "@/lib/clientFetchCache";

import { useState, useEffect, useCallback, useRef } from "react";
import TodayCard from "./TodayCard";
import GlassIcon from "@/components/GlassIcon";
import TipChip, { tipFor } from "@/components/TipChip";
import { computeLevel } from "@/lib/level";
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

interface Topic { keyword: string; title: string; demandLabel: string; vol: number; comp: Comp; tag?: string; expiresAt?: string | null; blogTotal?: number | null; newsContext?: string; briefText?: string; titleSearch?: string; thumb?: { mainCopy: string; subCopy: string; badge: string } }

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
  onWriteKeyword: (keyword: string, title: string, newsContext?: string, briefText?: string, titleSearch?: string, thumb?: { mainCopy: string; subCopy: string; badge: string }, extra?: { seriesId?: string; series?: unknown; tag?: string }) => void;
  onSelect: (a: Article) => void;
  onGoPerformance: () => void;
  /** 크레딧 칩 탭 → 충전·사용내역 페이지 */
  onOpenCredits: () => void;
  /** 공지 벨 — 안 읽은 소식 있으면 빨간 점+흔들림 */
  unreadNews?: boolean;
  onOpenNews?: () => void;
  profileKey?: string; // 주제:세부 — 글감 캐시 분리(주제 바꾸면 새 글감)
  subCategory?: string | null; // 이웃 미션 검색어·인사말 개인화
  onAddBlog?: (channel?: "wordpress") => void; // ★멀티 블로그 — 새 블로그 추가(wordpress 힌트 시 채널 선택 건너뜀)
}) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const heroSwapKey = `ateflo_heroswap_${new Date().toISOString().slice(0, 10)}`;
  const heroSkipKey = `ateflo_heroskip_${new Date().toISOString().slice(0, 10)}`;
  const [heroSkipped, setHeroSkipped] = useState<string[]>(() => { try { const v = JSON.parse(localStorage.getItem(heroSkipKey) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } });
  const [heroSwapsUsed, setHeroSwapsUsed] = useState<number>(() => { try { return Number(localStorage.getItem(heroSwapKey) ?? "0") || 0; } catch { return 0; } });
  const HERO_SWAP_MAX = 3;
  const [heroLimitNotice, setHeroLimitNotice] = useState(false);

  const [collecting, setCollecting] = useState(false);
  // ★?fresh=1 — 글감만 리셋(콘솔 불필요, 여정 테스트용). 발행·체크인·진행 데이터는 무관.
  //  useState 초기화보다 먼저 동기 실행돼야 dismissed·캐시 초기값에 반영된다.
  if (typeof window !== "undefined" && !freshDoneRef && new URLSearchParams(window.location.search).has("fresh")) {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("ateflo_topics_") || k.startsWith("ateflo_dismissed_") || k.startsWith("ateflo_swaps_") || k.startsWith("ateflo_heroswap_") || k.startsWith("ateflo_heroskip_")) // 히어로 교체 횟수·스킵도 리셋(교체 v2)
        .forEach((k) => localStorage.removeItem(k));
      window.history.replaceState(null, "", window.location.pathname);
    } catch { /* ignore */ }
    freshDoneRef = true;
  }

  const [swapping, setSwapping] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false); // '다른 글감' 접힘 토글(시트로 대체 — 유지: 스크롤 ref)
  const [routineSheet, setRoutineSheet] = useState<null | "checkin" | "neighbor" | "topics">(null);
  const [blogSheet, setBlogSheet] = useState(false); // ★블로그 스위처
  // ★오늘 할 일 스텝퍼 — 상태 자동 감지(선택의 여지 제거: 다음 미완료가 항상 하이라이트)
  const [checkinDone, setCheckinDone] = useState(false);
  const [neighborDone, setNeighborDone] = useState(false);
  useEffect(() => {
    cachedGet<{ doneToday?: boolean }>("/api/checkin").then((d) => setCheckinDone(d.doneToday === true)).catch(() => { /* ignore */ });
    try {
      const dk = new Date(); const day = `${dk.getFullYear()}-${String(dk.getMonth() + 1).padStart(2, "0")}-${String(dk.getDate()).padStart(2, "0")}`;
      const raw = localStorage.getItem(`ateflo_mission_${day}_${profileKey ?? ""}`);
      const c = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      setNeighborDone(Object.values(c).filter(Boolean).length >= 2); // 이웃 미션 2개 이상 체크 = 오늘 몫
    } catch { /* ignore */ }
    // ★골든타임 소비 — 이웃 미션 시트를 열었다 닫으면 이번 골든타임 완료 처리(카드 소멸 → 다음 글 카드 등장)
    if (prevSheetRef.current === "neighbor" && routineSheet === null && goldenLp > 0) {
      try { localStorage.setItem(`ateflo_golden_done_${profileKey ?? ""}`, String(goldenLp)); } catch { /* ignore */ }
      setNowTick(Date.now()); // 즉시 재평가
    }
    prevSheetRef.current = routineSheet;
  }, [routineSheet, profileKey]); // 시트 닫을 때 재평가 — 방금 한 것이 바로 체크되게
  const [switching, setSwitching] = useState<string | null>(null); // 전환 중 즉각 피드백(리로드 전 죽은 시간 제거)
  const [blogCount, setBlogCount] = useState(1);
  useEffect(() => { cachedGet<{ blogs?: { id: string; blog_name: string | null; sub_category: string | null; is_active: boolean }[] }>("/api/blogs", 60_000).then((d) => { const list = Array.isArray(d.blogs) ? d.blogs : []; setBlogCount(Math.max(1, list.length)); setBlogList(list); }).catch(() => { /* ignore */ }); }, []); // 마운트 선로딩 — 스위처가 탭 즉시 뜨게(실측: 반응 지연)
  const [blogList, setBlogList] = useState<{ id: string; blog_name: string | null; sub_category: string | null; is_active: boolean }[]>([]);
  function openBlogSheet() {
    setBlogSheet(true); // 목록은 마운트 때 선로딩됨 — 즉시 표시, 백그라운드 갱신만
    fetch("/api/blogs").then((r) => r.json()).then((d) => { if (Array.isArray(d.blogs)) setBlogList(d.blogs); }).catch(() => { /* ignore */ });
  } // ★토스식 — 루틴은 행, 상세는 시트
  const [swapNotice, setSwapNotice] = useState(false); // 교체 한도 안내
  const [swapEmpty, setSwapEmpty] = useState(false); // 교체 후보 없음 안내(무반응 방지)
  const [tailMode, setTailMode] = useState<"all" | "short" | "long">("all"); // ★숏/롱테일 선택(유저 제안)
  const [tailTopics, setTailTopics] = useState<Topic[] | null>(null); // 전용 요청 결과(탭=서버에서 그 종족만 왕창)
  const [tailLoading, setTailLoading] = useState(false);
  const autoAnalyzedRef = useRef(false); // 세션당 1회 — 자동 재분석 무한루프 방지
  async function pickTail(mode: "all" | "short" | "long", opts?: { quiet?: boolean; extraExclude?: string[] }) {
    if (!opts?.quiet) {
      setTailMode(mode);
      if (mode === "all") { setTailTopics(null); return; }
      setTailLoading(true);
    }
    try {
      const usedKw = todayKeywords(articles);
      const ex = [...new Set([...dismissedRef.current, ...(opts?.extraExclude ?? []), ...usedKw])];
      const params = new URLSearchParams({ mode });
      if (ex.length) params.set("exclude", ex.join(","));
      const r = await fetch(`/api/topics?${params.toString()}`);
      const d = await r.json();
      const got = sanitizeTopics(Array.isArray(d.topics) ? d.topics : []);
      if (opts?.quiet) {
        // ★조용한 보충(실측: 치우기가 전체 리셋처럼 보임) — 기존 카드 유지, 새 것만 뒤에 추가
        setTailTopics((prev) => {
          const have = new Set((prev ?? []).map((t) => t.keyword));
          const ban = new Set(opts?.extraExclude ?? []);
          return [...(prev ?? []), ...got.filter((t) => !have.has(t.keyword) && !ban.has(t.keyword))];
        });
        return;
      }
      setTailTopics(got);
      // ★0개면 자동 재분석(버튼 누르게 하지 않기 — 선택의 여지 제거). 세션당 1회.
      if (!opts?.quiet && mode === "short" && got.length < 3 && !autoAnalyzedRef.current) { // 3개 미만이면 즉시 재수확(1개 고착 실측)
        autoAnalyzedRef.current = true;
        setAnalyzing(true);
        try {
          await fetch("/api/admin/trend-refresh").catch(() => null);
          const r2 = await fetch(`/api/topics?${params.toString()}`);
          const d2 = await r2.json();
          setTailTopics(sanitizeTopics(Array.isArray(d2.topics) ? d2.topics : []));
        } finally { setAnalyzing(false); }
      }
    } catch { if (!opts?.quiet) setTailTopics([]); }
    if (!opts?.quiet) setTailLoading(false);
  }
  const [analyzing, setAnalyzing] = useState(false); // 트렌드 재분석 중
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
  const topicsCacheKey = () => `ateflo_topics_v30_${todayDate}_${profileKey ?? ""}_normal`;

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
      if (!repl) {
        // ★후보 고갈 — 무반응 금지: 안내 + 이번 시도는 횟수에서 되돌림(억울함 방지)
        setSwapCount((c) => { const n = Math.max(0, c - 1); try { localStorage.setItem(swapCountKey, String(n)); } catch { /* ignore */ } return n; });
        setSwapEmpty(true); setTimeout(() => setSwapEmpty(false), 2800);
      }
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
    const ck = `ateflo_topics_v30_${new Date().toISOString().slice(0, 10)}_${profileKey ?? ""}_normal`;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(ck) : null;
      if (raw) { const p = JSON.parse(raw); const c = Array.isArray(p) ? sanitizeTopics(p) : []; if (c.length >= 3) { setTopics(c); setTopicsLoading(false); return; } }
    } catch { /* 캐시 미스 → 아래로 */ }

    setTopicsLoading(true);
    setCollecting(false);
    const collectTimer = setTimeout(() => setCollecting(true), 4000);
    try {
      // ★공급 재개 신호(실측: 발행·교체 후 1시간 무응답) — 버림·스킵·오늘 발행분을 전부 exclude로 보내
      //  서버 증식 캐시 키가 exclude 크기를 포함하므로, 이 목록이 커질 때마다 새 세트를 재증식한다.
      const usedKw = todayKeywords(articles);
      const ex = [...new Set([...dismissedRef.current, ...heroSkipped, ...usedKw])];
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
  // (pubCountToday 정합은 guideKind 계산 직전에서 — 어제 생성·오늘 발행 글이 생성일 기준 카운트에서 빠지는 실측 케이스)
  // ★3~4편 루프 재료 — 오늘 발행 수(초안 제외), 골든타임(발행 확정 후 30분), 다음 추천 시간대
  const pubCountRaw = articles.filter((a) => (a.status === "copied" || a.status === "verified" || a.status === "published" || a.status === "pending_verify") && new Date(a.created_at).toDateString() === new Date().toDateString()).length;
  const pubCountToday = Math.max(pubCountRaw, 0); // 아래에서 info.publishedToday와 정합(어제 생성→오늘 발행 케이스)
  const [hydrated, setHydrated] = useState(false); // ★로컬 기억 읽기 전 카드 확정 금지(실측: '오늘의 글' 잔상 깜빡)
  useEffect(() => setHydrated(true), []);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const prevSheetRef = useRef<string | null>(null);
  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 60_000); return () => clearInterval(t); }, []);
  let goldenTime = false;
  let goldenLp = 0;
  try {
    goldenLp = Number(localStorage.getItem(`ateflo_last_pub_at_${profileKey ?? ""}`) ?? 0);
    const consumed = localStorage.getItem(`ateflo_golden_done_${profileKey ?? ""}`);
    goldenTime = goldenLp > 0 && nowTick - goldenLp < 30 * 60_000 && consumed !== String(goldenLp); // ★미션 하고 나면 골든 카드 소멸(실측: 30분 독점)
  } catch { /* ignore */ }
  const hourNow = new Date(nowTick).getHours();
  // ★한 상태 = 한 카드(실측: '쓰던 글'+'오늘의 글' 이중 표기) — 상태 소유권: first만 히어로, 나머지는 가이드
  const guideKind: "golden" | "checkin" | "done5" | "draft" | "credit" | "first" | "more" =
    (() => {
      const wantCheckin0 = !checkinDone && yesterdayPublished(articles);
      if (goldenTime) return "golden";
      if (wantCheckin0) return "checkin";
      if (pubCountToday >= 10) return "done5"; // ★한도 5→10(유저: 초반 테스트 볼륨)
      if (info.hasDraftToday && !info.publishedToday) return "draft";
      if (credits < GENERATE_COST && !info.hasDraftToday) return "credit";
      if (pubCountToday === 0 && !info.publishedToday) return "first"; // ★발행 플래그 정합(실측: 어제 생성→오늘 발행이 first로 오판 → 히어로 발행후 카드 재등장)
      return "more";
    })();
  const nextSlotLabel = hourNow < 11 ? "점심 전에" : hourNow < 16 ? "저녁 6시 전에" : hourNow < 21 ? "자기 전에" : "내일 아침에";
  const lastPubKeyword = (() => { const t = articles.filter((a) => (a.status === "copied" || a.status === "verified" || a.status === "published" || a.status === "pending_verify") && new Date(a.created_at).toDateString() === new Date().toDateString()); return t.length ? String(t[0].keyword ?? "") : ""; })();
  const clean = sanitizeTopics(topics);
  // ★'오늘의 글' 후보 — 오늘 이미 만든 글감(발행분 포함)은 제외(한 편 더 = 같은 글감 재생성 버그 방지).
  // 랭크: 후속(증폭)·시리즈 > 트렌드(이슈 인터럽트 훅: 시리즈보다 뜨거운 이슈는 유저가 아래 목록에서 즉시 선택 가능) > 꾸준 > 풀.
  // 주간 리뷰형 최소 보장(REVIEW_WEEKLY_MIN) — 증폭·시리즈 없을 때 리뷰형 후보 승격(쇼핑커넥트 경로가 굶지 않게).
  // ★오늘의 글 교체 v2 — '버리기'가 아니라 '순환': 이전 글감은 다른 글감 시트로 내려간다(되돌리기 = 시트에서 그 글감 쓰기).
  //  하루 3회(무한 고르기 방지·뇌빼고 유지), 소진 시 전용 알림. 미스매치(파쇄기류) 탈출구.
  // ★자동 리필 폴링 — 후보 소진 시 시스템이 알아서 다시 가져온다(유저에게 '새로고침' 시키지 않기).
  const pollCountRef = useRef(0);
  useEffect(() => {
    if (topicsLoading) return;
    const noNext = !boost && !reviewPick && clean.filter((t) => !heroSkipped.includes(t.keyword)).length === 0;
    if (!noNext || pollCountRef.current >= 8) return;
    const t = setTimeout(() => { pollCountRef.current += 1; void loadTopics(); }, 45_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsLoading, topics, heroSkipped]);

  const usedToday = todayKeywords(articles);
  const normK = (k: string) => k.replace(/\s+/g, "").toLowerCase();
  const availClean = clean.filter((t) => !usedToday.map(normK).includes(normK(t.keyword)));
  // ★교체(스킵)는 boost·리뷰픽에도 적용(실측: 반응 후속을 교체해도 그대로 서서 카운터만 소모)
  const notSkipped = (t: { keyword: string }) => !heroSkipped.includes(t.keyword);
  const boost = availClean.filter(notSkipped).find((t) => t.tag === "followup" || (t as { seriesId?: string }).seriesId);
  const weekAgo = Date.now() - 7 * 86400000;
  const reviewThisWeek = articles.filter((a) => a.status !== "generating" && new Date(a.created_at).getTime() >= weekAgo && revenuePath({ keyword: a.keyword ?? "", title: a.title }) === "shopping").length;
  const reviewPick = reviewThisWeek < REVIEW_WEEKLY_MIN ? availClean.filter(notSkipped).find((t) => revenuePath({ keyword: t.keyword, title: t.title }) === "shopping") : undefined;
  const heroPool = clean.filter((t) => !heroSkipped.includes(t.keyword));
  const first = boost ?? reviewPick ?? pickNextTopic(heroPool.length ? heroPool : clean, usedToday);
  function heroSwap() {
    if (!first) return;
    if (heroSwapsUsed >= HERO_SWAP_MAX) { setHeroLimitNotice(true); setTimeout(() => setHeroLimitNotice(false), 3200); return; }
    // ★실교체 가능 후보 확인(실측 2회: 무반응인데 카운터만 소모) — 스킵해도 세울 다음 후보가 없으면 소모 없이 안내
    const nextPool = clean.filter((t) => t.keyword !== first.keyword && !heroSkipped.includes(t.keyword) && !usedToday.map((k) => k.replace(/\s+/g, "").toLowerCase()).includes(t.keyword.replace(/\s+/g, "").toLowerCase()));
    if (nextPool.length === 0) { setSwapEmpty(true); setTimeout(() => setSwapEmpty(false), 2800); void loadTopics(); return; }
    const n = heroSwapsUsed + 1;
    setHeroSwapsUsed(n);
    try { localStorage.setItem(heroSwapKey, String(n)); } catch { /* ignore */ }
    const kw = first.keyword;
    const ns = [...heroSkipped, kw];
    setHeroSkipped(ns);
    try { localStorage.setItem(heroSkipKey, JSON.stringify(ns)); } catch { /* ignore */ }
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
    onWriteKeyword(f.keyword, f.title, f.newsContext, f.briefText, f.titleSearch, f.thumb, { tag: f.tag });
  }
  // ★쓴 글은 시트에서도 제외(실측: 오늘 쓴 2편이 '다른 글감'에 계속 노출) — 키워드·제목 모두 대조
  const writtenTitles = new Set(articles.map((a) => (a.title ?? "").trim()).filter(Boolean));
  const restBase = clean.filter((t) => t !== first && !usedToday.map(normK).includes(normK(t.keyword)) && !writtenTitles.has(t.title.trim()));
  // 히어로에서 내려온 글감을 시트 맨 위로 — '방금 교체한 그거 어디 갔지'가 항상 첫눈에
  const rest = [...restBase.filter((t) => heroSkipped.includes(t.keyword)).reverse(), ...restBase.filter((t) => !heroSkipped.includes(t.keyword))];
  const isShort = (t: { tag?: string }) => t.tag === "trend" || t.tag === "issue" || t.tag === "followup";
  const tailFiltered = tailMode === "short" ? rest.filter(isShort) : tailMode === "long" ? rest.filter((t) => !isShort(t)) : rest;
  async function analyzeTrendsNow() {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      await fetch("/api/admin/trend-refresh").catch(() => null); // 관리자면 즉시 수확, 아니면 무해(401)
      await pickTail("short"); // ★분석 후 숏테일 전용 세트 재요청(실측: 전체만 재조회해 소진 표시 고착)
    } finally { setAnalyzing(false); }
  }

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

      {/* ★오늘 가이드 원카드(토스 이체식) — 화면엔 항상 '지금 할 행동 1개'. 스텝퍼·라인·루프를 전부 흡수. */}
      {(() => {
        type G = { emoji: string; title: string; sub: string; cta: string; onGo: () => void; alt?: { label: string; onGo: () => void } };
        if (!hydrated) return <div className="tk-seq-1 mt-3 ateflo-skel h-[168px] rounded-[20px]" />; // 자리 고정 — 잔상·시프트 방지
        if (guideKind === "first") return null; // 첫 글 상태는 아래 '오늘의 글' 히어로가 원카드(글감 상세·교체 보유)
        const wantCheckin = guideKind === "checkin";
        const noCredit = guideKind === "credit";
        const todayDraft = articles.find((a) => a.status === "draft" && new Date(a.created_at).toDateString() === new Date().toDateString());
        const goWrite = () => {
          if (todayDraft) { onSelect(todayDraft); return; } // 쓰던 초안 직접 열기(키워드 불일치여도 안전)
          if (preReadyId) { void readToday(); return; }      // 사전 생성분 0초 열람
          if (first) { onWriteKeyword(first.keyword, first.title, first.newsContext, first.briefText, first.titleSearch, first.thumb, { tag: first.tag }); return; } // 일반 생성
          setRoutineSheet("topics");
        };
        const g: G | null = goldenTime
          ? { emoji: "⚡", title: "지금 30분이 골든타임", sub: "방금 글과 같은 주제의 이웃에게 인사 — 첫 반응이 노출을 열어요", cta: "이웃 미션 시작", onGo: () => setRoutineSheet("neighbor") }
          : wantCheckin
          ? { emoji: "🌅", title: "어제 성적 확인부터", sub: "30초면 끝나요 — 숫자가 오늘 방향을 정해줘요", cta: "체크인 하기", onGo: () => setRoutineSheet("checkin") }
          : pubCountToday >= 10
          ? { emoji: "🌙", title: "오늘은 충분해요", sub: `${pubCountToday}편 발행 — 과속은 오히려 독이에요. 내일 아침에 만나요`, cta: "이웃 미션 마무리", onGo: () => setRoutineSheet("neighbor") }
          : info.hasDraftToday && !info.publishedToday
          ? { emoji: "📝", title: "쓰던 글이 기다리고 있어요", sub: "읽어보고 마음에 들면 바로 발행해요", cta: "이어서 검토하기", onGo: goWrite }
          : noCredit
          ? { emoji: "🔋", title: "크레딧이 다 떨어졌어요", sub: "충전하면 바로 다음 글을 쓸 수 있어요", cta: "충전하기", onGo: onOpenCredits }
          : pubCountToday === 0
          ? { emoji: "✍️", title: "오늘 첫 글을 쓸 시간이에요", sub: first ? `추천 글감: ${first.title.slice(0, 30)}${first.title.length > 30 ? "…" : ""}` : "지금 뜨는 글감부터 보여드릴게요", cta: first ? "이 글감으로 쓰기" : "글감 보기", onGo: first ? goWrite : () => setRoutineSheet("topics"), alt: first ? { label: "다른 글감 볼래요", onGo: () => setRoutineSheet("topics") } : undefined }
          : pubCountToday === 1
          ? { emoji: "💪", title: "오늘은 2편이 기본이에요", sub: `${nextSlotLabel} 한 편 더 — 시간을 나눠 올리면 노출 기회도 두 배`, cta: "2편째 글감 고르기", onGo: () => setRoutineSheet("topics") } // 선택지 없음 — 2편은 기본(유저 확정)
          : { emoji: "🔥", title: `오늘 ${Math.max(pubCountToday, 1)}편 — 기본 몫 끝!`, sub: "더 쓰면 그만큼 빨라져요. 무리는 금물", cta: "글 추가로 더 쓰기", onGo: () => setRoutineSheet("topics"), alt: { label: "이웃 미션 하기", onGo: () => setRoutineSheet("neighbor") } }; // 2편+ = 선택 2개(유저 확정)
        if (!g) return null;
        return (
          <div className="tk-seq-1 tk-card-glow mt-3 rounded-[20px] bg-white p-6 shadow-[0_2px_12px_-4px_rgba(29,117,247,0.12)]">
            <p className="text-[26px] leading-none" aria-hidden>{g.emoji}</p>
            <p className="mt-2.5 text-[18px] font-bold leading-snug text-[color:var(--color-text)]">{g.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--color-text-weak)]">{g.sub}</p>
            <button onClick={g.onGo} className="at-press mt-4 w-full rounded-[14px] tk-grad-cta py-3.5 text-[15px] font-bold text-white transition hover:opacity-90">{g.cta}</button>
            {g.alt && <button onClick={g.alt.onGo} className="mt-2 w-full py-1.5 text-center text-[13px] font-semibold text-[color:var(--color-text-weak)] transition hover:text-[color:var(--color-brand)]">{g.alt.label}</button>}
          </div>
        );
      })()}

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

      {/* 오늘의 글 — 단일 CTA. 가이드 소유 상태(draft·발행후·5편)에선 숨김(카드 이중 표기 방지) */}
      {hydrated && !(guideKind === "draft" || guideKind === "more" || guideKind === "done5" || guideKind === "golden") && <div className="at-rise at-d2 mt-6">
        <TodayCard
          plain
          topic={first ? { keyword: first.keyword, title: first.title, tag: first.tag, newsContext: first.newsContext, briefText: first.briefText, titleSearch: first.titleSearch, thumb: first.thumb, vol: first.vol, comp: first.comp, blogTotal: first.blogTotal } : null}
          loading={topicsLoading}
          credits={credits}
          info={info}
          onWriteKeyword={onWriteKeyword}
          onGoPerformance={onGoPerformance}
          onHeroSwap={heroSwap}
          heroSwapsLeft={Math.max(0, HERO_SWAP_MAX - heroSwapsUsed)}
          onOpenTodayDraft={(() => { const d = articles.find((a) => a.status === "draft" && new Date(a.created_at).toDateString() === new Date().toDateString()); return d ? () => onSelect(d) : undefined; })()}
          preReady={!!preReadyId}
          onReadToday={readToday}
        />
      </div>}

      {/* 스텝퍼 제거 — 오늘 가이드 원카드가 흡수(토스식 단일 행동) */}

      {/* 레벨 추천 카드 — 성과 탭으로 이사(홈 표면 = 게이지+가이드 원카드, 토스 문법) */}


      {/* 전환 중 오버레이 — 부드러운 즉각 피드백 */}
      {switching && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[90] flex flex-col items-center justify-center bg-white/92 backdrop-blur-sm">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[color:var(--color-line)] border-t-[color:var(--color-brand)]" />
          <p className="mt-4 text-[14px] font-semibold text-[color:var(--color-text-sub)]">{switching}(으)로 바꾸는 중</p>
        </div>
      )}

      {/* ★블로그 스위처 시트 */}
      {blogSheet && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setBlogSheet(false)}>
          <div className="ateflo-sheet-up w-full max-w-md at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <p className="text-[17px] font-bold text-[color:var(--color-text)]">내 블로그</p>
            <div className="mt-3 space-y-2">
              {blogList.map((b) => (
                <button key={b.id} onClick={async () => {
                  if (b.is_active) { setBlogSheet(false); return; }
                  setSwitching(b.blog_name ?? "블로그"); // 즉각 피드백 — 누른 순간 전환 화면
                  const r = await fetch("/api/blogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activate: b.id }) });
                  if (r.ok) { try { sessionStorage.clear(); } catch { /* ignore */ } window.location.reload(); } else setSwitching(null);
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
          <div className="ateflo-sheet-up at-no-scrollbar max-h-[88vh] w-full max-w-md overflow-y-auto at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"
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
              {routineSheet === "neighbor" && <NeighborMission subCategory={subCategory} blogKey={profileKey} sheet goldenKeyword={goldenTime ? lastPubKeyword : null} />}
              {routineSheet === "topics" && (
                topicsLoading ? <TopicsSkeleton collecting={collecting} /> : rest.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {/* ★숏/롱테일 선택(유저 제안) — 지금 원하는 종족만 */}
                    <div className="flex gap-1.5">
                      {([["all", "전체"], ["short", "지금 뜨는"], ["long", "꾸준한 수요"]] as const).map(([k, label]) => (
                        <button key={k} onClick={() => void pickTail(k)} className={`at-press flex-1 rounded-[10px] py-2 text-[12.5px] font-bold transition ${tailMode === k ? "bg-[#1D75F7]/[0.08] text-[#1D75F7] ring-1 ring-[#1D75F7]/40" : "bg-neutral-50 text-neutral-500"}`}>{label}</button>
                      ))}
                    </div>
                    {(tailLoading || analyzing) && (
                      <div className="space-y-3">
                        <p className="flex items-center justify-center gap-1.5 py-1 text-[13px] font-bold text-[#1D75F7]"><span className="tk-wand" aria-hidden>✦</span>{analyzing ? "실시간 인기 글감을 분석하고 있어요…" : tailMode === "short" ? "실시간 인기 글감을 찾고 있어요…" : "글감을 고르고 있어요…"}</p>
                        {[0,1,2].map((i)=><div key={i} className="ateflo-skel h-[92px] rounded-[20px]" />)}
                      </div>
                    )}
                    {!tailLoading && !analyzing && (tailMode === "all" ? tailFiltered : (tailTopics ?? []).filter((t) => t.keyword !== first?.keyword)).map((t, ti) => (
                      <div key={t.keyword} className="tk-chip" style={{ animationDelay: `${ti * 50}ms` }}><TopicRow topic={t} onClick={() => { setRoutineSheet(null); onWriteKeyword(t.keyword, t.title, t.newsContext, t.briefText, t.titleSearch, t.thumb, { tag: t.tag }); }} onSwap={() => {
                        if (tailMode !== "all") { // ★전용 세트에서 ↻ = 치우기 + 부족하면 자동 보충(실측: 다 치우면 소진 고착)
                          const nd = [...dismissedRef.current, t.keyword];
                          dismissedRef.current = nd; // ★즉시 갱신(실측: 보충 요청이 옛 제외목록을 읽어 같은 세트 반환)
                          setDismissed(nd);
                          try { localStorage.setItem(todayKey, JSON.stringify(nd)); } catch { /* ignore */ }
                          const remain = (tailTopics ?? []).filter((x) => x.keyword !== t.keyword);
                          setTailTopics(remain);
                          if (remain.length < 5) void pickTail(tailMode, { quiet: true, extraExclude: nd }); // ★조용한 보충 — 화면 리셋 없음
                          return;
                        }
                        swapTopic(t.keyword);
                      }} swapping={swapping.includes(t.keyword)} /></div>
                    ))}
                    {!tailLoading && !analyzing && tailMode === "short" && (tailTopics ?? []).filter((t) => t.keyword !== first?.keyword).length === 0 && (
                      <div className="rounded-2xl bg-neutral-50 p-6 text-center">
                        <p className="text-[13px] text-neutral-500">오늘 뜨는 이슈는 다 소화했어요 — 새 이슈는 몇 시간 안에 수확돼요.</p>
                        <button onClick={analyzeTrendsNow} disabled={analyzing} className="at-press mt-3 rounded-[12px] tk-grad-cta px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60">
                          {analyzing ? <><span className="tk-wand mr-1" aria-hidden>✦</span>트렌드 분석 중…</> : "지금 트렌드 다시 분석"}
                        </button>
                      </div>
                    )}
                    {!tailLoading && !analyzing && tailMode === "long" && (tailTopics ?? []).length === 0 && (
                      <p className="rounded-2xl bg-neutral-50 p-6 text-center text-[13px] text-neutral-400">꾸준한 수요 글감을 모으는 중이에요.</p>
                    )}
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
  topic: { keyword: string; title: string; vol: number; comp: Comp; blogTotal?: number | null; tag?: string; expiresAt?: string | null; newsContext?: string; briefText?: string; titleSearch?: string; thumb?: { mainCopy: string; subCopy: string; badge: string } };
  onClick: () => void;
  onSwap?: () => void;
  swapping?: boolean;
}) {
  const compMeta = topic.comp === "low"
    ? { label: "경쟁 낮음", cls: "bg-emerald-50 text-emerald-600" }
    : topic.comp === "mid"
      ? { label: "경쟁 보통", cls: "bg-amber-50 text-amber-600" }
      : { label: "경쟁 높음", cls: "bg-rose-50 text-rose-500" };
  const [lifeTick, setLifeTick] = useState(() => Date.now());
  useEffect(() => {
    if (!topic.expiresAt) return;
    const t = setInterval(() => setLifeTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [topic.expiresAt]);
  const lifeLeft = (() => {
    if (!topic.expiresAt) return null;
    const ms = new Date(topic.expiresAt).getTime() - lifeTick;
    if (ms <= 0) return "곧 교체";
    const h = Math.floor(ms / 3600_000), m = Math.floor((ms % 3600_000) / 60_000);
    return h > 0 ? `${h}시간 ${m}분 남음` : `${m}분 남음`;
  })();
  return (
    <div className={`rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition ${swapping ? "at-ai-swap" : ""}`}>
      <div className="flex items-center gap-1.5">
        {topic.tag === "issue" || topic.tag === "trend" ? (
          <>
            <TipChip tip={tipFor("지금 뜨는 키워드")} className="rounded-full bg-[color:var(--color-brand-weak)] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--color-brand)]">지금 뜨는 키워드</TipChip>
            {lifeLeft && <span className="text-[11.5px] font-semibold tabular-nums text-amber-600">⏳ {lifeLeft}</span>}
          </>
        ) : (
          <TipChip tip={tipFor("꾸준한 수요")} className="rounded-full bg-[#F7F8FA] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--color-text-sub)]">꾸준한 수요</TipChip>
        )}
        {(topic as { bidHigh?: boolean }).bidHigh && <TipChip tip={tipFor("단가 높음")} className="rounded-full bg-[#FFF8EB] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--color-warning)]">단가 높음</TipChip>}
        {onSwap && (
          <button onClick={(e) => { e.stopPropagation(); onSwap(); }} disabled={swapping} aria-label="새 글감 받기" className="at-press ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-300 transition hover:bg-[#F7F8FA] hover:text-[color:var(--color-text-sub)] disabled:opacity-40">
            <span className={`flex h-[18px] w-[18px] items-center justify-center ${swapping ? "animate-spin" : ""}`}><GlassIcon name="refresh" tint="grey" size={18} /></span>
          </button>
        )}
      </div>
      <p className="mt-2 text-[12px] text-[color:var(--color-text-weak)]">
        {topic.tag === "issue" || topic.tag === "trend"
          ? "숏테일 · 오늘 쓰면 첫 글로 선점할 수 있어요"
          : `롱테일${topic.vol && topic.vol > 0 ? ` · 월 ${topic.vol.toLocaleString("ko-KR")}회 검색` : ""} · ${compMeta.label} — 한 번 잡히면 오래 들어와요`}
      </p>
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
