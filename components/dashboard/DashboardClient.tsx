"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { SITE_NAME } from "@/lib/site";
import { PLANS } from "@/lib/plans";
import type { Article, DashboardProps } from "./types";
import GeneratePanel from "./GeneratePanel";
import ArticleList from "./ArticleList";
import ArticleModal from "./ArticleModal";
import WritingView, { type GenParams } from "./WritingView";
import WordPressPanel from "./WordPressPanel";

type Tab = "generate" | "articles" | "wordpress";

export default function DashboardClient(props: DashboardProps) {
  const [tab, setTab] = useState<Tab>("generate");
  const [articles, setArticles] = useState<Article[]>(props.initialArticles);
  const [articlesUsed, setArticlesUsed] = useState(props.articlesUsed);
  const [wpSiteUrl, setWpSiteUrl] = useState<string | null>(props.wpSiteUrl);
  const [selected, setSelected] = useState<Article | null>(null);
  const [genParams, setGenParams] = useState<GenParams | null>(null);

  // 메인에서 키워드+유형+문체를 받고 왔으면, 생성탭 거치지 않고 바로 작성화면을 띄운다(뎁스 축소)
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
        // 이미 미리보기를 만든 무료 사용자 → 자동 시작 대신 생성탭(차단 안내)으로
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
    setSelected(article); // 생성 직후 바로 편집 화면 열기
  }

  function onUpdated(updated: Article) {
    setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelected(updated);
  }

  function onDeleted(id: string) {
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setSelected(null);
  }

  async function deleteArticle(id: string) {
    if (!confirm("이 글을 삭제할까요?")) return;
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    onDeleted(id);
  }

  const steps = [
    { label: "첫 글 생성하기", done: articles.length > 0 },
    { label: "워드프레스 사이트 연결하기", done: Boolean(wpSiteUrl) },
    { label: "글 발행하기", done: hasPublished },
  ];
  const allDone = steps.every((s) => s.done);

  // 진행 상황에 맞춰 "지금 할 일"을 친절하게 안내
  const nextStep: { tab: Tab; msg: string } | null = !steps[0].done
    ? { tab: "generate", msg: "키워드 하나만 입력하면 첫 글이 만들어져요. 아래에서 바로 시작해보세요!" }
    : !steps[1].done
    ? { tab: "wordpress", msg: "첫 글 완성! 이제 ‘워드프레스’ 메뉴에서 내 블로그를 연결해 주세요." }
    : !steps[2].done
    ? { tab: "articles", msg: "사이트 연결 완료! ‘글 목록’에서 글을 열고 ‘워드프레스에 발행’을 누르면 끝이에요." }
    : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "generate", label: "글 생성" },
    { key: "articles", label: `글 목록 (${articles.length})` },
    { key: "wordpress", label: "워드프레스" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-semibold tracking-tight">{SITE_NAME}</Link>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span className="hidden sm:inline">{props.email}</span>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              {PLANS[props.plan].name} · {articlesUsed}/{props.articlesLimit}편
            </span>
            <button onClick={signOut} className="transition hover:text-neutral-900">로그아웃</button>
          </div>
        </div>
      </header>

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
        {!allDone && (
          <div className="mb-6 rounded-xl border border-neutral-200 bg-white px-5 py-4">
            <p className="text-xs font-medium text-neutral-400">처음이세요? · 시작 가이드</p>
            {nextStep && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-neutral-900">{nextStep.msg}</p>
                {nextStep.tab !== "generate" && (
                  <button
                    onClick={() => setTab(nextStep.tab)}
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

        <div className="mb-6 flex gap-1 border-b border-neutral-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                tab === t.key
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

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
          <ArticleList articles={articles} onOpen={setSelected} onGoGenerate={() => setTab("generate")} onDelete={deleteArticle} />
        )}
        {tab === "wordpress" && (
          <WordPressPanel siteUrl={wpSiteUrl} onConnected={setWpSiteUrl} onDisconnected={() => setWpSiteUrl(null)} />
        )}
      </main>
      )}
    </div>
  );
}
