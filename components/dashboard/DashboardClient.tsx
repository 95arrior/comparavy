"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { SITE_NAME } from "@/lib/site";
import { PLANS } from "@/lib/plans";
import type { Article, DashboardProps } from "./types";
import GeneratePanel from "./GeneratePanel";
import ArticleList from "./ArticleList";
import ArticleModal from "./ArticleModal";
import WritingView, { type GenParams } from "./WritingView";
import WordPressPanel from "./WordPressPanel";

type Tab = "generate" | "articles" | "wordpress" | "account";

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const ICON: Record<Tab | "menu", React.ReactNode> = {
  generate: <Svg><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></Svg>,
  articles: <Svg><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h5" /></Svg>,
  wordpress: <Svg><path d="M9 15l6-6" /><path d="M10.5 6.5l1.8-1.8a4 4 0 0 1 5.7 5.7L15.5 12" /><path d="M13.5 17.5l-1.8 1.8a4 4 0 0 1-5.7-5.7L8.5 12" /></Svg>,
  account: <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>,
  menu: <Svg><path d="M4 6h16M4 12h16M4 18h16" /></Svg>,
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
        title={label}
        className={`flex items-center gap-3 rounded-xl py-2.5 text-sm transition ${navOpen ? "px-3" : "w-10 justify-center"} ${
          active ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        }`}
      >
        <span className="shrink-0">{icon}</span>
        {navOpen && <span className="truncate">{label}</span>}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900 antialiased">
      {/* 좌측 레일 */}
      <aside className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-neutral-200 bg-white p-3 transition-[width] ${navOpen ? "w-56" : "w-16"}`}>
        <button
          onClick={() => setNavOpen((v) => !v)}
          title="메뉴"
          className={`mb-3 flex items-center gap-2 rounded-xl py-2.5 text-neutral-700 transition hover:bg-neutral-100 ${navOpen ? "px-3" : "w-10 justify-center"}`}
        >
          <span className="shrink-0">{ICON.menu}</span>
          {navOpen && <span className="font-semibold tracking-tight">{SITE_NAME}</span>}
        </button>

        <nav className="flex flex-col gap-1">
          {navItems.map((it) => railBtn(it.key, it.label, ICON[it.key]))}
        </nav>

        <div className="mt-auto">{railBtn("account", "내 정보", ICON.account)}</div>
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

        {!selected && !genParams && (
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

            {tab === "generate" && (
              <GeneratePanel
                remaining={props.articlesLimit - articlesUsed}
                onStart={setGenParams}
                pro={props.plan === "pro"}
                lockedTeaser={articles.find((a) => a.locked) ?? null}
                onOpenLocked={() => {
                  const t = articles.find((a) => a.locked);
                  if (t) setSelected(t);
                }}
              />
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
