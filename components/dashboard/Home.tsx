"use client";
import PerfImportSheet from "./PerfImportSheet";

import { cachedGet, invalidateGet } from "@/lib/clientFetchCache";

import { useState, useEffect, useCallback, useRef } from "react";
import TodayCard from "./TodayCard";
import { GlassGlyph } from "../GlassIcon";
import GlassIcon from "@/components/GlassIcon";
import TipChip, { tipFor } from "@/components/TipChip";
import { computeLevel } from "@/lib/level";
import CourseRing from "./CourseRing";
import CheckinCard from "./CheckinCard";
import NeighborMission from "./NeighborMission";
import DiagnosisCard from "./DiagnosisCard";
import { courseInfo, yesterdayPublished, pickNextTopic, todayKeywords, localPubFlagKey, progressPercent, adpostKey, migrateAdpostKeys } from "@/lib/course";
import { depletionForecast, attackEligible } from "@/lib/checkin";
import { GENERATE_COST } from "@/lib/creditPacks";
import { nextSeedRefreshLabel } from "@/lib/seedRefresh";
import { revenuePath } from "@/lib/revenue";
import CountUp from "@/components/CountUp";
import { isVerifiedStatus } from "@/lib/course";
import { REVIEW_WEEKLY_MIN } from "@/lib/scoreWeights";
import { filledStarsFromData, type Comp } from "@/lib/topicScore";
import type { Article } from "./types";

// ★로컬(KST) 날짜 키 — toISOString은 UTC라 자정~오전 9시에 '어제'로 계산되는 버그(실측: 새벽 교체 0)
function localDayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ★블로그 스코프 마이그레이션(1회성 — 구키 발견 시에만 동작하고 스스로 소멸)
//  원칙: 목록(누적형)=활성 블로그로 이관, 카운터·낙관 플래그(휘발형)=폐기(관대한 쪽 오류가 낫다).
function migrateBlogScopeKeys(profileKey: string) {
  try {
    const day = localDayStr();
    for (const name of ["dismissed", "heroskip"]) {
      const oldK = `ateflo_${name}_${day}`;
      const newK = `ateflo_${name}_${day}_${profileKey}`;
      const oldRaw = localStorage.getItem(oldK);
      if (oldRaw) {
        const oldArr = JSON.parse(oldRaw) as string[];
        const cur = JSON.parse(localStorage.getItem(newK) ?? "[]") as string[];
        localStorage.setItem(newK, JSON.stringify([...new Set([...cur, ...oldArr])]));
        localStorage.removeItem(oldK);
      }
    }
    for (const k of [`ateflo_swaps_${day}`, `ateflo_heroswap_${day}`, `ateflo_pub_${day}`]) localStorage.removeItem(k);
  } catch { /* ignore */ }
}

interface Topic { keyword: string; title: string; demandLabel: string; vol: number; comp: Comp; tag?: string; expiresAt?: string | null; blogTotal?: number | null; newsContext?: string; briefText?: string; titleSearch?: string; thumb?: { mainCopy: string; subCopy: string; badge: string }; sel?: Record<string, unknown>; revenueLabel?: string }

// 소주제 군집 키(서버와 동일 규칙) — 교체 시 비슷한 소주제 중복 방지
let freshDoneRef = false; // ?fresh=1 1회 가드
// ★열당 활성 슬롯 수 — 서버 배합(app/api/topics의 PER_COLUMN)과 반드시 같아야 한다.
//  2026-08-01 이중체크에서 검거: 서버에서 배합을 4분할로 고쳐도 화면이 앞 N장만 자르면 비율이 무너진다.
//  2열 × 5장 = 하루 10편(유저 확정 발행량). 이 숫자를 바꾸면 scripts/check-board-assembly.mjs도 같이 바꾼다.
// ★열별 장수(2026-08-04 유저 확정: 꾸준한 수요 축소 · 홈판 확대) — 서버(lib/scoreWeights COLUMN_SIZE)와 같아야 한다.
//  ★같은 값을 두 곳에서 따로 적으면 반드시 드리프트한다 — 여기 숫자를 바꾸면 서버도 같이 바꾼다.
const COLUMN_SIZE = { short: 7, long: 3 } as const;

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
  onWriteKeyword: (keyword: string, title: string, newsContext?: string, briefText?: string, titleSearch?: string, thumb?: { mainCopy: string; subCopy: string; badge: string }, extra?: { seriesId?: string; series?: unknown; tag?: string; sel?: Record<string, unknown> }) => void;
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
  const heroSwapKey = `ateflo_heroswap_${localDayStr()}_${profileKey ?? ""}`; // ★블로그 스코프(조사 D1)
  const heroSkipKey = `ateflo_heroskip_${localDayStr()}_${profileKey ?? ""}`;
  const [heroSkipped, setHeroSkipped] = useState<string[]>(() => { try { const v = JSON.parse(localStorage.getItem(heroSkipKey) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } });
  const [heroSwapsUsed, setHeroSwapsUsed] = useState<number>(() => { try { return Number(localStorage.getItem(heroSwapKey) ?? "0") || 0; } catch { return 0; } });
  const HERO_SWAP_MAX = 3;
  const [heroLimitNotice, setHeroLimitNotice] = useState(false);

  const [collecting, setCollecting] = useState(false);
  // ★홈 글감 보드(유저 목업: 두 종족 상시 노출) — 마운트 시 병렬 로드(캐시 경유라 가벼움)
  const [boardTab, setBoardTab] = useState<"short" | "long">("short"); // 모바일 탭
  const [boardShort, setBoardShort] = useState<Topic[] | null>(null);
  const [boardLong, setBoardLong] = useState<Topic[] | null>(null);
  // ★보드 세션 캐시(2026-08-05 유저: "탭 누르고 다른 메뉴 갔다오면 항상 새로고침돼서 로딩이 오래 걸린다").
  //  홈이 언마운트→재마운트될 때마다 topics를 다시 불렀다. 그 호출은 증식·홈판 생성까지 도는 무거운 경로다.
  //  ★글감은 '지금 이 순간'이 아니라 '오늘'의 것이다 — 메뉴를 오갈 때마다 새로 뽑을 이유가 없다.
  //   새로 받는 건 [글감 새로 받기] 버튼이 이미 있다. 자동 갱신은 그 버튼의 존재 이유를 지운다.
  const BOARD_TTL = 30 * 60_000; // 30분 — 그 안에 돌아오면 있던 보드를 그대로 보여준다
  const boardCacheKey = `ateflo_board_${localDayStr()}_${profileKey ?? ""}`;
  useEffect(() => {
    let alive = true;
    // 캐시 먼저 — 있으면 네트워크를 아예 안 탄다
    try {
      const raw = sessionStorage.getItem(boardCacheKey);
      if (raw) {
        const c = JSON.parse(raw) as { at: number; short: Topic[]; long: Topic[] };
        if (Date.now() - c.at < BOARD_TTL && Array.isArray(c.short)) {
          setBoardShort(c.short); setBoardLong(c.long ?? []);
          return; // ★네트워크 호출 없음
        }
      }
    } catch { /* 캐시 손상 — 아래에서 새로 받는다 */ }
    (async () => {
      try {
        const usedKw = todayKeywords(articles);
        const ex = [...new Set([...dismissedRef.current, ...usedKw])];
        const q = (mode: string) => fetch(`/api/topics?mode=${mode}${ex.length ? `&exclude=${encodeURIComponent(ex.join(","))}` : ""}`).then((r) => r.json()).catch(() => ({ topics: [] }));
        const [sh, lo] = await Promise.all([q("short"), q("long")]);
        if (!alive) return;
        const shortList = sanitizeTopics(Array.isArray(sh.topics) ? sh.topics : []);
        const longList = sanitizeTopics(Array.isArray(lo.topics) ? lo.topics : []);
        setBoardShort(shortList); // 전체 보관 — 치우면 다음이 올라옴
        if ((sh as { ff?: { perfLoop?: boolean } }).ff?.perfLoop || (lo as { ff?: { perfLoop?: boolean } }).ff?.perfLoop) setFfPerf(true);
        const tn = (lo as { tier?: { note?: string } }).tier?.note; if (tn) setTierNote(tn);
        setBoardLong(longList);
        try { sessionStorage.setItem(boardCacheKey, JSON.stringify({ at: Date.now(), short: shortList, long: longList })); } catch { /* 용량 초과 — 캐시 없이 진행 */ }
      } catch { if (alive) { setBoardShort([]); setBoardLong([]); } }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey]);
  // ★글감 새로 받기(2026-07-10 유저: "크론 기다리는 게 애매해") — 강제 재수확+에버그린 갈이 후 두 보드 재로드
  const [regenBusy, setRegenBusy] = useState(false);
  const [ffPerf, setFfPerf] = useState(false); // FF_PERF_LOOP 서버 힌트(topics 응답)
  const [tierNote, setTierNote] = useState<string | null>(null); // FF_TIER_BANDS — 밴드 안내 한 줄
  const [perfSheet, setPerfSheet] = useState(false);
  const [regenMsg, setRegenMsg] = useState<string | null>(null);
  async function regenBoards() {
    if (regenBusy) return;
    setRegenBusy(true); setRegenMsg(null);
    try {
      const r = await fetch("/api/topics/regen", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setRegenMsg(d.error ?? "잠시 후 다시 시도해 주세요"); setTimeout(() => setRegenMsg(null), 4000); return; }
      setBoardShort(null); setBoardLong(null); // 스켈레톤 — 새 세트 로드
      try { sessionStorage.removeItem(boardCacheKey); } catch { /* ignore */ } // ★새로 받기가 캐시를 비운다(그게 이 버튼의 일이다)
      const ex = [...new Set([...dismissedRef.current, ...todayKeywords(articles)])];
      const q = (mode: string) => fetch(`/api/topics?mode=${mode}${ex.length ? `&exclude=${encodeURIComponent(ex.join(","))}` : ""}`).then((r) => r.json()).catch(() => ({ topics: [] }));
      const [sh, lo] = await Promise.all([q("short"), q("long")]);
      setBoardShort(sanitizeTopics(Array.isArray(sh.topics) ? sh.topics : []).filter((g) => !dismissedRef.current.includes(g.keyword)));
      const nl = sanitizeTopics(Array.isArray(lo.topics) ? lo.topics : []).filter((g) => !dismissedRef.current.includes(g.keyword));
      setBoardLong(nl);
      try {
        const ns = sanitizeTopics(Array.isArray(sh.topics) ? sh.topics : []).filter((g) => !dismissedRef.current.includes(g.keyword));
        sessionStorage.setItem(boardCacheKey, JSON.stringify({ at: Date.now(), short: ns, long: nl }));
      } catch { /* ignore */ }
    } catch { setRegenMsg("네트워크 오류예요"); setTimeout(() => setRegenMsg(null), 4000); }
    finally { setRegenBusy(false); }
  }
  // ★빈 보드 자동 폴링(실측: 연타 치우기 → 재고 소진 → 5분 고착) — 백그라운드 수확이 끝나면 자동으로 나타난다
  useEffect(() => {
    if (boardShort === null || boardShort.length > 0) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      if (tries > 8) { clearInterval(t); return; }
      try {
        const ex = [...new Set([...dismissedRef.current, ...todayKeywords(articles)])];
        const r = await fetch(`/api/topics?mode=short${ex.length ? `&exclude=${encodeURIComponent(ex.join(","))}` : ""}`);
        const d = await r.json();
        const got = sanitizeTopics(Array.isArray(d.topics) ? d.topics : []).filter((g) => !dismissedRef.current.includes(g.keyword));
        if (got.length > 0) { setBoardShort(got); clearInterval(t); }
      } catch { /* 다음 틱 */ }
    }, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardShort === null || boardShort.length === 0]);
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
  const todayKey = `ateflo_dismissed_${localDayStr()}_${profileKey ?? ""}`;
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { const raw = typeof window !== "undefined" ? localStorage.getItem(todayKey) : null; return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const dismissedRef = useRef(dismissed);
  dismissedRef.current = dismissed;

  // ★사전 생성(생성 경험 v2) — 홈 진입 시 오늘의 글 1편을 서버 백그라운드로. 홈에 어떤 진행 표시도 없다(침묵 원칙).
  const preFiredRef = useRef<string | null>(null);
  const [preReadyId, setPreReadyId] = useState<string | null>(null);
  // ★원천 탭(2026-08-05 유저 목업) — 어느 원천에서 온 글감인지 눌러서 걸러 본다.
  //  빈 칸은 눌리지 않지만 그대로 남긴다: '없다'가 보여야 이슈가 없는 건지 우리가 못 잡은 건지 갈린다.
  const [slotTab, setSlotTab] = useState<string>("전체");
  const todayDate = localDayStr();
  const topicsCacheKey = () => `ateflo_topics_v30_${todayDate}_${profileKey ?? ""}_normal`;

  const SWAP_LIMIT = 12; // 하루 교체 상한 — 풀 소진·API 낭비 방지(유저 요청)
  const swapCountKey = `ateflo_swaps_${localDayStr()}_${profileKey ?? ""}`;
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
    const ck = `ateflo_topics_v30_${localDayStr()}_${profileKey ?? ""}_normal`;
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
  try { pubFlag = typeof window !== "undefined" && localStorage.getItem(localPubFlagKey(new Date(), profileKey)) === "1"; } catch { /* ignore */ }
  const info = pubFlag && !infoRaw.publishedToday ? { ...infoRaw, publishedToday: true } : infoRaw;
  // (pubCountToday 정합은 guideKind 계산 직전에서 — 어제 생성·오늘 발행 글이 생성일 기준 카운트에서 빠지는 실측 케이스)
  // ★3~4편 루프 재료 — 오늘 발행 수(초안 제외), 골든타임(발행 확정 후 30분), 다음 추천 시간대
  const pubCountRaw = articles.filter((a) => (a.status === "copied" || a.status === "verified" || a.status === "published" || a.status === "pending_verify") && new Date(a.created_at).toDateString() === new Date().toDateString()).length;
  const pubCountToday = Math.max(pubCountRaw, 0); // 아래에서 info.publishedToday와 정합(어제 생성→오늘 발행 케이스)
  const [hydrated, setHydrated] = useState(false); // ★로컬 기억 읽기 전 카드 확정 금지(실측: '오늘의 글' 잔상 깜빡)
  useEffect(() => { setHydrated(true); if (profileKey) { migrateBlogScopeKeys(profileKey); migrateAdpostKeys(profileKey); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  // ★'오늘의 글'도 확인 시트를 거친다(2026-08-04).
  //  종전엔 여기서 바로 claim해서 0초로 열었는데, 그 경로만 '겪어본 일 한 줄'을 물어볼 자리가 없었다 —
  //  하루 한 편의 대표 글이 정작 경험을 못 받는 구조였다(경험은 지어내지 않고 받는 것이 우리 원칙이다).
  //  ★0초는 잃지 않는다: 시트에서 경험을 비우고 제목을 그대로 두면 그때 claim한다(DashboardClient가 판정).
  function readToday() {
    const f = first;
    if (!f) return;
    onWriteKeyword(f.keyword, f.title, f.newsContext, f.briefText, f.titleSearch, f.thumb, { tag: f.tag, sel: f.sel });
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
    <main className="mx-auto max-w-[920px] px-5 pb-16">
      {/* 인사말 */}
      <button onClick={openBlogSheet} className="tk-seq-1 flex items-center gap-1 pt-6 text-[15px] font-semibold text-[color:var(--color-text-sub)]">
        {blogName}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {/* ★2분할 헤더(유저 목업) — 좌: 우리가 함께한 여정 / 우: 오늘 기록 */}
      <button onClick={onGoPerformance} className="tk-seq-1 tk-cta tk-card-glow mt-3 block w-full rounded-[20px] p-6 text-left shadow-[0_2px_12px_-4px_rgba(29,117,247,0.12)]">
        <div className="flex items-stretch gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-[color:var(--color-text-weak)]">우리가 함께한 여정</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="tk-grad-text text-[34px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">{info.finished ? "완주" : info.day > 0 ? `D-${info.day}` : "D-20"}</span>
              <span className="text-[14px] font-semibold tabular-nums text-[color:var(--color-brand)]"><CountUp to={progressPercent(info)} duration={800} />%</span>
            </div>
            <div className="tk-gauge mt-3 h-2 w-full rounded-full bg-[#E8EDF7]">
              <div className="tk-gauge-fill" style={{ width: `${Math.max(progressPercent(info), 3)}%` }} />
            </div>
            <p className="mt-2.5 truncate text-[12px] text-[color:var(--color-text-sub)]">
              {info.streak > 0 ? `${info.streak}일 연속 발행 · ` : ""}
              {(() => { const d = Math.floor(credits / (GENERATE_COST * blogCount)); return d > 0 ? `크레딧 약 ${d > 999 ? "999+" : d}일치` : "크레딧 충전 필요"; })()}
            </p>
          </div>
          <div className="w-px shrink-0 bg-[color:var(--color-line)]" />
          <div className="w-[46%] shrink-0 sm:w-[38%]">
            <p className="text-[13px] text-[color:var(--color-text-weak)]">오늘 기록</p>
            <div className="mt-2 space-y-1.5">
              {([["글 발행", info.publishedToday, "board"], ["이웃 미션", neighborDone, "neighbor"], ["아침 체크인", checkinDone, "checkin"]] as const).map(([label, done, act]) => (
                <span key={label} role="button" tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); if (act === "board") { try { document.getElementById("topic-board")?.scrollIntoView({ behavior: "smooth" }); } catch { /* ignore */ } } else setRoutineSheet(act as "neighbor" | "checkin"); }}
                  className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-[12.5px] transition hover:bg-[#F7F8FA]">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${done ? "tk-grad-cta text-white" : "bg-neutral-100 text-neutral-300"}`}>{done ? "✓" : ""}</span>
                  <span className={done ? "font-semibold text-[color:var(--color-text)]" : "text-[color:var(--color-text-weak)]"}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>

      {/* ★오늘 가이드 원카드(토스 이체식) — 화면엔 항상 '지금 할 행동 1개'. 스텝퍼·라인·루프를 전부 흡수. */}
      {(() => {
        type G = { emoji: string; title: string; sub: string; cta: string; onGo: () => void; alt?: { label: string; onGo: () => void } };
        if (!hydrated) return <div className="tk-seq-1 mt-3 ateflo-skel h-[168px] rounded-[20px]" />; // 자리 고정 — 잔상·시프트 방지
        const wantCheckin = guideKind === "checkin";
        const noCredit = guideKind === "credit";
        const todayDraft = articles.find((a) => a.status === "draft" && new Date(a.created_at).toDateString() === new Date().toDateString());
        const goWrite = () => {
          if (todayDraft) { onSelect(todayDraft); return; } // 쓰던 초안 직접 열기(키워드 불일치여도 안전)
          if (preReadyId) { readToday(); return; }      // 사전 생성분 — 시트를 거쳐 열람(경험 비면 0초 claim)
          if (first) { onWriteKeyword(first.keyword, first.title, first.newsContext, first.briefText, first.titleSearch, first.thumb, { tag: first.tag, sel: first.sel }); return; } // 일반 생성
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
          ? null // ★첫 글 상태 = 카드 없음(유저 확정: 보드에서 바로 고른다)
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
          const approved = localStorage.getItem(adpostKey("approved", profileKey)) === "1";
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
          if (typeof window !== "undefined" && localStorage.getItem(adpostKey("approved", profileKey)) === "1" && localStorage.getItem("ateflo_unlock_shown") !== "1") {
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

      {/* 오늘의 글 히어로 퇴역(유저 확정: 보드가 주인공) — 추천·0초 쓰기는 가이드 원카드가 흡수 */}

      {/* ★글감 보드(유저 목업) — 두 종족 상시 노출, 트렌드=수명 타이머+근거 */}
      {hydrated && (
        <div id="topic-board" className="tk-seq-2 mt-6">
          {(() => { // ★오늘 발행 현황(유저 승인 시안 — 일 2회 리듬을 화면만 보고 관리)
            const today = new Date().toDateString();
            const times = articles
              .filter((a) => {
                const at = (a as { verified_at?: string | null }).verified_at;
                if (!at || new Date(at).toDateString() !== today) return false;
                // ★RSS 회수 부풀림 방지(실측 4→6): 회수 시각≠발행 시각 — direct 확정이거나 오늘 생성한 글만 오늘 발행으로 집계
                const via = (a as { verified_via?: string | null }).verified_via;
                const created = (a as { created_at?: string }).created_at;
                return via === "direct" || (created ? new Date(created).toDateString() === today : false);
              })
              .map((a) => new Date((a as { verified_at?: string }).verified_at as string))
              .filter((d) => !Number.isNaN(d.getTime()));
            const morning = times.filter((d) => d.getHours() >= 6 && d.getHours() < 8).length;
            const evening = times.filter((d) => d.getHours() >= 17 && d.getHours() < 19).length;
            return (
              <p className="mb-3 text-center text-[12.5px] font-semibold text-[color:var(--color-text-sub)]">
                {times.length > 0
                  ? (() => {
                      const last = Math.max(...times.map((d) => d.getTime()));
                      const gapMin = Math.round((Date.now() - last) / 60_000);
                      const wait = gapMin < 120 ? ` · 다음 글은 ${new Date(last + 2 * 3600_000).getHours()}시 ${String(new Date(last + 2 * 3600_000).getMinutes()).padStart(2, "0")}분 이후가 좋아요(간격 2시간)` : "";
                      return `오늘 ${times.length}회 발행 확인 (아침 창 ${morning} · 저녁 창 ${evening})${wait}`;
                    })()
                  : "오늘 아직 발행 전 — 에버그린은 아침 창(6~8시)과 저녁 창(17~19시)이 좋아요, 트렌드는 지금 바로"}
              </p>
            );
          })()}
          {/* ★원천 칸 현황(2026-08-05 유저 요청: "카테고리 칸을 나눠서 — 청약홈 칸에 글감이 있고 없고를 알게").
              0인 칸이 그대로 보여야 '이슈가 없는 것'과 '우리가 못 잡은 것'을 구분할 수 있다. */}
          {(() => {
            // ★칸은 SLOT_LABEL(서버)과 같은 목록이어야 한다 — 빠진 칸은 '없다'조차 안 보인다(유저 요구의 핵심)
            const SLOTS = ["정부발표", "캘린더", "청약", "정부지원", "기업지원", "공시", "실시간", "커뮤니티", "홈판", "뉴스", "시즌", "발굴", "검색풀", "시리즈", "후속"];
            const all = [...(boardShort ?? []), ...(boardLong ?? [])];
            if (!all.length) return null;
            const rows = [{ s: "전체", n: all.length }, ...SLOTS.map((s) => ({ s, n: all.filter((t) => slotMatch(t, s)).length }))];
            return (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-neutral-400">글감 출처</span>
                {rows.map(({ s, n }) => {
                  const on = slotTab === s;
                  const empty = n === 0 && s !== "전체";
                  return (
                    <button key={s} onClick={() => setSlotTab(on ? "전체" : s)} disabled={empty}
                      className={`at-press rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums transition ${
                        on ? "bg-[#F04452] text-white" : empty ? "cursor-default bg-neutral-100 text-neutral-300" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                      title={empty ? `${s} 없음 — 이슈가 없거나, 우리가 못 잡은 것` : `${s} ${n}개 보기`}>
                      {s} {n}
                    </button>
                  );
                })}
              </div>
            );
          })()}
          {/* ★글감 새로 받기 — 크론 안 기다리고 두 보드 갈이(1시간 2회) */}
          <div className="mb-2 flex justify-end gap-1.5">
            {ffPerf && (
              <button onClick={() => setPerfSheet(true)}
                className="at-press flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-neutral-500 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition hover:text-[#1D75F7]">
                성과 기록
              </button>
            )}
            <button onClick={regenBoards} disabled={regenBusy}
              className="at-press flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-neutral-500 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition hover:text-[#1D75F7] disabled:opacity-70">
              <span className={`inline-block ${regenBusy ? "animate-spin" : ""}`} aria-hidden>↻</span>
              {regenMsg ?? (regenBusy ? "새 글감 받는 중…" : "글감 새로 받기")}
            </button>
          </div>
          {perfSheet && <PerfImportSheet onClose={() => setPerfSheet(false)} />}
          {/* ★두 열 머리말·범례 폐기(2026-08-05 유저: "이거 폐기, 그냥 랜덤으로 박스 나오게").
              카드마다 우측 하단에 ⚡지금 뜨는 / 🌱꾸준한 수요가 붙으므로 머리말이 하는 일이 없어졌다.
              모바일 모드 탭도 같이 없앤다 — 나눌 열이 없으면 나눠 볼 탭도 없다. */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {(() => {
              // ★한 판으로 섞는다(유저 목업). 열로 나누지 않으니 mode는 카드가 들고 다닌다 —
              //  치우기·보충이 어느 재고에서 일어나야 하는지는 여전히 알아야 한다.
              const pick = (list: Topic[] | null, mode: "short" | "long"): { t: Topic; mode: "short" | "long" }[] => {
                const all = (list ?? []).filter((t) => slotMatch(t, slotTab));
                const active = all.filter((t) => !(t as { publishedOn?: string }).publishedOn).slice(0, COLUMN_SIZE[mode]);
                const done = all.filter((t) => (t as { publishedOn?: string }).publishedOn).slice(0, 3);
                return [...active, ...done].map((t) => ({ t, mode }));
              };
              if (boardShort === null && boardLong === null) return [0, 1, 2, 3].map((k) => <div key={k} className="ateflo-skel h-[118px] rounded-[16px]" />);
              const merged = shuffleStable([...pick(boardShort, "short"), ...pick(boardLong, "long")]);
              if (!merged.length) return (
                <div className="col-span-full rounded-[16px] bg-white px-3 py-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                  <p className="flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-[#1D75F7]"><span className="tk-wand" aria-hidden>✦</span>글감을 모으고 있어요</p>
                </div>
              );
              return merged.map(({ t, mode }) => <BoardCard key={`${mode}:${t.keyword}`} topic={t} onWrite={() => onWriteKeyword(t.keyword, t.title, t.newsContext, t.briefText, t.titleSearch, t.thumb, { tag: t.tag, sel: t.sel })} onDismiss={() => {
                const nd = [...dismissedRef.current, t.keyword];
                dismissedRef.current = nd; setDismissed(nd);
                try { localStorage.setItem(todayKey, JSON.stringify(nd)); } catch { /* ignore */ }
                const setter = mode === "short" ? setBoardShort : setBoardLong;
                setter((prev) => {
                  const next = (prev ?? []).filter((x) => x.keyword !== t.keyword);
                  if (next.length < COLUMN_SIZE[mode]) { // ★재고 소진 시 조용한 보충(실측: 치울수록 감소)
                    const ex = [...new Set([...nd, ...todayKeywords(articles), ...next.map((x) => x.keyword)])];
                    fetch(`/api/topics?mode=${mode}&exclude=${encodeURIComponent(ex.join(","))}`)
                      .then((r) => r.json())
                      .then((d) => {
                        const got = sanitizeTopics(Array.isArray(d.topics) ? d.topics : []);
                        setter((cur) => {
                          const have = new Set((cur ?? []).map((x) => x.keyword));
                          return [...(cur ?? []), ...got.filter((g) => !have.has(g.keyword) && !nd.includes(g.keyword))];
                        });
                      }).catch(() => { /* 무해 */ });
                  }
                  return next;
                });
              }} />);
            })()}
          </div>
        </div>
      )}

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
                  {b.is_active && (
                    <span role="button" tabIndex={0} onClick={async (e) => {
                      e.stopPropagation();
                      const name = window.prompt("블로그 이름 — 썸네일 하단에 이 이름이 들어가요 (최대 20자)", b.blog_name ?? "");
                      if (!name || !name.trim() || name.trim() === b.blog_name) return;
                      const r = await fetch("/api/blog-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blog_name: name.trim().slice(0, 20) }) });
                      if (r.ok) window.location.reload(); else alert("저장하지 못했어요");
                    }} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-[11.5px] font-bold text-neutral-500 ring-1 ring-black/[0.06] transition hover:text-[color:var(--color-brand)]">이름 바꾸기</span>
                  )}
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
                  <CheckinCard articles={articles} blogKey={profileKey} />
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
                      <div key={t.keyword} className="tk-chip" style={{ animationDelay: `${ti * 50}ms` }}><TopicRow topic={t} onClick={() => { setRoutineSheet(null); onWriteKeyword(t.keyword, t.title, t.newsContext, t.briefText, t.titleSearch, t.thumb, { tag: t.tag, sel: t.sel }); }} onSwap={() => {
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
            {lifeLeft && <span className="text-[11.5px] font-semibold tabular-nums text-amber-600">{lifeLeft}</span>}
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

// ★원천 칸 판정 — 탭·집계가 같은 규칙을 쓴다(두 곳에서 따로 세면 숫자가 어긋난다).
// ★섞되 흔들리지 않게(2026-08-05 유저: "그냥 랜덤으로 박스 나오게").
//  Math.random으로 섞으면 리렌더마다 카드 순서가 바뀐다 — 글감을 읽는 중에 자리가 튄다.
//  그래서 키워드 해시로 정렬한다: 보기엔 무작위인데 같은 목록이면 항상 같은 순서다.
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function shuffleStable<T extends { t: { keyword: string } }>(items: T[]): T[] {
  return [...items].sort((a, b) => hash32(a.t.keyword) - hash32(b.t.keyword));
}

function slotMatch(t: unknown, label: string): boolean {
  const tt = t as { tag?: string; slot?: string; risingSeed?: boolean };
  if (label === "전체") return true;
  if (label === "홈판") return tt.tag === "홈판";
  if (label === "실시간") return tt.risingSeed === true;
  return tt.slot === label;
}

// ★보드 카드(컴팩트) — 트렌드: ⏳수명 타이머 + 📰근거(뉴스 헤드라인/실검색 확인)
// ★글감 칩(2026-08-01 유저 확정) — 검색 레인은 '월 검색량' 숫자를 그대로 칩에 박는다.
//  왜 이렇게 바뀌었나: '쉬운 검색 키워드 / 지금 체급으로 1등 할 수 있는 것'은 예측이었고, 실측으로 반증됐다.
//   · 문서수가 적으면 쉽다 → 틀림(문서 10,531에서 1위, 6,889에서 노출 0)
//   · 일반 블로그가 많으면 쉽다 → 틀림(개방도 1.0에서 패, 0.5에서 1위)
//   표본 9개로 세 번째 규칙을 만들면 과적합이라, 예측을 접고 '측정된 사실'만 말한다.
//  월 검색량은 네이버 광고 API 실측이라 100% 참이다. 난이도 판정은 순위 표본이 쌓인 뒤에 데이터로 만든다.
//  홈판·유행은 검색량이 없거나(0) 의미가 없어서 이름 칩을 유지한다.
const LANE_STYLE = {
  homefeed: { cls: "bg-[#F5F3FF] text-[#7C3AED]", mean: "네이버 홈 화면에 뜨는 걸 노리는 글" },
  trend: { cls: "bg-[#FFF1F0] text-[#F04452]", mean: "오늘 수확한 이슈 — 신선도가 무기" },
  golden: { cls: "bg-[#EFF6FF] text-[#1D75F7]", mean: "우리 구간(월 100~2,000)" },
  head: { cls: "bg-[#FEF6E7] text-[#B45309]", mean: "그 위 — 지금은 버겁지만 자산" },
  other: { cls: "bg-neutral-100 text-neutral-500", mean: "" },
} as const;
type LaneKey = keyof typeof LANE_STYLE;
/** 뜻풀이를 보여줄 레인(중립 칩은 설명할 게 없다). */
const LEGEND_LANES = { short: ["homefeed", "trend"], long: ["golden", "head"] } as const;
const LANE_NAME: Record<LaneKey, string> = { homefeed: "홈판용", trend: "유행 키워드", golden: "검색 키워드", head: "어려운 키워드", other: "글감" };

/**
 * 카드가 어느 레인인지 — 서버가 붙인 tag/demandBadge로 판정(별도 필드를 새로 만들지 않는다).
 * ★검색 레인은 검색량이 실제로 있을 때만 붙인다. 없으면 중립('글감') — 숫자 없는 칩에 숫자를 지어내지 않는다.
 */
function laneOf(topic: Topic, isTrend: boolean): LaneKey {
  if (topic.tag === "홈판") return "homefeed";
  if (String((topic as { demandBadge?: string }).demandBadge ?? "").includes("헤드 배팅")) return "head";
  if (isTrend) return "trend";
  return Number(topic.vol ?? 0) > 0 ? "golden" : "other";
}

/** 칩에 실제로 찍힐 글자. 검색 레인만 숫자(실측), 나머지는 이름. */
function laneLabel(lane: LaneKey, topic: Topic): string {
  const v = Number(topic.vol ?? 0);
  if ((lane === "golden" || lane === "head") && v > 0) return `월 ${v.toLocaleString()}회`;
  return LANE_NAME[lane];
}

// ★출처는 '구체적인 이름'으로 적는다(2026-08-05 유저 목업: "출처 : DART API").
//  ★그리고 이 표의 유일한 규칙은 '사실만'이다 — 유저 지시: "절대 거짓이 있으면 안 됨".
//   칸 이름(실시간·공시)은 우리 내부 분류지 출처가 아니다. 어디서 실제로 가져왔는지를 쓴다.
//   여러 상류가 섞이는 칸은, 그 전부에 대해 참인 이름만 쓴다(실시간 = 구글 트렌드 급상승 + 네이버 자동완성
//   → 둘 다 '지금 뜨는 말' 탐지라 "실시간 급상승"은 참이다. "DART"처럼 한쪽만 참인 이름은 쓰지 않는다).
const SOURCE_LABEL: Record<string, string> = {
  gov: "정책브리핑 보도자료", calendar: "확정 일정표", dart: "DART 공시", community: "커뮤니티(뽐뿌)",
  rising: "실시간 급상승", news: "네이버 뉴스", discover: "네이버 자동완성", applyhome: "청약홈",
  gov24: "보조금24", bizinfo: "기업마당", season: "시즌 일정", homebet: "홈피드 배팅", pool: "검색량 실측",
};
function sourceLabelOf(topic: Topic): string | null {
  const t = topic as { seedSource?: string; sel?: { seedSource?: string }; slot?: string };
  const src = t.sel?.seedSource ?? t.seedSource ?? "";
  if (src && SOURCE_LABEL[src]) return SOURCE_LABEL[src];
  // ★모르면 지어내지 않는다 — 칸 이름을 그대로 두거나(그건 참이다), 아무것도 안 쓴다.
  return t.slot ?? null;
}

function BoardCard({ topic, onWrite, onDismiss }: { topic: Topic; onWrite: () => void; onDismiss?: () => void }) {
  const isTrend = topic.tag === "trend" || topic.tag === "issue" || topic.tag === "followup";
  const laneKey = laneOf(topic, isTrend);
  const lane = LANE_STYLE[laneKey];
  const publishedOn = (topic as { publishedOn?: string }).publishedOn;
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!topic.expiresAt) return;
    const t = setInterval(() => setTick(Date.now()), 1000); // ★초 단위 실시간(유저 확정)
    return () => clearInterval(t);
  }, [topic.expiresAt]);
  const life = (() => {
    if (!isTrend || !topic.expiresAt) return null;
    const ms = new Date(topic.expiresAt).getTime() - tick;
    if (ms <= 0) return "곧 교체";
    const h = Math.floor(ms / 3600_000), m = Math.floor((ms % 3600_000) / 60_000), sec = Math.floor((ms % 60_000) / 1000);
    if (h >= 24) return `D-${Math.ceil(ms / 86400_000)}`; // 24시간+ = 날짜가 읽기 쉽다(실측: 1377:43:50 혼란)
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
  })();
  const bt = (topic as { blogTotal?: number | null }).blogTotal;
  // ★근거 — 사실 기반 설득(실측 버그: 무관 헤드라인 3연속): 카드 키워드와 겹치는 헤드라인만, 없으면 정직한 일반 근거
  const evidence = (() => {
    if (!isTrend) {
      // 꾸준: ★판단형(2026-07-13 유저: 날것 문서 수는 뭘 하란 건지 모른다) — 별점+판결을 앞세우고 수치는 보조로
      if (topic.vol > 0 && bt != null && bt > 0) {
        const st = filledStarsFromData(topic.vol, bt);
        const verdict = st >= 4 ? "지금 선점 기회" : st >= 3 ? "해볼 만한 자리" : "꾸준 유입용";
        return `노출 기회 ${"★".repeat(st)}${"☆".repeat(5 - st)} ${verdict} · 검색 ${topic.vol.toLocaleString()}회/월(최근 30일)`;
      }
      if (topic.vol > 0) return `검색 ${topic.vol.toLocaleString()}회/월(최근 30일) · 경쟁 ${topic.comp === "low" ? "낮음" : topic.comp === "mid" ? "보통" : "높음"} · 한 번 잡으면 오래 유입`;
      // ★홈판 카드의 출처(2026-08-03 유저 요청: "출처 어디서 가져왔는지 써줘야 진짜인지 안다").
      //  홈판은 isTrend가 false라 아래 출처 분기를 아예 못 탔다 — vol이 0이라 여기서 끝나 버렸다.
      //  ★출처가 없으면 없다고 보여준다: 실데이터 없이 만들어진 카드라는 사실도 판단 재료다.
      const hsrc = (topic as { sourceTitle?: string }).sourceTitle;
      if (topic.tag === "홈판") {
        // ★홈판도 '어느 씨앗에서 나왔는가'를 앞에 세운다 — 유저가 검증하는 자리다.
        return hsrc
          ? `수확 씨앗: ${hsrc.slice(0, 30)}`
          : `${topic.demandLabel ?? "홈판 배팅"} · ⚠실데이터 없이 만든 카드`;
      }
      return topic.demandLabel ?? "지속 검색되는 주제";
    }
    const badge = (topic as { demandBadge?: string }).demandBadge;
    // ★'지금 뜨는' 열은 씨앗 키워드를 그대로 보여준다(2026-08-05 유저 확정).
    //  유저: "어떤 키워드로 글감이 생성됐는지 그 키워드만 써줘. 기준 월 검색량 이런 건 필요 없다 —
    //   저게 나오면 거짓이거나 잘못된 글감이니까(지금 뜨는 근거는 월평균이 아니다)."
    //  ★맞는 말이다. 월 검색량은 지난 30일 평균이라 '지금 뜨는가'를 증명하지 못한다.
    //   증명하지 못하는 숫자를 근거처럼 붙이면, 그건 근거가 아니라 장식이다.
    // ★근거는 '왜 이 말을 잡았는가'다(2026-08-05 유저: "수확 키워드? 이게 근거가 될 수 없어요").
    //  종전엔 키워드를 한 번 더 적어놓고 근거라고 불렀다 — 같은 말을 반복한 것이지 이유가 아니다.
    //  ★출처별로 '무엇을 보고 잡았는지'를 사실대로 적는다. 모르면 주장하지 않는다.
    const srcKey = (topic as { seedSource?: string; sel?: { seedSource?: string } }).sel?.seedSource
      ?? (topic as { seedSource?: string }).seedSource ?? "";
    const st = (topic as { sourceTitle?: string }).sourceTitle;
    if (srcKey === "news") return st ? `방금 올라온 기사에서 나온 말 — "${st.slice(0, 26)}"` : "방금 올라온 경제 기사에서 나온 말";
    if (srcKey === "rising") return "지금 검색이 오르고 있는 말 — 급상승·자동완성에서 함께 잡혔어요";
    if (srcKey === "community") return "커뮤니티에 방금 올라온 혜택 소식이라 곧 검색이 몰려요";
    if (srcKey === "gov") return st ? `부처가 낸 보도자료에 적힌 일정 — "${st.slice(0, 26)}"` : "부처가 낸 보도자료에 적힌 일정이에요";
    if (srcKey === "calendar") return "날짜가 미리 확정된 일정 — 그날 몰릴 검색을 먼저 잡아둬요";
    if (srcKey === "dart") return "기업이 낸 공시라 일정마다 검색이 다시 올라와요";
    if (srcKey === "discover") return "네이버 자동완성에 실제로 뜨는 말 — 사람들이 이렇게 검색해요";
    // ★'급증'은 쓰지 않는다(2026-08-05 유저 지적). 코드가 하는 일은 자동완성 1회 조회다 —
    //  '사람들이 실제로 치는 말인가'는 확인되지만 '어제보다 늘었는가'는 재지 않는다(시계열 비교 없음).
    //  확인한 것만 말한다. 부풀린 배지는 그 자체로 우리 판단을 흐린다.
    if (topic.demandLabel?.includes("실검색 확인")) return badge ? `실검색 확인 · ${badge}` : "네이버 자동완성에 뜨는 말 — 실제로 검색돼요";
    const src = (topic as { sourceTitle?: string }).sourceTitle;
    if (src && badge) return `출처 이슈: ${src.slice(0, 22)} · ${badge}`;
    if (src) return `출처 이슈: ${src.slice(0, 30)}`; // ★카드별 진짜 혈통(씨앗 제목) — 무관 헤드라인 인용 문제의 근본 수리
    // ★뉴스 '추측 매칭' 폐기(2026-08-04 — 두 번 좁혔는데 두 번 다 또 틀렸다).
    //  ① 2026-07-24: 일반 토큰 제외로 좁힘 → '청년 ISA'와 '40억 초고가주택'에 같은 '근로장려금' 뉴스가 붙음
    //  ② 2026-08-03: 최장 토큰만 인정으로 좁힘 → 그래도 무관한 뉴스가 남음(유저 화면 재확인)
    //  ★newsContext는 '배치 공통 뭉치'다 — 이 카드의 근거가 아니라 그 배치가 본 기사 묶음이다.
    //   거기서 카드별 근거를 골라내는 건 원리상 추측이고, 추측은 계속 틀린다.
    //  ★카드별 진짜 혈통은 sourceTitle뿐이다(씨앗이 직접 준다). 그게 없으면 근거를 주장하지 않는다.
    //   가짜 근거는 없는 근거보다 나쁘다 — 신뢰를 만들려고 붙인 표시가 신뢰를 깎는다.
    return "오늘 수확된 실시간 이슈 · 신선할 때가 기회";
  })();
  const srcLabel = sourceLabelOf(topic);
  // ★활용 계획 — "어떻게 글감으로 쓸 건지"(유저 목업).
  //  ★있는 값에서만 만든다. 없는 날짜·수치를 붙이면 그 순간 카드가 거짓말이 된다(유저: "절대").
  const usePlan = (() => {
    const aEnd = (topic as { actionEnd?: string | null }).actionEnd;
    if (aEnd) {
      const d = Math.ceil((new Date(`${aEnd}T23:59:59+09:00`).getTime() - Date.now()) / 86400_000);
      if (d >= 0) return `${aEnd.slice(5).replace("-", "월 ")}일 마감이라 지금 쓰면 마감 전에 색인돼요`;
    }
    if (topic.tag === "홈판") return "네이버 홈 화면 노출을 노리고 써요";
    // ★활용 계획은 문서 수와 모순되면 안 된다(2026-08-05 유저 지적):
    //  "문서 67,988건인데 신선할 때 올리라는 게 뭔 말이에요" — 맞는 말이다. 그건 거짓이었다.
    //  문서 수가 곧 '이 자리가 비었는가'인데, 비지 않은 자리에 '선점하세요'라고 쓰면 카드가 거짓말을 한다.
    //  ★못 쟀으면 아무 말도 안 한다 — 모르는 상태에서 하는 조언은 전부 추측이다.
    if (bt == null) return null;
    if (isTrend) {
      if (bt < 1000) return "이 말로 쓴 글이 거의 없어서 지금 올리면 초기 순위를 잡아요";
      if (bt < 3000) return "아직 얇은 자리라 지금 올리면 상위를 노려볼 만해요";
      return `이미 ${bt.toLocaleString("ko-KR")}편이 있어요 — 남들이 안 다룬 각도라야 이겨요`;
    }
    if (Number(topic.vol ?? 0) > 0) {
      return bt < 3000 ? "검색은 꾸준한데 글이 적어요 — 한 번 잡으면 오래 유입돼요" : "검색이 꾸준한 자리예요 — 깊이로 승부해요";
    }
    return null; // ★할 말이 없으면 안 쓴다 — 채우려고 지어내지 않는다
  })();
  const pubAdvice = (() => {
    if (publishedOn) return null; // 발행한 카드 — 추천 문구 없음(유저 확정)
    const h = new Date().getHours();
    // ★청약 공고 행동 창(유저 확정): 접수 전=선점 발행, 접수 중=마감 임박 훅
    const aStart = (topic as { actionStart?: string | null }).actionStart;
    const aEnd = (topic as { actionEnd?: string | null }).actionEnd;
    if (aStart && aEnd) {
      const now = Date.now();
      const st = new Date(`${aStart}T00:00:00+09:00`).getTime();
      const en = new Date(`${aEnd}T23:59:59+09:00`).getTime();
      if (now < st) { const d = Math.ceil((st - now) / 86400_000); return { text: `접수 ${d === 0 ? "오늘" : `D-${d}`} — 지금 발행하면 접수일에 선점돼요`, hot: true }; }
      if (now <= en) { const d = Math.ceil((en - now) / 86400_000); return { text: `접수 중 · 마감 ${d <= 1 ? "임박" : `D-${d}`} — 마감 임박 훅이 통하는 시점`, hot: true }; }
    }
    if (isTrend) return { text: "지금 바로 발행 추천 — 신선도가 순위", hot: true };
    if (h >= 17 && h < 19) return { text: "지금이 발행하기 좋은 시간이에요", hot: true };
    if (h >= 6 && h < 8) return { text: "지금 발행 좋아요 — 출근길과 점심을 커버해요", hot: true };
    if (h < 6) return { text: "아침 6시 이후 발행 추천 — 읽는 사람이 많은 시간에 가장 신선한 상태로 내보내는 게 유리해요", hot: false };
    return { text: "17~19시 발행 추천 · 2순위 6~7시", hot: false };
  })();
  return (
    <button onClick={onWrite} className={`${publishedOn ? "opacity-55 saturate-50 " : ""}at-press rounded-[16px] bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.05)] tk-tr hover:shadow-[0_4px_14px_-6px_rgba(29,117,247,0.18)]`}>
      {/* ★박스 규격(2026-08-05 유저 목업) — 상단 칩 3개는 '항상' 뜬다.
          키워드=사실 · 출처=어디서 · 문서=그 자리에 몇 편. 셋 다 유저가 카드를 판정하는 재료다.
          ★유저 지시: "절대 글감 박스 콘텐츠 내용들은 거짓이 있으면 안 됨" — 여기 적히는 건 전부 측정·수확 실값이다. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-[#F1EEFF] px-2 py-1 text-[11px] font-extrabold text-[#6B4DE6]">
          키워드 : {(topic as { seedKeyword?: string }).seedKeyword || topic.keyword}
        </span>
        {srcLabel && <span className="rounded-md bg-[#F1F3F5] px-2 py-1 text-[11px] font-extrabold text-[#4E5968]">출처 : {srcLabel}</span>}
        {/* ★0과 '못 잼'은 다른 말이다 — 못 잰 자리에 0을 적으면 선점 최적으로 오해한다 */}
        {bt != null ? (
          <span className={`rounded-md px-2 py-1 text-[11px] font-extrabold tabular-nums ${bt < 3000 ? "bg-[#E7F7EF] text-[#0B8C4E]" : bt < 30000 ? "bg-[#FFF3E0] text-[#C2670A]" : "bg-[#FFECEC] text-[#D63A3A]"}`}
            title="네이버 블로그 문서 수 — 적을수록 선점하기 좋아요">
            문서 : {bt.toLocaleString("ko-KR")}편
          </span>
        ) : (
          <span className="rounded-md bg-[#F1F3F5] px-2 py-1 text-[11px] font-extrabold text-[#8B95A1]" title="문서 수를 못 쟀어요 — 0편이라는 뜻이 아닙니다">문서 : 못 쟀어요</span>
        )}
        {publishedOn && <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-extrabold text-neutral-500">{publishedOn}</span>}
        {onDismiss && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onDismiss(); }} className="ml-auto flex h-6 w-6 items-center justify-center rounded-full opacity-45 transition hover:bg-[#F7F8FA] hover:opacity-80" aria-label="다른 글감으로 교체"><GlassGlyph name="refresh" size={14} /></span>}
      </div>
      <p className="mt-2 line-clamp-2 text-[15px] font-extrabold leading-snug text-[color:var(--color-text)]">{topic.title}</p>
      {/* ★근거 — 어떤 근거로 가져왔고(수확 사실) 어떻게 쓸 것인지(활용 계획)를 한 줄에. 둘 다 실값에서만 만든다. */}
      <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-[#8B95A1]">근거 : {evidence}{usePlan ? ` → ${usePlan}` : ""}</p>
      <div className="mt-2 flex items-center gap-2">
        {pubAdvice && <span className={`text-[11px] font-semibold ${pubAdvice.hot ? "text-[#F04452]" : "text-neutral-400"}`}>{pubAdvice.text}</span>}
        {life && <span className="text-[10.5px] font-semibold tabular-nums text-amber-600">{life}</span>}
        {topic.revenueLabel && <span className="rounded-full bg-[#F5F3EE] px-2 py-0.5 text-[10.5px] font-bold text-[#8A6D1F]">{topic.revenueLabel}</span>}
        {/* ★레인 배지는 우측 하단(유저 목업). 검색 레인은 실측 검색량을 그대로 적는다. */}
        <span className={`ml-auto flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums ${isTrend ? "bg-[#FFECEC] text-[#F04452]" : "bg-[#E7F7EF] text-[#0B8C4E]"}`}>
          <span aria-hidden>{isTrend ? "⚡" : "🌱"}</span>{isTrend ? "지금 뜨는" : laneKey === "golden" || laneKey === "head" ? laneLabel(laneKey, topic) : "꾸준한 수요"}
        </span>
      </div>
    </button>
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
      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[13px] font-bold text-[#1D75F7]">
        <span className="tk-wand" aria-hidden>✦</span>
        {collecting ? "처음이라 글감을 모으고 있어요 — 잠시만요" : "실시간 인기 글감을 찾고 있어요…"}
      </p>
    </div>
  );
}
