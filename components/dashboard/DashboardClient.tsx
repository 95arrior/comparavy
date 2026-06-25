"use client";

import { useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PLANS } from "@/lib/plans";
import type { Article, DashboardProps, KeywordResult, KeywordStatus } from "./types";
import ArticleList from "./ArticleList";
import ArticleModal from "./ArticleModal";
import ContentCalendar from "./ContentCalendar";
import Segmented from "./Segmented";
import CenterToast from "./CenterToast";
import WritingView, { type GenParams } from "./WritingView";
import WriteTypeSheet from "./WriteTypeSheet";
import ProfileSettings from "./ProfileSettings";
import WordPressPanel from "./WordPressPanel";
import KeywordFinder from "./KeywordFinder";
import KeywordQueue from "./KeywordQueue";
import Onboarding from "./Onboarding";
import Home from "./Home";
import { toEngineType, type BlogProfile } from "@/lib/blogProfile";
import { bloggerType } from "@/lib/bloggerTypes";
import TossNav, { type NavKey } from "./TossNav";
import PerformanceView from "./PerformanceView";
import type { QueueItem } from "@/lib/keywordQueue";
import AteFloLogo from "@/components/AteFloLogo";
import Brand from "@/components/Brand";
import AdminDashboard from "./AdminDashboard";
import NewsView from "./NewsView";
import WpGuideView from "./WpGuideView";
import SitemapGuideView from "./SitemapGuideView";
import { LATEST_ANNOUNCEMENT_ID } from "@/lib/announcements";
import DemoStream from "@/components/DemoStream";
import ServiceIntro from "@/components/ServiceIntro";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";

// 사이드바 레벨 탭(연구소 중심으로 일원화). 키워드/발행계획/내글은 '연구소' 안 내부 뷰로 이동.
type Tab = "lab" | "wordpress" | "account" | "admin";
type LabView = "home" | "keywords" | "queue" | "articles" | "performance";

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const ICON: Record<string, React.ReactNode> = {
  generate: <Svg><path d="M9 3h6M10 3v5l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8V3" /><path d="M7.5 14h9" /></Svg>,
  lab: <Svg><path d="M3 11l9-8 9 8" /><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /></Svg>,
  keywords: <Svg><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Svg>,
  queue: <Svg><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></Svg>,
  blog: <Svg><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Svg>,
  articles: <Svg><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h5" /></Svg>,
  wordpress: <Svg><circle cx="12" cy="12" r="9" /><path d="M6.5 9.5l2.3 5.5 3.2-4.5 3.2 4.5 2.3-5.5" /></Svg>,
  account: <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>,
  panel: <Svg><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></Svg>,
  admin: <Svg><path d="M4 20h16" /><path d="M7 20v-6M12 20v-9M17 20v-4" /></Svg>,
};

export default function DashboardClient(props: DashboardProps) {
  const [tab, setTab] = useState<Tab>("lab");
  const [labView, setLabView] = useState<LabView>("home");
  const [navOpen, setNavOpen] = useState(false);
  const [articles, setArticles] = useState<Article[]>(props.initialArticles);
  const [articlesUsed, setArticlesUsed] = useState(props.articlesUsed);
  const [wpSiteUrl, setWpSiteUrl] = useState<string | null>(props.wpSiteUrl);
  const [selected, setSelected] = useState<Article | null>(null);
  const [genParams, setGenParams] = useState<GenParams | null>(null);
  // 글 생성 직전 '정보성/홍보용' 선택 대기 (선택하면 genParams로 생성 시작)
  const [pendingWrite, setPendingWrite] = useState<{ keyword: string; title: string } | null>(null);
  const [subCanceled, setSubCanceled] = useState(props.subStatus === "canceled");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<null | "news" | "guide" | "sitemap" | "profile">(null);
  const [unreadNews, setUnreadNews] = useState(false);
  // 워드프레스 카테고리·태그를 미리 불러둔다 → 글 편집 모달에서 드롭다운이 즉시 뜨도록(매번 새로 가져오는 1초 지연 제거)
  const [wpCategories, setWpCategories] = useState<{ id: number; name: string; count?: number }[]>([]);
  const [wpTags, setWpTags] = useState<string[]>([]);
  const [wpExpired, setWpExpired] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [calView, setCalView] = useState(false); // 내 글: 목록 ↔ 캘린더
  const [doneId, setDoneId] = useState<string | null>(null); // 백그라운드 생성 완료 → '보러가기'로 안내
  // 2단계-A: 블로그 프로필 + 키워드 예약 큐
  const [blogProfile, setBlogProfile] = useState<BlogProfile | null>(null);
  const [reonboardPrev, setReonboardPrev] = useState<BlogProfile | null>(null); // 재설정(재온보딩) 전 프로필 — 취소 시 복귀
  const [regionTrigger, setRegionTrigger] = useState(0); // 성과 '지역 선점' → 홈 지역강화 자동 ON
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const pendingQueueId = useRef<string | null>(null); // 첫 글 생성 완료 시 연결할 큐 항목
  // 키워드 발굴 검색 state (KeywordFinder에서 리프트 — 탭 이동/새로고침에도 유지)
  const [kwTopic, setKwTopic] = useState("");
  const [kwStatus, setKwStatus] = useState<KeywordStatus>("idle");
  const [kwResults, setKwResults] = useState<KeywordResult[] | null>(null);
  const [kwError, setKwError] = useState<string | null>(null);
  const [kwSearchedTopic, setKwSearchedTopic] = useState<string | null>(null);
  const [welcomeBlog, setWelcomeBlog] = useState<string | null>(null);
  const kwAbort = useRef<AbortController | null>(null);
  const [searchHydrated, setSearchHydrated] = useState(false); // 마지막검색 복원 완료 여부(자동검색 타이밍 게이트)
  const [profileLoaded, setProfileLoaded] = useState(false); // 프로필 fetch 완료 여부 — 온보딩/메인 깜빡임 방지 가드
  const autoSearched = useRef(false);
  // 백그라운드에서 생성 중인 글(도중 이탈 후 복귀 시 메인에 '생성 중' 카드로 표시)
  const generatingArticle = articles.find((a) => a.status === "generating") ?? null;
  const doneArticle = doneId ? articles.find((a) => a.id === doneId) ?? null : null;

  // 워드프레스 연결 유효성 점검 — 앱 비밀번호 만료·삭제·사이트 다운 시 배너로 재연결을 유도한다.
  useEffect(() => {
    if (!wpSiteUrl || props.plan !== "pro") {
      setWpExpired(false);
      return;
    }
    let alive = true;
    fetch("/api/wordpress/status")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setWpExpired(d?.connected === true && d?.valid === false);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [wpSiteUrl, props.plan]);

  // 토스트 자동 사라짐
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2400);
    return () => clearTimeout(t);
  }, [notice]);

  // 백그라운드 생성 폴링 — '생성 중' 글이 완료(또는 실패)됐는지 주기적으로 확인.
  // (생성 도중 새로고침·이탈로 돌아왔을 때, 서버가 끝까지 저장한 결과를 메인에서 받아준다)
  useEffect(() => {
    if (!generatingArticle) return;
    const id = generatingArticle.id;
    const supabase = createSupabaseBrowserClient();
    let alive = true;
    const t = setInterval(async () => {
      const { data } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
      if (!alive) return;
      if (!data) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        setNotice("생성에 실패했어요. 다시 시도해 주세요.");
      } else if (data.status !== "generating") {
        setArticles((prev) => prev.map((a) => (a.id === id ? (data as Article) : a)));
        setDoneId(id);
      }
    }, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [generatingArticle?.id]);

  // 브라우저 뒤로가기/앞으로가기를 '앱 내부 이동'으로 — 탭·글·하위페이지 상태를 히스토리에 동기화.
  // → 글을 보다 뒤로가기를 누르면 사이트 밖으로 튕기지 않고 직전 화면으로 돌아간다.
  const skipPushRef = useRef(false);
  useEffect(() => {
    if (skipPushRef.current) {
      skipPushRef.current = false; // popstate로 인한 변경이면 새 히스토리를 쌓지 않음
      return;
    }
    window.history.pushState(
      { ateflo: true, tab, labView, selectedId: selected?.id ?? null, page, gen: !!genParams },
      "",
    );
  }, [tab, labView, selected, page, genParams]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = e.state as { ateflo?: boolean; tab?: Tab; labView?: LabView; selectedId?: string | null; page?: typeof page; gen?: boolean } | null;
      if (s && s.ateflo) {
        skipPushRef.current = true;
        setTab(s.tab ?? "lab");
        setLabView(s.labView ?? "home");
        setSelected(s.selectedId ? articles.find((a) => a.id === s.selectedId) ?? null : null);
        setPage(s.page ?? null);
        if (!s.gen) setGenParams(null);
        setNavOpen(false);
      }
      // ateflo 상태가 아니면(앱 진입 이전) 브라우저가 정상적으로 사이트를 벗어남
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [articles]);

  // 상단 토스트를 '콘텐츠 영역' 기준 중앙에 띄우기 위한 보정값.
  // 데스크톱은 좌측 사이드바(펼침 256 / 접힘 56)가 레이아웃 폭을 차지하므로 그 절반만큼 오른쪽으로 민다.
  // 모바일은 사이드바가 오버레이라 폭을 차지하지 않으므로 보정 0.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty("--toast-shift", "0px"); // 사이드바 제거(TossNav)로 보정 불필요
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--toast-shift");
    };
  }, [navOpen]);
  useEffect(() => {
    if (!wpSiteUrl || props.plan !== "pro") return;
    let alive = true;
    fetch("/api/wordpress/categories").then((r) => r.json()).then((d) => {
      if (alive && Array.isArray(d.categories)) setWpCategories(d.categories);
    }).catch(() => {});
    fetch("/api/wordpress/tags").then((r) => r.json()).then((d) => {
      if (alive && Array.isArray(d.tags)) setWpTags(d.tags);
    }).catch(() => {});
    return () => { alive = false; };
  }, [wpSiteUrl, props.plan]);

  // 예약 글이 시간 지나 워드프레스에서 자동 발행됐는지 자동 동기화 (탭 이동 시 + 2분마다).
  // → 버튼 안 눌러도 '예약됨' 칩이 알아서 '발행됨'으로 바뀐다. (예약 글만 검사해서 가벼움)
  useEffect(() => {
    if (!wpSiteUrl || props.plan !== "pro") return;
    let alive = true;
    const run = async () => {
      try {
        const res = await fetch("/api/wordpress/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ futureOnly: true }),
        });
        const data = await res.json();
        if (alive && res.ok && Array.isArray(data.changed) && data.changed.length) {
          setArticles((prev) =>
            prev.map((a) => {
              const c = (data.changed as { id: string; status: Article["status"]; clearedWp: boolean }[]).find((x) => x.id === a.id);
              return c ? { ...a, status: c.status, ...(c.clearedWp ? { wp_post_id: null, wp_link: null } : {}) } : a;
            }),
          );
        }
      } catch {
        // 무시
      }
    };
    run();
    const t = setInterval(run, 120000);
    return () => { alive = false; clearInterval(t); };
  }, [tab, wpSiteUrl, props.plan]);

  // 메인에서 키워드+유형+문체를 받고 왔으면, 바로 작성화면을 띄운다(뎁스 축소)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("ateflo_gen");
    if (!raw) return;
    localStorage.removeItem("ateflo_gen");
    try {
      const g = JSON.parse(raw) as { keyword?: string; type?: string; tone?: string };
      if (!g.keyword) return;
      const overLimit = props.plan !== "pro" && props.articlesUsed >= props.articlesLimit;
      const hasTeaser = props.initialArticles.some((a) => a.locked);
      if (overLimit && hasTeaser) {
        setTab("lab");
        return;
      }
      setGenParams({ keyword: g.keyword, angle: "", type: g.type ?? "howto", tone: g.tone ?? "friendly", promo: true, channel: blogProfile && bloggerType(blogProfile.vertical) === "local" ? "naver" : "wp" });
    } catch {
      // 무시
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPublished = articles.some((a) => a.status === "published" || a.status === "future");

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // 구독 해지 — 다음 청구만 중단, 남은 기간은 그대로 이용
  async function cancelSubscription() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (res.ok) {
        setSubCanceled(true);
        setConfirmCancel(false);
        setNotice("구독 해지를 예약했어요");
      } else {
        setNotice("해지 처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setBusy(false);
    }
  }

  // 구독 해지 취소(되돌리기) — 남은 기간이 있으면 자동결제를 다시 켠다
  async function resumeSubscription() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/billing/resume", { method: "POST" });
      if (res.ok) {
        setSubCanceled(false);
        setNotice("구독을 다시 이어가요");
      } else {
        setNotice("처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setBusy(false);
    }
  }

  // 회원 탈퇴 — 모든 데이터·계정 영구 삭제 (되돌릴 수 없음)
  async function deleteAccount() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.ok) {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        window.location.href = "/";
      } else {
        setNotice("탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
        setBusy(false);
      }
    } catch {
      setNotice("탈퇴 처리 중 오류가 났어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  // 2단계-A: 블로그 프로필·큐·마지막 검색 로드 (마운트 1회 — 새로고침/재접속에도 복원)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pRes, qRes, sRes] = await Promise.all([
          fetch("/api/blog-profile").then((r) => r.json()).catch(() => ({})),
          fetch("/api/keyword-queue").then((r) => r.json()).catch(() => ({})),
          fetch("/api/keyword-searches").then((r) => r.json()).catch(() => ({})),
        ]);
        if (!alive) return;
        if (pRes?.profile) setBlogProfile(pRes.profile as BlogProfile);
        if (Array.isArray(qRes?.queue)) setQueue(qRes.queue as QueueItem[]);
        // 마지막 검색 결과 복원
        const search = sRes?.search;
        if (search && Array.isArray(search.results)) {
          setKwResults(search.results as KeywordResult[]);
          setKwSearchedTopic(search.topic ?? null);
          setKwTopic(search.topic ?? "");
          setKwStatus("done");
        }
      } catch {
        // 무시 (없으면 빈 상태)
      } finally {
        if (alive) { setSearchHydrated(true); setProfileLoaded(true); }
      }
    })();
    return () => { alive = false; kwAbort.current?.abort(); };
  }, []);

  // 키워드 검색 실행 (DashboardClient 소유 → 탭 이동에도 계속 진행). 완료 결과는 DB에 영속화.
  async function runKeywordSearch(rawTopic: string) {
    const t = rawTopic.trim();
    if (!t) return;
    kwAbort.current?.abort();
    const ctrl = new AbortController();
    kwAbort.current = ctrl;
    setKwStatus("loading");
    setKwError(null);
    setKwResults(null);
    setKwSearchedTopic(null);
    try {
      const res = await fetch("/api/keywords/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (ctrl.signal.aborted) return;
      if (!res.ok) { setKwError(data?.error ?? "추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."); setKwStatus("error"); return; }
      const kws: KeywordResult[] = Array.isArray(data.keywords) ? data.keywords : [];
      setKwResults(kws);
      setKwSearchedTopic(t);
      setKwStatus("done");
      // 영속화 (실패해도 화면엔 영향 없음)
      fetch("/api/keyword-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, results: kws }),
      }).catch(() => {});
    } catch (err) {
      if (ctrl.signal.aborted || (err as { name?: string })?.name === "AbortError") return; // 취소 — 조용히
      setKwError("네트워크 오류예요. 잠시 후 다시 시도해 주세요.");
      setKwStatus("error");
    }
  }

  function cancelKeywordSearch() {
    kwAbort.current?.abort();
    kwAbort.current = null;
    setKwStatus(kwResults && kwResults.length > 0 ? "done" : "idle");
  }

  // Stage 3: 키워드 발굴 자동검색 제거. topic이 업종 라벨('건강' 등)로 바뀌어 자동검색이 노이즈가 됨 →
  // 사장이 키워드를 직접 입력하는 방식으로. (이 자리는 추후 '글감 추천'으로 대체 예정)

  // 키워드 선택 → 큐에 담고 첫 1개 즉시 생성. 프로필 없으면 설정으로 유도.
  async function handleQueue(keywords: string[]): Promise<boolean> {
    if (!blogProfile) {
      setNotice("먼저 ‘내 정보 › 블로그 설정’을 완료해 주세요.");
      goTab("account");
      return false;
    }
    try {
      const res = await fetch("/api/keyword-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      });
      const data = await res.json();
      if (!res.ok) { setNotice(data?.error ?? "큐에 담지 못했어요."); return false; }
      const queued: QueueItem[] = Array.isArray(data.queued) ? data.queued : [];
      setQueue((prev) => [...prev, ...queued]);
      // 첫 1개 즉시 생성 (프로필 문체/유형 적용) → 기존 WritingView(SSE)
      const first = queued[0];
      if (first) {
        pendingQueueId.current = first.id;
        setSelected(null);
        setGenParams({ keyword: first.keyword, angle: "", type: toEngineType(blogProfile.article_type, blogProfile.vertical), tone: blogProfile.tone, promo: true, channel: bloggerType(blogProfile.vertical) === "local" ? "naver" : "wp" });
      }
      return true;
    } catch {
      setNotice("네트워크 오류예요. 잠시 후 다시 시도해 주세요.");
      return false;
    }
  }

  async function handleDeleteQueue(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id));
    try {
      await fetch("/api/keyword-queue", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    } catch { /* 무시 */ }
  }

  // 블로그 저장(신규/수정) → 연구소(메인)로. 신규면 환영.
  function onProfileSaved(p: BlogProfile) {
    const isNew = !blogProfile;
    setBlogProfile(p);
    setReonboardPrev(null); // 완료했으니 복귀용 프로필 비움
    setKwTopic(p.topic);
    autoSearched.current = false; // 새 주제면 키워드 탭 진입 시 자동검색 다시
    setNotice(isNew ? "블로그 준비 완료예요 🎉" : "설정을 저장했어요");
    // 신규 카테고리 선수집 — 온보딩 직후 백그라운드로 글감 풀 워밍(첫 주자가 트리거). 글감 화면 도착 땐 이미 준비됨.
    if (isNew) { try { fetch("/api/topics").catch(() => {}); } catch { /* 무시 */ } }
    goTab("lab"); // 홈으로
  }

  function onGenerated(article: Article) {
    setArticles((prev) => [article, ...prev]);
    if (!article.locked) setArticlesUsed((n) => n + 1); // 티저(미리보기)는 사용량에 미포함
    // 큐에서 시작한 생성이면 그 항목을 완료 처리 + 글 연결
    const qid = pendingQueueId.current;
    if (qid) {
      pendingQueueId.current = null;
      setQueue((prev) => prev.map((q) => (q.id === qid ? { ...q, status: "done", article_id: article.id } : q)));
      fetch(`/api/keyword-queue/${qid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done", article_id: article.id }),
      }).catch(() => {});
    }
    setTab("lab");
    setLabView("articles");
    setSelected(article);
  }

  function onUpdated(updated: Article) {
    setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelected(updated);
  }

  const steps = [
    { label: "첫 글 생성하기", done: articles.length > 0 },
    { label: "워드프레스 사이트 연결하기", done: Boolean(wpSiteUrl) },
    { label: "글 발행하기", done: hasPublished },
  ];
  const allDone = steps.every((s) => s.done);

  const nextStep: { go: () => void; msg: string; label: string } | null = !steps[0].done
    ? { go: () => goLabView("home"), msg: "키워드 하나만 고르면 첫 글이 만들어져요. 홈에서 바로 시작해보세요!", label: "홈으로" }
    : !steps[1].done
    ? { go: () => goTab("wordpress"), msg: "첫 글 완성! 이제 ‘워드프레스’에서 내 블로그를 연결해 주세요.", label: "바로 가기" }
    : !steps[2].done
    ? { go: () => goLabView("articles"), msg: "사이트 연결 완료! ‘내 글’에서 글을 열고 ‘워드프레스에 발행’을 누르면 끝이에요.", label: "바로 가기" }
    : null;

  // 사이드바 = 연구소 중심으로 일원화 (키워드/발행계획/내글/블로그설정은 사이드바에서 제거)
  const navItems: { key: Tab; label: string }[] = [
    { key: "lab", label: "홈" },
    { key: "wordpress", label: "워드프레스" },
    ...(props.isAdmin ? [{ key: "admin" as Tab, label: "관리" }] : []),
  ];

  const displayName = props.email.split("@")[0] || props.email;
  const initial = (props.email.trim()[0] ?? "?").toUpperCase();
  const lockedArticle = articles.find((a) => a.locked) ?? null;
  const blocked = props.plan !== "pro" && articlesUsed >= props.articlesLimit && !!lockedArticle;

  // 모바일에선 메뉴 선택 후 오버레이 사이드바를 닫는다
  function closeOnMobile() {
    if (typeof window !== "undefined" && window.innerWidth < 768) setNavOpen(false);
  }

  // 공지·업데이트 알림 (안 읽은 소식 점 표시)
  useEffect(() => {
    try {
      setUnreadNews(localStorage.getItem("ateflo_seen_announcement") !== LATEST_ANNOUNCEMENT_ID);
    } catch {
      // 무시
    }
  }, []);
  function openNews() {
    if (genParams) return; // 생성 중 차단
    setSelected(null);
    setGenParams(null);
    setNavOpen(false);
    setPage("news");
    setUnreadNews(false);
    try {
      localStorage.setItem("ateflo_seen_announcement", LATEST_ANNOUNCEMENT_ID);
    } catch {
      // 무시
    }
  }

  function openGuide() {
    if (genParams) return; // 생성 중 차단
    setSelected(null);
    setGenParams(null);
    setNavOpen(false);
    setPage("guide");
  }

  function openSitemapGuide() {
    if (genParams) return;
    setSelected(null);
    setGenParams(null);
    setNavOpen(false);
    setPage("sitemap");
  }

  // 모바일에서 사이드바(전체화면)가 열리면 뒤 페이지 스크롤 잠금 — 사이드바만 스크롤되게
  useEffect(() => {
    if (navOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [navOpen]);

  // 탭·뷰(공지/가이드/글편집/작성) 전환 시 항상 맨 위에서 시작.
  // selected는 '객체'가 아니라 'id'로 의존 → 자동저장으로 글 내용이 갱신될 때는 스크롤이 튀지 않음.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, labView, page, selected?.id, genParams]);

  function goTab(k: Tab) {
    if (genParams) return; // 글 생성 중엔 실수로 이동 못 하게 (취소는 작성화면의 버튼으로만)
    setSelected(null);
    setGenParams(null);
    setPage(null);
    setTab(k);
    if (k === "lab") setLabView("home"); // 사이드바 '연구소' 클릭 = 항상 홈부터
    closeOnMobile();
  }

  // 연구소 내부 탭 이동 (사이드바를 거치지 않고 연구소 화면 안에서 도구 전환)
  function goLabView(v: LabView) {
    if (genParams) return;
    setSelected(null);
    setGenParams(null);
    setPage(null);
    setTab("lab");
    setLabView(v);
    closeOnMobile();
  }

  // 토스 하단/상단 탭 ↔ 기존 tab/labView 매핑
  const navKey: NavKey =
    tab === "lab"
      ? labView === "articles" ? "articles" : labView === "performance" ? "performance" : "home"
      : "more"; // wordpress/account/admin → 더보기
  const onNav = (k: NavKey) => {
    if (k === "home") goTab("lab");
    else if (k === "articles") goLabView("articles");
    else if (k === "performance") goLabView("performance");
    else goTab("account"); // 더보기
  };
  const showNav = !selected && !genParams && !page && !!blogProfile; // 온보딩·편집·생성·풀페이지엔 탭바 숨김

  const railBtn = (k: Tab, label: string, icon: React.ReactNode) => {
    const active = tab === k && !selected && !genParams;
    return (
      <button
        key={k}
        onClick={() => goTab(k)}
        className={`group relative flex h-9 items-center rounded-lg text-sm transition ${navOpen ? "w-full" : "w-9"} ${
          active ? "bg-[#1D75F7]/10 font-semibold text-[#2f7fe6]" : "text-neutral-600 hover:bg-neutral-100"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center">{icon}</span>
        {navOpen && <span className="truncate pr-2">{label}</span>}
        {!navOpen && (
          <span className="pointer-events-none absolute left-11 z-50 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
            {label}
          </span>
        )}
      </button>
    );
  };

  // 온보딩 진척 배너 (연구소 내부 뷰·워드프레스에서 공통 사용)
  // 가입 직후 빈 화면을 막기 위해 3단계 진행(완료/진행 중/대기)을 한눈에 보여주고, 다음 할 일을 강조한다.
  const doneCount = steps.filter((s) => s.done).length;
  const firstUndone = steps.findIndex((s) => !s.done);
  const nextStepBanner = !allDone && nextStep ? (
    <div className="mb-6 rounded-2xl bg-[#1D75F7]/[0.06] p-5">
      {/* 진행 도트 (3칸 스트립 대신 — 라벨 안 짤리게) */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold tracking-tight text-[#1D75F7]">시작하기</span>
        <span className="text-xs font-semibold text-[#1D75F7]/50">{doneCount}/{steps.length}</span>
        <div className="ml-auto flex gap-1">
          {steps.map((s, i) => (
            <span key={s.label} className={`h-1.5 w-5 rounded-full transition ${s.done ? "bg-[#1D75F7]" : i === firstUndone ? "bg-[#1D75F7]/45" : "bg-[#1D75F7]/15"}`} />
          ))}
        </div>
      </div>
      {/* 지금 할 일 — 제목(짤림 없음) + 안내 + CTA */}
      <p className="mt-3 text-[15px] font-bold tracking-tight text-neutral-900">{steps[firstUndone]?.label ?? "다음 단계"}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{nextStep.msg}</p>
      <button
        onClick={nextStep.go}
        className="mt-4 w-full rounded-xl bg-[#1D75F7] py-3 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98] sm:w-auto sm:px-7"
      >
        {nextStep.label}
      </button>
    </div>
  ) : null;

  return (
    <div className="flex min-h-screen bg-[#f2f4f6] text-neutral-900 antialiased">
      {/* 모바일: 사이드바 열렸을 때 뒤 어둡게 (탭하면 닫힘) */}
      {navOpen && <div onClick={() => setNavOpen(false)} className="fixed inset-0 z-40 bg-black/30 md:hidden" />}

      {/* 좌측 레일 — 데스크톱은 접힘/펼침 레일, 모바일은 햄버거로 여는 오버레이 */}
      {/* 구 사이드바 — TossNav로 대체, 무력화(추후 정리) */}
      <aside className="hidden">
        {/* 상단: 로고(항상 같은 자리) + 브랜드명/닫기(펼침 시 페이드) */}
        <div className="mb-2 flex h-9 items-center gap-1">
          {navOpen ? (
            <>
              {/* 로고 + 브랜드 = 한 덩어리, 클릭 시 메인으로 (메인이면 그대로) */}
              <button
                onClick={() => goTab("lab")}
                aria-label="메인으로"
                className="flex h-9 min-w-0 flex-1 items-center rounded-lg pl-[7px] transition hover:bg-neutral-50"
              >
                <Brand pro={props.plan === "pro"} />
              </button>
              <button
                onClick={() => setNavOpen(false)}
                aria-label="사이드바 닫기"
                className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
              >
                {ICON.panel}
                <span className="pointer-events-none absolute right-0 top-10 z-50 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">사이드바 닫기</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setNavOpen(true)}
              aria-label="사이드바 열기"
              className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition hover:bg-neutral-100"
            >
              <span className="absolute inset-0 flex items-center justify-center group-hover:opacity-0"><AteFloLogo size={22} pro={props.plan === "pro"} /></span>
              <span className="absolute inset-0 flex items-center justify-center text-neutral-700 opacity-0 group-hover:opacity-100">{ICON.panel}</span>
              <span className="pointer-events-none absolute left-11 z-50 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">사이드바 열기</span>
            </button>
          )}
        </div>

        {/* 내비 */}
        <nav className="flex flex-col gap-1">
          {navItems.map((it) => railBtn(it.key, it.label, ICON[it.key]))}
        </nav>

        {/* 최근 글 (펼침 모드) — 클릭 시 편집 */}
        {navOpen && articles.length > 0 && (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            <p className="px-2 pb-1 text-xs font-medium text-neutral-400">최근</p>
            <div className="flex flex-col">
              {articles.slice(0, 5).map((a) => (
                <button
                  key={a.id}
                  disabled={!!genParams}
                  onClick={() => {
                    if (genParams) return; // 글 생성 중엔 이동 차단 (생성이 사라지지 않게)
                    setSelected(a);
                    closeOnMobile();
                  }}
                  title={a.title}
                  className="truncate rounded-lg px-2 py-1.5 text-left text-sm text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {a.locked ? "🔒 " : ""}
                  {a.title}
                </button>
              ))}
              {articles.length > 5 && (
                <button
                  onClick={() => goLabView("articles")}
                  className="mt-3 self-center rounded-lg px-4 py-1.5 text-center text-xs font-medium text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                >
                  더보기 ({articles.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* 하단: 공지 + 내 정보 */}
        <div className="mt-auto flex flex-col gap-1">
        {/* 공지·업데이트 알림 */}
        <button
          onClick={openNews}
          className={`group relative flex h-9 items-center rounded-lg text-sm text-neutral-600 transition hover:bg-neutral-50 ${navOpen ? "w-full" : "w-9"}`}
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            {unreadNews && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#1D75F7] ring-2 ring-white" />}
          </span>
          {navOpen && <span className="truncate pr-2">공지</span>}
          {!navOpen && (
            <span className="pointer-events-none absolute left-11 z-50 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">공지</span>
          )}
        </button>
        {/* 내 정보 (사용자) */}
        <button
          onClick={() => goTab("account")}
          className={`group relative flex h-12 items-center rounded-lg transition hover:bg-neutral-50 ${navOpen ? "w-full" : "w-9"} ${
            tab === "account" && !selected && !genParams ? "bg-neutral-100" : ""
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-xs font-medium text-white">{initial}</span>
          </span>
          {navOpen && (
            <span className="min-w-0 flex-1 pr-2 text-left">
              <span className="block truncate text-sm font-medium text-neutral-800">{displayName}</span>
              <span className="block text-xs text-neutral-400">{PLANS[props.plan].name}</span>
            </span>
          )}
          {!navOpen && (
            <span className="pointer-events-none absolute left-11 z-50 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">내 정보</span>
          )}
        </button>
        </div>
      </aside>

      {/* 메인 */}
      {showNav && <TossNav active={navKey} onNav={onNav} initial={initial} />}
      <div className={`min-w-0 flex-1 ${showNav ? "pb-[78px] md:pb-0 md:pt-16" : ""}`}>
        {/* 모바일 상단바 — 햄버거로 사이드바 열기 (편집·작성 화면엔 자체 상단바가 있어 숨김) */}
        {!selected && !genParams && !page && (
          <div className="hidden">
            <button onClick={() => setNavOpen(true)} aria-label="메뉴 열기" className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 8h16M4 15h9" /></svg>
            </button>
            <Brand pro={props.plan === "pro"} />
          </div>
        )}

        <CenterToast message={notice} />

        {/* 결제 실패(유예 중) 배너 — 즉시 자르지 않고 카드 재등록을 유도 */}
        {!page && !selected && !genParams && props.subStatus === "past_due" && (
          <div className="px-4 pt-4 sm:px-6">
            <div className="mx-auto flex max-w-5xl items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 sm:px-5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rose-900">결제에 실패했어요</p>
                <p className="mt-0.5 text-xs leading-relaxed text-rose-700">
                  카드를 다시 등록해 주세요. 며칠간 재시도하고, 계속 실패하면 무료로 바뀌어요.
                </p>
              </div>
              <a
                href="/pricing"
                className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
              >
                카드 다시 등록
              </a>
            </div>
          </div>
        )}

        {/* 워드프레스 연결 만료 배너 — 발행이 조용히 실패하기 전에 재연결을 유도 */}
        {!page && !selected && !genParams && wpExpired && (
          <div className="px-4 pt-4 sm:px-6">
            <div className="mx-auto flex max-w-5xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 sm:px-5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-900">워드프레스 연결이 만료됐어요</p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                  다시 연결해야 발행할 수 있어요.
                </p>
              </div>
              <button
                onClick={() => goTab("wordpress")}
                className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
              >
                다시 연결
              </button>
            </div>
          </div>
        )}

        {page === "news" && <NewsView onBack={() => setPage(null)} />}
        {page === "guide" && <WpGuideView onBack={() => setPage(null)} onGoConnect={() => goTab("wordpress")} />}
        {page === "sitemap" && <SitemapGuideView onBack={() => setPage(null)} />}
        {page === "profile" && blogProfile && (
          <main className="ateflo-page-in mx-auto max-w-xl px-6 py-10">
            <button onClick={() => setPage(null)} className="-ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700"><span className="text-base leading-none">←</span> 돌아가기</button>
            <h1 className="mt-3 font-pretendard text-[26px] font-bold tracking-tight text-neutral-900 sm:text-[30px]">블로그 설정</h1>
            <p className="mt-1.5 text-[14px] text-neutral-400">지금 내 정보를 보고, 바꿀 것만 고쳐서 저장하세요.</p>
            <ProfileSettings profile={blogProfile} onSaved={(p) => { setBlogProfile(p); setPage(null); setNotice("설정을 저장했어요"); }} />
            <button onClick={() => { if (window.confirm("블로그를 처음부터 다시 설정할까요? (지금 정보는 사라져요)")) { setReonboardPrev(blogProfile); setBlogProfile(null); setPage(null); goTab("lab"); } }} className="mt-6 w-full text-center text-[13px] font-medium text-neutral-400 transition hover:text-neutral-600">처음부터 다시 설정하기</button>
          </main>
        )}

        {!page && selected && (
          <ArticleModal
            article={selected}
            wpConnected={Boolean(wpSiteUrl)}
            canPublish={props.plan === "pro"}
            canEdit={props.plan === "pro"}
            wpCategories={wpCategories}
            wpTags={wpTags}
            vertical={blogProfile?.vertical ?? "general"}
            onCategoryCreated={(c) => setWpCategories((prev) => (prev.some((x) => x.name === c.name) ? prev : [c, ...prev]))}
            onCategoryDeleted={(id) => setWpCategories((prev) => prev.filter((x) => x.id !== id))}
            onClose={() => setSelected(null)}
            onUpdated={onUpdated}
          />
        )}

        {!page && !selected && genParams && (
          <WritingView
            params={genParams}
            pro={props.plan === "pro"}
            isTeaser={props.plan !== "pro" && articlesUsed >= props.articlesLimit}
            vertical={blogProfile?.vertical}
            onDone={(article) => {
              setGenParams(null);
              onGenerated(article);
            }}
            onExit={() => setGenParams(null)}
          />
        )}

        {/* 정보성/홍보용 선택 시트 — 글감 클릭 후, 생성 시작 전 */}
        {pendingWrite && blogProfile && (
          <WriteTypeSheet
            title={pendingWrite.title}
            hasBiz={Boolean(blogProfile.biz_name)}
            local={bloggerType(blogProfile.vertical) === "local"}
            onClose={() => setPendingWrite(null)}
            onPick={(promo) => {
              setSelected(null);
              setGenParams({
                keyword: pendingWrite.keyword,
                angle: pendingWrite.title,
                type: toEngineType(blogProfile.article_type, blogProfile.vertical),
                tone: blogProfile.tone,
                promo,
                channel: bloggerType(blogProfile.vertical) === "local" ? "naver" : "wp",
              });
              setPendingWrite(null);
            }}
          />
        )}

        {/* ── 연구소 (사이드바 '연구소') : 블로그 없으면 온보딩, 있으면 내부 탭으로 도구 전환 ── */}
        {/* 프로필 로딩 중 — 온보딩/메인 깜빡임 방지 가드 (로딩 끝나기 전엔 둘 다 안 보여줌) */}
        {!page && !selected && !genParams && tab === "lab" && !profileLoaded && (
          <div className="flex min-h-[300px] items-center justify-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-200 border-t-[#1D75F7]" />
          </div>
        )}

        {!page && !selected && !genParams && tab === "lab" && profileLoaded && !blogProfile && (
          <div className="ateflo-page-in">
            <Onboarding onSaved={onProfileSaved} onCancel={reonboardPrev ? () => { setBlogProfile(reonboardPrev); setReonboardPrev(null); } : undefined} />
          </div>
        )}

        {!page && !selected && !genParams && tab === "lab" && blogProfile && (
          <div className="ateflo-page-in">
            {/* 메인 홈 — 탭 없이 한 페이지(성과 + 글감 자리 + 내 글). 글쓰기는 '새 글 쓰기' 버튼으로 */}
            {labView === "home" && !blocked && (
              <Home
                displayName={displayName}
                blogName={blogProfile.blog_name ?? "내 블로그"}
                articles={articles}
                wpConnected={Boolean(wpSiteUrl)}
                onWrite={() => goLabView("keywords")}
                onWriteKeyword={(keyword, title) => {
                  // 글감 카드 [이 글 쓰기] → 정보성/홍보용 선택 시트를 먼저 띄운다(생성은 선택 후).
                  const overLimit = props.plan !== "pro" && articlesUsed >= props.articlesLimit;
                  const hasTeaser = props.initialArticles.some((a) => a.locked);
                  if (overLimit && hasTeaser) {
                    goLabView("keywords");
                    return;
                  }
                  setPendingWrite({ keyword, title });
                }}
                onSelect={setSelected}
                onUpdated={(u) => setArticles((prev) => prev.map((a) => (a.id === u.id ? u : a)))}
                onAllArticles={() => goLabView("articles")}
                onGoConnect={() => goTab("wordpress")}
                bloggerType={bloggerType(blogProfile.vertical)}
                isAdmin={props.isAdmin}
                regionTrigger={regionTrigger}
                hasBusinessInfo={Boolean(blogProfile.biz_address)}
                onEditBusiness={() => setPage("profile")}
                onWriteStory={(storyText, promo) => {
                  if (!blogProfile) return;
                  setSelected(null);
                  setGenParams({
                    keyword: "", // 주제는 라우트가 이야기에서 AI로 핏하게 유도
                    angle: "",
                    type: toEngineType(blogProfile.article_type, blogProfile.vertical),
                    tone: blogProfile.tone,
                    promo,
                    channel: bloggerType(blogProfile.vertical) === "local" ? "naver" : "wp",
                    userStory: storyText,
                  });
                }}
                profileKey={`${blogProfile.vertical}:${blogProfile.sub_category ?? ""}`}
              />
            )}
            {labView === "home" && blocked && (
              <div className="mx-auto max-w-xl px-6 py-16">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left">
                  <p className="text-sm font-medium text-amber-900">무료 미리보기를 만들었어요 🔒</p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-800">계속 만들고 발행하려면 프로로 업그레이드하세요.</p>
                  {lockedArticle && <p className="mt-3 truncate text-sm font-medium text-neutral-900">“{lockedArticle.title}”</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {lockedArticle && <button onClick={() => setSelected(lockedArticle)} className="rounded-xl border border-amber-300 bg-white px-4 py-1.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100">미리보기 글 보기</button>}
                    <Link href="/pricing" className="rounded-xl bg-[#1D75F7] px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90">프로로 업그레이드</Link>
                  </div>
                </div>
              </div>
            )}

            {/* 키워드 발굴 */}
            {labView === "keywords" && (
              <main className="mx-auto max-w-5xl px-6 py-10">
                <button onClick={() => goLabView("home")} className="mb-4 -ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700"><span className="text-base leading-none">←</span> 홈</button>
                {nextStepBanner}
                <KeywordFinder
                  blogName={blogProfile?.blog_name ?? null}
                  topic={kwTopic}
                  onTopicChange={setKwTopic}
                  status={kwStatus}
                  results={kwResults}
                  error={kwError}
                  searchedTopic={kwSearchedTopic}
                  onSearch={runKeywordSearch}
                  onCancel={cancelKeywordSearch}
                  onQueue={handleQueue}
                  welcomeTopic={welcomeBlog}
                  onDismissWelcome={() => setWelcomeBlog(null)}
                />
              </main>
            )}

            {/* 발행 계획 */}
            {labView === "queue" && (
              <main className="mx-auto max-w-5xl px-6 py-10">
                <button onClick={() => goLabView("home")} className="mb-4 -ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700"><span className="text-base leading-none">←</span> 홈</button>
                {nextStepBanner}
                <KeywordQueue
                  queue={queue}
                  onDelete={handleDeleteQueue}
                  onOpenArticle={(id) => { const a = articles.find((x) => x.id === id); if (a) setSelected(a); else goLabView("articles"); }}
                  onGoFind={() => goLabView("keywords")}
                />
              </main>
            )}

            {/* 내 글 */}
            {labView === "articles" && (
              <main className="ateflo-page-in mx-auto max-w-5xl px-6 py-10">
                <button onClick={() => goLabView("home")} className="-ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700"><span className="text-base leading-none">←</span> 홈</button>
                <h1 className="mt-3 font-pretendard text-[26px] font-bold tracking-tight text-neutral-900 sm:text-[30px]">내 글</h1>
                <p className="mb-6 mt-1.5 text-[15px] text-neutral-400">총 {articles.filter((a) => a.status !== "generating").length}편{articles.some((a) => a.status === "published") ? ` · 발행 ${articles.filter((a) => a.status === "published").length}편` : ""}</p>
                {nextStepBanner}
                {articles.length > 0 && (
                  <div className="mb-4">
                    <Segmented
                      options={[{ value: "list", label: "목록" }, { value: "calendar", label: "캘린더" }]}
                      value={calView ? "calendar" : "list"}
                      onChange={(v) => setCalView(v === "calendar")}
                    />
                  </div>
                )}
                {calView && articles.length > 0 ? (
                  <ContentCalendar articles={articles} onOpen={setSelected} onGoGenerate={() => goLabView("home")} />
                ) : (
                  <ArticleList
                    articles={articles}
                    onOpen={setSelected}
                    onGoGenerate={() => goLabView("home")}
                    onUpdated={(updated) => setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))}
                    wpConnected={Boolean(wpSiteUrl)}
                  />
                )}
              </main>
            )}

            {/* 성과 — 검색 성과 + 수익화 여정 */}
            {labView === "performance" && (
              <main className="ateflo-page-in mx-auto max-w-2xl px-6 py-10">
                <h1 className="font-pretendard text-[26px] font-bold tracking-tight text-neutral-900 sm:text-[30px]">성과</h1>
                <p className="mt-1.5 text-[15px] text-neutral-400">{blogProfile.blog_name ?? "내 블로그"}</p>
                <div className="mt-7">
                  <PerformanceView
                    articles={articles}
                    wpConnected={Boolean(wpSiteUrl)}
                    type={bloggerType(blogProfile.vertical)}
                    onWrite={() => goLabView("home")}
                    onGoConnect={() => goTab("wordpress")}
                    onRegion={() => { goLabView("home"); setRegionTrigger((t) => t + 1); }}
                    onEditBusiness={() => setPage("profile")}
                  />
                </div>
              </main>
            )}
          </div>
        )}

        {/* ── 워드프레스 ── */}
        {!page && !selected && !genParams && tab === "wordpress" && (
          <main className="ateflo-page-in mx-auto max-w-5xl px-6 py-10">
            {nextStepBanner}
            <WordPressPanel siteUrl={wpSiteUrl} onConnected={setWpSiteUrl} onDisconnected={() => setWpSiteUrl(null)} onOpenGuide={openGuide} onOpenSitemapGuide={openSitemapGuide} />
          </main>
        )}

        {/* ── 관리(관리자만) ── */}
        {!page && !selected && !genParams && tab === "admin" && props.isAdmin && (
          <main className="ateflo-page-in mx-auto max-w-5xl px-6 py-10">
            <AdminDashboard stats={props.adminStats} />
          </main>
        )}

        {/* ── 내 정보 (+ 블로그 설정 통합) ── */}
        {!page && !selected && !genParams && tab === "account" && (
          <main className="ateflo-page-in mx-auto max-w-xl px-6 py-10">
            <h1 className="font-pretendard text-[26px] font-bold tracking-tight text-neutral-900 sm:text-[30px]">내정보</h1>

            {/* 프로필 헤더 */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white p-5 ring-1 ring-black/[0.04]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-base font-bold text-white">{initial}</span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-neutral-900">{displayName}</p>
                <p className="text-[13px] text-neutral-400">{PLANS[props.plan].name} · 생성 {articlesUsed}/{props.articlesLimit}편{props.plan !== "pro" ? " (평생)" : ""}</p>
              </div>
            </div>

            {/* 결제 경고 — 재시도 중 */}
            {props.plan === "pro" && props.subStatus === "past_due" && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5">
                <p className="text-sm leading-relaxed text-rose-800">결제 실패로 <b className="text-rose-900">재시도 중</b>이에요. 카드를 다시 등록하면 바로 정상으로 돌아와요.</p>
                <a href="/pricing" className="mt-3 inline-block rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">카드 다시 등록</a>
              </div>
            )}
            {/* 해지 예약 안내 */}
            {props.plan === "pro" && subCanceled && (
              <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5">
                <p className="text-sm leading-relaxed text-neutral-600">해지를 예약했어요.{" "}
                  {props.currentPeriodEnd ? (<><b className="text-neutral-800">{new Date(props.currentPeriodEnd).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}까지</b> 쓸 수 있고,</>) : (<>남은 기간까지 쓸 수 있고,</>)}{" "}다음 결제는 안 나가요.</p>
                <button onClick={resumeSubscription} disabled={busy} className="mt-3 rounded-lg bg-[#1D75F7] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">{busy ? "처리 중…" : "해지 취소하고 계속 이용"}</button>
              </div>
            )}

            {/* 블로그 */}
            <p className="mb-2 mt-7 px-1 text-[13px] font-semibold text-neutral-400">블로그</p>
            <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04]">
              <button onClick={() => goTab("wordpress")} className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-neutral-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1D75F7]/10 text-[#1D75F7]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg></span>
                <span className="flex-1 text-[15px] font-medium text-neutral-800">워드프레스 연결</span>
                <span className="text-[13px] text-neutral-400">{wpSiteUrl ? "연결됨" : "연결 안 됨"}</span>
                <svg className="text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
              {blogProfile && (
                <button onClick={() => setPage("profile")} className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-neutral-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg></span>
                  <span className="flex-1 text-[15px] font-medium text-neutral-800">블로그 설정</span>
                  <svg className="text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              )}
            </div>

            {/* 이용 */}
            <p className="mb-2 mt-7 px-1 text-[13px] font-semibold text-neutral-400">이용</p>
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04]">
              <a href="/pricing" className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-neutral-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1D75F7]/10 text-[#1D75F7]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg></span>
                <span className="flex-1 text-[15px] font-medium text-neutral-800">플랜·결제</span>
                <span className="text-[13px] text-neutral-400">{props.plan === "pro" && props.nextBillingAt && !subCanceled ? `다음 결제 ${new Date(props.nextBillingAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}` : PLANS[props.plan].name}</span>
                <svg className="text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </a>
            </div>

            {/* 계정 */}
            <p className="mb-2 mt-7 px-1 text-[13px] font-semibold text-neutral-400">계정</p>
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04]">
              <button onClick={signOut} className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-neutral-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg></span>
                <span className="flex-1 text-[15px] font-medium text-neutral-800">로그아웃</span>
                <svg className="text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
            <p className="mt-3 px-1 text-[12px] leading-relaxed text-neutral-400">{props.email}</p>

                {/* 계정 관리 — 눈에 띄지 않게(작은 텍스트), 단 접근은 가능하게 */}
                <div className="mt-8 flex flex-col items-start gap-2 px-1 text-xs">
                  {props.plan === "pro" && !subCanceled && (
                    !confirmCancel ? (
                      <button onClick={() => setConfirmCancel(true)} className="text-neutral-400 transition hover:text-neutral-600">
                        구독 해지
                      </button>
                    ) : (
                      <div className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                        <p className="text-sm font-medium text-neutral-900">구독을 해지할까요?</p>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                          {props.currentPeriodEnd ? (
                            <><b className="text-neutral-800">{new Date(props.currentPeriodEnd).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}까지</b> 쓸 수 있어요.</>
                          ) : (
                            <>남은 기간까지 쓸 수 있어요.</>
                          )}{" "}
                          다음 결제만 안 나가고, 언제든 다시 켤 수 있어요.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={cancelSubscription} disabled={busy} className="rounded-lg bg-[#1D75F7] px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
                            {busy ? "처리 중…" : "해지하기"}
                          </button>
                          <button onClick={() => setConfirmCancel(false)} disabled={busy} className="rounded-lg border border-neutral-300 px-4 py-1.5 text-sm font-medium transition hover:border-neutral-900">
                            그대로 둘게요
                          </button>
                        </div>
                      </div>
                    )
                  )}
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)} className="text-neutral-400 transition hover:text-red-500">
                      회원 탈퇴
                    </button>
                  ) : (
                    <div className="w-full rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-900">정말 탈퇴할까요?</p>
                      <p className="mt-1 text-sm leading-relaxed text-red-800">
                        <b>구독이 즉시 해지</b>되어 추가 청구는 없어요. 작성한 글·워드프레스 연결·계정 정보가 <b>모두 영구 삭제</b>되고 되돌릴 수 없어요.
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-red-700">
                        이미 결제한 이용권은 환불되지 않으며, 환불은 <a href="/refund" target="_blank" className="underline">환불 정책</a>을 따라요.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={deleteAccount} disabled={busy} className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50">
                          {busy ? "탈퇴 처리 중…" : "탈퇴하기"}
                        </button>
                        <button onClick={() => setConfirmDelete(false)} disabled={busy} className="rounded-xl border border-neutral-300 px-4 py-1.5 text-sm font-medium transition hover:border-neutral-900">
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
          </main>
        )}
      </div>
    </div>
  );
}
