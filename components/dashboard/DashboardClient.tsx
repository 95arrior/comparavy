"use client";

import { useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Article, DashboardProps, KeywordResult, KeywordStatus } from "./types";
import CreditPaywallSheet from "./CreditPaywallSheet";
import CreditsView from "./CreditsView";
import ArticleList from "./ArticleList";
import ArticleModal from "./ArticleModal";
import CenterToast from "./CenterToast";
import WritingView, { type GenParams } from "./WritingView";
import WriteTypeSheet from "./WriteTypeSheet";
import ProfileSettings from "./ProfileSettings";
import KeywordFinder from "./KeywordFinder";
import KeywordQueue from "./KeywordQueue";
import Onboarding from "./Onboarding";
import Home from "./Home";
import { toEngineType, type BlogProfile } from "@/lib/blogProfile";
import GlassIcon from "@/components/GlassIcon";
import TossNav, { type NavKey } from "./TossNav";
import PerformanceView from "./PerformanceView";
import type { QueueItem } from "@/lib/keywordQueue";
import AdminDashboard from "./AdminDashboard";
import NewsView from "./NewsView";
import { LATEST_ANNOUNCEMENT_ID } from "@/lib/announcements";

// ★네이버 수익형 단일 — 워드프레스 탭·연결·예약발행 제거. 발행은 '복사 → 네이버 붙여넣기' 하나.
type Tab = "lab" | "account" | "admin";
type LabView = "home" | "keywords" | "queue" | "articles" | "performance";

export default function DashboardClient(props: DashboardProps) {
  const [tab, setTab] = useState<Tab>("lab");
  const [labView, setLabView] = useState<LabView>("home");
  const [articles, setArticles] = useState<Article[]>(props.initialArticles);
  const [credits, setCredits] = useState(props.credits); // 크레딧 잔액 — 생성 완료 시 서버 잔액으로 갱신
  const [paywall, setPaywall] = useState<null | { title?: string; charge?: boolean }>(null); // 잔액 0 페이월 or 충전 시트
  const [selected, setSelected] = useState<Article | null>(null);
  const [genParams, setGenParams] = useState<GenParams | null>(null);
  const [naverBlogId, setNaverBlogId] = useState(""); // 네이버 블로그 아이디(글쓰기 직행용) — 내정보에서 수정
  useEffect(() => {
    // ★서버(프로필)가 진실 — 있으면 기기 캐시를 덮어써 모바일·웹 동기화. 없으면 기기 캐시 폴백(구버전 호환).
    const serverId = (blogProfile as { naver_blog_id?: string | null } | null)?.naver_blog_id ?? "";
    if (serverId) {
      setNaverBlogId(serverId);
      try { localStorage.setItem("ateflo_naver_blogid", serverId); } catch { /* ignore */ }
    } else {
      try {
        const local = localStorage.getItem("ateflo_naver_blogid") || "";
        setNaverBlogId(local);
        // 기기에만 있던 값은 서버로 승격(1회 마이그레이션)
        if (local && blogProfile) void fetch("/api/blog-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ naver_blog_id: local }) });
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function editNaverBlogId() {
    const input = window.prompt("내 네이버 블로그 아이디\n(예: blog.naver.com/myblog → myblog)", naverBlogId);
    if (input == null) return;
    const id = input.trim().replace(/^https?:\/\//, "").replace(/^m\./, "").replace(/^blog\.naver\.com\//, "").replace(/[/?#].*$/, "").trim();
    try { if (id) localStorage.setItem("ateflo_naver_blogid", id); else localStorage.removeItem("ateflo_naver_blogid"); } catch { /* ignore */ }
    setNaverBlogId(id);
    // 서버에도 저장 — 모바일·웹 동기화
    void fetch("/api/blog-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ naver_blog_id: id }) });
  }
  // 글 생성 직전 '확인' 대기 (확인하면 genParams로 생성 시작 — 크레딧 실수 방지)
  const [pendingWrite, setPendingWrite] = useState<{ keyword: string; title: string; newsContext?: string; briefText?: string; titleSearch?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<null | "news" | "profile" | "credits">(null);
  const [unreadNews, setUnreadNews] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null); // 백그라운드 생성 완료 → '보러가기'로 안내
  // 블로그 프로필 + 키워드 예약 큐
  const [blogProfile, setBlogProfile] = useState<BlogProfile | null>(null);
  const [reonboardPrev, setReonboardPrev] = useState<BlogProfile | null>(null); // 재설정(재온보딩) 전 프로필 — 취소 시 복귀
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
  const [profileLoaded, setProfileLoaded] = useState(false); // 프로필 fetch 완료 여부 — 온보딩/메인 깜빡임 방지 가드
  const autoSearched = useRef(false);
  // 백그라운드에서 생성 중인 글(도중 이탈 후 복귀 시 메인에 '생성 중' 카드로 표시)
  const generatingArticle = articles.find((a) => a.status === "generating") ?? null;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      }
      // ateflo 상태가 아니면(앱 진입 이전) 브라우저가 정상적으로 사이트를 벗어남
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [articles]);

  // 메인에서 키워드+유형+문체를 받고 왔으면, 바로 작성화면을 띄운다(뎁스 축소)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("ateflo_gen");
    if (!raw) return;
    localStorage.removeItem("ateflo_gen");
    try {
      const g = JSON.parse(raw) as { keyword?: string; type?: string; tone?: string };
      if (!g.keyword) return;
      if (props.credits <= 0) { setTab("lab"); setPaywall({}); return; } // 잔액 0 → 페이월
      setGenParams({ keyword: g.keyword, angle: "", type: g.type ?? "howto", tone: g.tone ?? "friendly", promo: false });
    } catch {
      // 무시
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPublished = articles.some((a) => a.status === "published");

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // (크레딧 전환 — 구독 해지/재개 로직 제거. 크레딧은 소모성이라 구독 개념 없음)

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

  // 블로그 프로필·큐·마지막 검색 로드 (마운트 1회 — 새로고침/재접속에도 복원)
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
        if (alive) setProfileLoaded(true);
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

  // 키워드 선택 → 큐에 담고 첫 1개 즉시 생성. 프로필 없으면 설정으로 유도.
  async function handleQueue(keywords: string[]): Promise<boolean> {
    if (!blogProfile) {
      setNotice("먼저 ‘내 정보 › 블로그 설정’을 완료해 주세요.");
      goTab("account");
      return false;
    }
    if (credits <= 0) { setPaywall({}); return false; } // 잔액 0 → 페이월(서버도 이중 차단)
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
        setGenParams({ keyword: first.keyword, angle: "", type: toEngineType(blogProfile.article_type, blogProfile.vertical), tone: blogProfile.tone, promo: false });
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

  // 블로그 저장(신규/수정) → 홈으로. 신규면 환영.
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
    if (updated.status === "deleted") {
      setArticles((prev) => prev.filter((a) => a.id !== updated.id));
      setSelected(null);
      return;
    }
    setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelected(updated);
  }

  // 시작 여정 — 글 만들기 → 네이버 발행. (워드프레스 단계 없음)
  const steps = [
    { label: "첫 글 만들기", done: articles.length > 0 },
    { label: "네이버에 발행하기", done: hasPublished },
  ];
  const allDone = steps.every((s) => s.done);

  const nextStep: { go: () => void; msg: string; label: string } | null = !steps[0].done
    ? { go: () => goLabView("home"), msg: "이야기를 적거나 글감 하나만 고르면 첫 글이 만들어져요. 홈에서 바로 시작해보세요!", label: "홈으로" }
    : !hasPublished
    ? { go: () => goLabView("articles"), msg: "첫 글 완성! ‘내 글’에서 글을 열어 복사 → 네이버 블로그에 붙여넣으면 끝이에요.", label: "내 글로" }
    : null;

  const displayName = props.email.split("@")[0] || props.email;
  const initial = (props.email.trim()[0] ?? "?").toUpperCase();

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
    setPage("news");
    setUnreadNews(false);
    try {
      localStorage.setItem("ateflo_seen_announcement", LATEST_ANNOUNCEMENT_ID);
    } catch {
      // 무시
    }
  }

  // 첫 로드 — 브라우저 스크롤 복원·해시 점프 때문에 살짝 내려간 채 시작하는 것 방지
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, []);

  // 탭·뷰(공지/글편집/작성) 전환 시 항상 맨 위에서 시작.
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
    if (k === "lab") setLabView("home"); // '홈' 클릭 = 항상 홈부터
  }

  // 홈 내부 탭 이동 (홈 화면 안에서 도구 전환)
  function goLabView(v: LabView) {
    if (genParams) return;
    setSelected(null);
    setGenParams(null);
    setPage(null);
    setTab("lab");
    setLabView(v);
  }

  // 토스 하단/상단 탭 ↔ 기존 tab/labView 매핑
  const navKey: NavKey =
    tab === "lab"
      ? labView === "articles" ? "articles" : labView === "performance" ? "performance" : "home"
      : "more"; // account/admin → 더보기
  const onNav = (k: NavKey) => {
    if (k === "home") goTab("lab");
    else if (k === "articles") goLabView("articles");
    else if (k === "performance") goLabView("performance");
    else goTab("account"); // 더보기
  };
  const showNav = !selected && !genParams && !page && !!blogProfile; // 온보딩·편집·생성·풀페이지엔 탭바 숨김

  // 온보딩 진척 배너 — 가입 직후 빈 화면을 막기 위해 진행(완료/진행 중/대기)을 한눈에 보여주고, 다음 할 일을 강조한다.
  const doneCount = steps.filter((s) => s.done).length;
  const firstUndone = steps.findIndex((s) => !s.done);
  const nextStepBanner = !allDone && nextStep ? (
    <div className="mb-6 rounded-2xl bg-[#1D75F7]/[0.06] p-5">
      {/* 진행 도트 */}
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
    <div className="at-app-bg flex min-h-screen text-neutral-900 antialiased">
      {/* 메인 */}
      {showNav && <TossNav active={navKey} onNav={onNav} initial={initial} />}
      <div className={`min-w-0 flex-1 ${showNav ? "pb-[78px] md:pb-0 md:pt-16" : ""}`}>
        <CenterToast message={notice} />

        {/* 잔액 0 페이월 — 쓰려던 글감 제목이 잠긴 상태로 보이는 결제 유도 시트 */}
        {paywall && <CreditPaywallSheet pendingTitle={paywall.title} charge={paywall.charge} onClose={() => setPaywall(null)} />}

        {page === "news" && <NewsView onBack={() => setPage(null)} />}
        {page === "credits" && (
          <CreditsView credits={credits} onBack={() => setPage(null)} onCharge={() => { window.location.assign("/pricing"); }} />
        )}
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
            vertical={blogProfile?.vertical ?? "general"}
            onClose={() => setSelected(null)}
            onUpdated={onUpdated}
            onCredits={setCredits}
          />
        )}

        {!page && !selected && genParams && (
          <WritingView
            params={genParams}
            pro
            vertical={blogProfile?.vertical}
            onDone={(article) => {
              setGenParams(null);
              onGenerated(article);
            }}
            onCredits={setCredits}
            onExit={() => setGenParams(null)}
          />
        )}

        {/* 생성 확인 시트 — 글감 클릭 후, 생성 시작 전(크레딧 실수 방지) */}
        {pendingWrite && blogProfile && (
          <WriteTypeSheet
            title={pendingWrite.title}
            titleAlt={pendingWrite.titleSearch}
            onClose={() => setPendingWrite(null)}
            onPick={({ withImages, title: pickedTitle }) => {
              setSelected(null);
              setGenParams({
                keyword: pendingWrite.keyword,
                angle: pickedTitle ?? pendingWrite.title,
                type: toEngineType(blogProfile.article_type, blogProfile.vertical),
                tone: blogProfile.tone,
                promo: false,
                withImages,
                newsContext: pendingWrite.newsContext,
                angleBrief: pendingWrite.briefText,
              });
              setPendingWrite(null);
            }}
          />
        )}

        {/* ── 홈 : 블로그 없으면 온보딩, 있으면 내부 탭으로 도구 전환 ── */}
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
            {/* 메인 홈 — 탭 없이 한 페이지(내 이야기 + 글감). 글감 '구경'은 잔액 0이어도 가능(구경 무료), 생성만 크레딧 */}
            {labView === "home" && (
              <Home
                displayName={displayName}
                blogName={blogProfile.blog_name ?? "내 블로그"}
                articles={articles}
                credits={credits}
                onGoPerformance={() => goLabView("performance")}
                onOpenCredits={() => setPage("credits")}
                  unreadNews={unreadNews}
                  onOpenNews={openNews}
                onWriteKeyword={(keyword, title, newsContext, briefText, titleSearch) => {
                  // 글감 카드 [이 글 쓰기] → 잔액 0이면 '쓰려던 글이 잠긴' 페이월, 있으면 확인 시트.
                  if (credits <= 0) {
                    setPaywall({ title });
                    return;
                  }
                  setPendingWrite({ keyword, title, newsContext, briefText, titleSearch });
                }}
                onSelect={setSelected}
                profileKey={`${blogProfile.vertical}:${blogProfile.sub_category ?? ""}`}
              />
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

            {/* 내 글 — v2: at 위계 헤더, 배너·뒤로가기 제거(하단 탭이 내비) */}
            {labView === "articles" && (
              <main className="ateflo-page-in mx-auto max-w-2xl px-6 py-8 pb-16">
                <p className="at-label">총 {articles.filter((a) => a.status !== "generating").length}편{articles.some((a) => a.status === "published") ? ` · 발행 ${articles.filter((a) => a.status === "published").length}편` : ""}</p>
                <h1 className="at-headline mt-1">내 글</h1>
                <div className="mt-5">
                  <ArticleList
                    articles={articles}
                    onOpen={setSelected}
                    onGoGenerate={() => goLabView("home")}
                    onUpdated={(updated) => setArticles((prev) => (updated.status === "deleted" ? prev.filter((a) => a.id !== updated.id) : prev.map((a) => (a.id === updated.id ? updated : a))))}
                  />
                </div>
              </main>
            )}

            {/* 성과 — 발행 흐름 + 수익화 여정 */}
            {labView === "performance" && (
              <main className="ateflo-page-in mx-auto max-w-2xl px-6 py-8 pb-16">
                <p className="at-label">{blogProfile.blog_name ?? "내 블로그"}</p>
                <h1 className="at-headline mt-1">성과</h1>
                <div className="mt-5">
                  <PerformanceView
                    articles={articles}
                    onWrite={() => goLabView("home")}
                  />
                </div>
              </main>
            )}
          </div>
        )}

        {/* ── 관리(관리자만) ── */}
        {!page && !selected && !genParams && tab === "admin" && props.isAdmin && (
          <main className="ateflo-page-in mx-auto max-w-5xl px-6 py-10">
            <button onClick={() => goTab("account")} className="mb-4 -ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700"><span className="text-base leading-none">←</span> 내정보</button>
            <AdminDashboard stats={props.adminStats ?? null} />
          </main>
        )}

        {/* ── 내 정보 (+ 블로그 설정 통합) ── */}
        {!page && !selected && !genParams && tab === "account" && (
          <main className="ateflo-page-in mx-auto max-w-xl px-6 py-10">
            <h1 className="at-headline">내정보</h1>

            {/* 프로필 헤더 */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl at-glass p-5 ">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-base font-bold text-white">{initial}</span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-neutral-900"><span className="px-0.5" style={{ background: "linear-gradient(transparent 62%, #ffe94d 62%)" }}>{displayName}</span></p>
                <p className="text-[13px] text-neutral-400">크레딧 <b className="text-[#1D75F7]">{credits.toLocaleString("ko-KR")}</b> · 글 1편 = 10크레딧</p>
              </div>
            </div>

            {/* 블로그 */}
            <p className="mb-2 mt-7 px-1 text-[13px] font-semibold text-neutral-400">블로그</p>
            <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl at-glass ">
              <button onClick={editNaverBlogId} className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-neutral-50">
                <GlassIcon name="naver" tint="green" size={36} />
                <span className="flex-1 text-[15px] font-medium text-neutral-800">네이버 블로그 주소</span>
                <span className="max-w-[40%] truncate text-[13px] text-neutral-400">{naverBlogId || "설정 안 됨"}</span>
                <svg className="shrink-0 text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
              {blogProfile && (
                <button onClick={() => setPage("profile")} className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-neutral-50">
                  <GlassIcon name="settings" tint="grey" size={36} />
                  <span className="flex-1 text-[15px] font-medium text-neutral-800">블로그 설정</span>
                  <svg className="text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              )}
            </div>

            {/* 이용 */}
            <p className="mb-2 mt-7 px-1 text-[13px] font-semibold text-neutral-400">이용</p>
            <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl at-glass ">
              <button onClick={() => setPage("credits")} className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-neutral-50">
                <GlassIcon name="card" tint="blue" size={36} />
                <span className="flex-1 text-[15px] font-medium text-neutral-800">크레딧 충전·내역</span>
                <span className="text-[13px] text-neutral-400">{credits.toLocaleString("ko-KR")} 보유</span>
                <svg className="text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
              <button onClick={openNews} className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-neutral-50">
                <span className="relative inline-flex shrink-0">
                  <GlassIcon name="bell" tint="violet" size={36} />
                  {unreadNews && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
                </span>
                <span className="flex-1 text-[15px] font-medium text-neutral-800">공지·업데이트</span>
                <svg className="text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
              {props.isAdmin && (
                <button onClick={() => goTab("admin")} className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-neutral-50">
                  <GlassIcon name="chart" tint="grey" size={36} />
                  <span className="flex-1 text-[15px] font-medium text-neutral-800">관리</span>
                  <svg className="text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              )}
            </div>

            {/* 계정 */}
            <p className="mb-2 mt-7 px-1 text-[13px] font-semibold text-neutral-400">계정</p>
            <div className="overflow-hidden rounded-2xl at-glass ">
              <button onClick={signOut} className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-neutral-50">
                <GlassIcon name="logout" tint="rose" size={36} />
                <span className="flex-1 text-[15px] font-medium text-neutral-800">로그아웃</span>
                <svg className="text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
            <p className="mt-3 px-1 text-[12px] leading-relaxed text-neutral-400">{props.email}</p>
            <p className="mt-1 px-1 text-[11px] text-neutral-300">
              <a href="/terms" className="hover:text-neutral-500">이용약관</a>
              <span className="mx-1">·</span>
              <a href="/privacy" className="hover:text-neutral-500">개인정보처리방침</a>
              <span className="mx-1">·</span>
              <a href="/refund" className="hover:text-neutral-500">환불정책</a>
            </p>

                {/* 계정 관리 — 눈에 띄지 않게(작은 텍스트), 단 접근은 가능하게 */}
                <div className="mt-8 flex flex-col items-start gap-2 px-1 text-xs">
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)} className="text-neutral-400 transition hover:text-red-500">
                      회원 탈퇴
                    </button>
                  ) : (
                    <div className="w-full rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-900">정말 탈퇴할까요?</p>
                      <p className="mt-1 text-sm leading-relaxed text-red-800">
                        남은 크레딧이 <b>소멸</b>되고, 작성한 글·계정 정보가 <b>모두 영구 삭제</b>되어 되돌릴 수 없어요.
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
