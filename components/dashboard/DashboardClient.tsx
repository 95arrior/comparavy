"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { SITE_NAME } from "@/lib/site";
import { PLANS } from "@/lib/plans";
import type { Article, DashboardProps } from "./types";
import GeneratePanel from "./GeneratePanel";
import ArticleList from "./ArticleList";
import ArticleModal from "./ArticleModal";
import WordPressPanel from "./WordPressPanel";

type Tab = "generate" | "articles" | "wordpress";

export default function DashboardClient(props: DashboardProps) {
  const [tab, setTab] = useState<Tab>("generate");
  const [articles, setArticles] = useState<Article[]>(props.initialArticles);
  const [articlesUsed, setArticlesUsed] = useState(props.articlesUsed);
  const [wpSiteUrl, setWpSiteUrl] = useState<string | null>(props.wpSiteUrl);
  const [selected, setSelected] = useState<Article | null>(null);

  const hasPublished = articles.some((a) => a.status === "published" || a.status === "future");

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function onGenerated(article: Article) {
    setArticles((prev) => [article, ...prev]);
    setArticlesUsed((n) => n + 1);
    setTab("articles");
  }

  function onUpdated(updated: Article) {
    setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelected(updated);
  }

  function onDeleted(id: string) {
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setSelected(null);
  }

  const steps = [
    { label: "첫 글 생성하기", done: articles.length > 0 },
    { label: "워드프레스 사이트 연결하기", done: Boolean(wpSiteUrl) },
    { label: "글 발행하기", done: hasPublished },
  ];
  const allDone = steps.every((s) => s.done);

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

      <main className="mx-auto max-w-5xl px-6 py-10">
        {!allDone && (
          <div className="mb-6 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70 px-4 py-3">
            <p className="text-xs font-medium text-neutral-400">처음이세요? · 시작 가이드</p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
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
            onGenerated={onGenerated}
            pro={props.plan === "pro"}
          />
        )}
        {tab === "articles" && (
          <ArticleList articles={articles} onOpen={setSelected} onGoGenerate={() => setTab("generate")} />
        )}
        {tab === "wordpress" && (
          <WordPressPanel siteUrl={wpSiteUrl} onConnected={setWpSiteUrl} onDisconnected={() => setWpSiteUrl(null)} />
        )}
      </main>

      {selected && (
        <ArticleModal
          article={selected}
          wpConnected={Boolean(wpSiteUrl)}
          onClose={() => setSelected(null)}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
