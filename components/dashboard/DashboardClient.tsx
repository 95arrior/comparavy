"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { SITE_NAME } from "@/lib/site";
import { PLANS } from "@/lib/plans";
import type { Article, DashboardProps } from "./types";
import ArticleList from "./ArticleList";
import ArticleModal from "./ArticleModal";
import WritingView, { type GenParams } from "./WritingView";
import WordPressPanel from "./WordPressPanel";
import AteFloLogo from "@/components/AteFloLogo";
import HeroInput from "@/components/HeroInput";
import DemoStream from "@/components/DemoStream";
import ServiceIntro from "@/components/ServiceIntro";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import { Ubuntu } from "next/font/google";

const ubuntu = Ubuntu({ subsets: ["latin"], weight: "700", display: "swap" });

type Tab = "generate" | "articles" | "wordpress" | "account";

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const ICON: Record<string, React.ReactNode> = {
  generate: <Svg><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></Svg>,
  articles: <Svg><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h5" /></Svg>,
  wordpress: <Svg><circle cx="12" cy="12" r="9" /><path d="M6.5 9.5l2.3 5.5 3.2-4.5 3.2 4.5 2.3-5.5" /></Svg>,
  account: <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>,
  panel: <Svg><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></Svg>,
};

export default function DashboardClient(props: DashboardProps) {
  const [tab, setTab] = useState<Tab>("generate");
  const [navOpen, setNavOpen] = useState(false);
  const [articles, setArticles] = useState<Article[]>(props.initialArticles);
  const [articlesUsed, setArticlesUsed] = useState(props.articlesUsed);
  const [wpSiteUrl, setWpSiteUrl] = useState<string | null>(props.wpSiteUrl);
  const [selected, setSelected] = useState<Article | null>(null);
  const [genParams, setGenParams] = useState<GenParams | null>(null);

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
        setTab("generate");
        return;
      }
      setGenParams({ keyword: g.keyword, angle: "", type: g.type ?? "howto", tone: g.tone ?? "friendly" });
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

  function onGenerated(article: Article) {
    setArticles((prev) => [article, ...prev]);
    if (!article.locked) setArticlesUsed((n) => n + 1); // 티저(미리보기)는 사용량에 미포함
    setTab("articles");
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

  const nextStep: { tab: Tab; msg: string } | null = !steps[0].done
    ? { tab: "generate", msg: "키워드 하나만 입력하면 첫 글이 만들어져요. 아래에서 바로 시작해보세요!" }
    : !steps[1].done
    ? { tab: "wordpress", msg: "첫 글 완성! 이제 ‘워드프레스’ 메뉴에서 내 블로그를 연결해 주세요." }
    : !steps[2].done
    ? { tab: "articles", msg: "사이트 연결 완료! ‘내 글’에서 글을 열고 ‘워드프레스에 발행’을 누르면 끝이에요." }
    : null;

  const navItems: { key: Tab; label: string }[] = [
    { key: "generate", label: "새 글" },
    { key: "articles", label: articles.length ? `내 글 (${articles.length})` : "내 글" },
    { key: "wordpress", label: "워드프레스" },
  ];

  const displayName = props.email.split("@")[0] || props.email;
  const initial = (props.email.trim()[0] ?? "?").toUpperCase();
  const lockedArticle = articles.find((a) => a.locked) ?? null;
  const blocked = props.plan !== "pro" && articlesUsed >= props.articlesLimit && !!lockedArticle;

  function goTab(k: Tab) {
    setSelected(null);
    setGenParams(null);
    setTab(k);
  }

  const railBtn = (k: Tab, label: string, icon: React.ReactNode) => {
    const active = tab === k && !selected && !genParams;
    return (
      <button
        key={k}
        onClick={() => goTab(k)}
        className={`group relative flex h-9 items-center rounded-lg text-sm transition ${navOpen ? "w-full" : "w-9"} ${
          active ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
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

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900 antialiased">
      {/* 좌측 레일 (ChatGPT식) — 아이콘 위치 고정, 폭만 부드럽게 + 라벨 페이드 */}
      <aside className={`sticky top-0 z-40 flex h-screen shrink-0 flex-col border-r border-neutral-200 bg-white px-2 py-3 transition-[width] duration-200 ease-out ${navOpen ? "w-64" : "w-[56px]"}`}>
        {/* 상단: 로고(항상 같은 자리) + 브랜드명/닫기(펼침 시 페이드) */}
        <div className="mb-2 flex h-9 items-center gap-1">
          {navOpen ? (
            <>
              {/* 로고 + 브랜드 = 한 덩어리, 클릭 시 메인으로 (메인이면 그대로) */}
              <button
                onClick={() => goTab("generate")}
                aria-label="메인으로"
                className="flex h-9 min-w-0 flex-1 items-center rounded-lg transition hover:bg-neutral-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center"><AteFloLogo size={22} /></span>
                <span className={`${ubuntu.className} -ml-1 -translate-y-px truncate text-lg font-bold leading-none tracking-tight text-neutral-900`}>{SITE_NAME}</span>
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
              <span className="absolute inset-0 flex items-center justify-center group-hover:opacity-0"><AteFloLogo size={22} /></span>
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
              {articles.slice(0, 25).map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setGenParams(null);
                    setSelected(a);
                  }}
                  title={a.title}
                  className="truncate rounded-lg px-2 py-1.5 text-left text-sm text-neutral-600 transition hover:bg-neutral-100"
                >
                  {a.locked ? "🔒 " : ""}
                  {a.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 하단: 내 정보 (사용자) */}
        <button
          onClick={() => goTab("account")}
          className={`group relative mt-auto flex items-center rounded-lg transition hover:bg-neutral-50 ${navOpen ? "h-12 w-full" : "h-9 w-9"} ${
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
      </aside>

      {/* 메인 */}
      <div className="min-w-0 flex-1">
        {selected && (
          <ArticleModal
            article={selected}
            wpConnected={Boolean(wpSiteUrl)}
            onClose={() => setSelected(null)}
            onUpdated={onUpdated}
          />
        )}

        {!selected && genParams && (
          <WritingView
            params={genParams}
            pro={props.plan === "pro"}
            isTeaser={props.plan !== "pro" && articlesUsed >= props.articlesLimit}
            onDone={(article) => {
              setGenParams(null);
              onGenerated(article);
            }}
            onExit={() => setGenParams(null)}
          />
        )}

        {/* 새 글 = 메인 화면 (중앙 입력 + 데모 + 스크롤 시 서비스 소개) */}
        {!selected && !genParams && tab === "generate" && (
          <div>
            <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 text-center sm:pt-24">
              <p className="text-sm font-medium tracking-tight text-neutral-400">워드프레스 블로그를 위한 AI 글쓰기</p>
              <h1 className="font-pretendard mt-5 text-4xl font-bold leading-[1.15] tracking-tight sm:text-6xl">글쓰기, 키워드 하나면 끝</h1>
              <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-neutral-500">
                어떤 구조로, 어떤 흐름으로 글을 써야 좋은 글이 되는지. 우리는 그 답을 알고, 키워드 하나로 글을 씁니다.
              </p>
              {blocked && lockedArticle ? (
                <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left">
                  <p className="text-sm font-medium text-amber-900">무료 미리보기를 만들었어요 🔒</p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-800">끝까지 보고 발행하려면, 그리고 글을 더 만들려면 프로로 업그레이드하세요.</p>
                  <p className="mt-3 truncate text-sm font-medium text-neutral-900">“{lockedArticle.title}”</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => setSelected(lockedArticle)} className="rounded-full border border-amber-300 bg-white px-4 py-1.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100">미리보기 글 보기</button>
                    <Link href="/pricing" className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700">프로로 업그레이드</Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-10"><HeroInput loggedIn onStart={setGenParams} /></div>
                  <div className="mt-12"><DemoStream /></div>
                </>
              )}
            </section>
            <ServiceIntro />
            <SiteFooter />
          </div>
        )}

        {!selected && !genParams && tab !== "generate" && (
          <main className="mx-auto max-w-5xl px-6 py-10">
            {tab !== "account" && !allDone && (
              <div className="mb-6 rounded-xl border border-neutral-200 bg-white px-5 py-4">
                <p className="text-xs font-medium text-neutral-400">처음이세요? · 시작 가이드</p>
                {nextStep && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium text-neutral-900">{nextStep.msg}</p>
                    {nextStep.tab !== "generate" && (
                      <button
                        onClick={() => goTab(nextStep.tab)}
                        className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700"
                      >
                        바로 가기
                      </button>
                    )}
                  </div>
                )}
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                  {steps.map((s) => (
                    <li key={s.label} className="flex items-center gap-2 text-xs">
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${s.done ? "bg-emerald-500 text-white" : "border border-neutral-300 text-neutral-400"}`}>
                        {s.done ? "✓" : ""}
                      </span>
                      <span className={s.done ? "text-neutral-300 line-through" : "text-neutral-500"}>{s.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === "articles" && (
              <ArticleList articles={articles} onOpen={setSelected} onGoGenerate={() => goTab("generate")} />
            )}
            {tab === "wordpress" && (
              <WordPressPanel siteUrl={wpSiteUrl} onConnected={setWpSiteUrl} onDisconnected={() => setWpSiteUrl(null)} />
            )}
            {tab === "account" && (
              <div className="mx-auto max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
                <h2 className="text-lg font-semibold tracking-tight">내 정보</h2>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-neutral-500">이메일</dt><dd className="truncate">{props.email}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-neutral-500">플랜</dt><dd className="font-medium">{PLANS[props.plan].name}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-neutral-500">이번 달 사용량</dt><dd>{articlesUsed} / {props.articlesLimit}편</dd></div>
                </dl>
                <div className="mt-6">
                  <button onClick={signOut} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-neutral-900">
                    로그아웃
                  </button>
                </div>
                <p className="mt-4 text-xs text-neutral-400">구독 취소·회원 탈퇴는 곧 추가됩니다.</p>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
