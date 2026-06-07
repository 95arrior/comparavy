"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import ArticleEditor from "./ArticleEditor";
import { PLANS, formatKRW } from "@/lib/plans";
import type { Article } from "./types";

export default function ArticleModal({
  article,
  wpConnected,
  onClose,
  onUpdated,
}: {
  article: Article;
  wpConnected: boolean;
  onClose: () => void;
  onUpdated: (a: Article) => void;
}) {
  const [title, setTitle] = useState(article.title);
  const [bodyHtml, setBodyHtml] = useState(article.body_html);
  const [featured, setFeatured] = useState<string | null>(article.featured_image ?? null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = title !== article.title || bodyHtml !== article.body_html || featured !== (article.featured_image ?? null);

  // 자동저장: 변경 후 3초 멈추면 저장하고 "자동저장 완료" 표시
  useEffect(() => {
    if (!dirty) return;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/articles/${article.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body_html: bodyHtml, featured_image: featured }),
        });
        if (res.ok) {
          const data = await res.json();
          onUpdated(data.article);
          setAutoSavedAt(new Date().toLocaleTimeString("ko-KR"));
        }
      } catch {
        // 자동저장 실패는 조용히 무시 (수동 저장 가능)
      }
    }, 3000);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, bodyHtml, featured]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body_html: bodyHtml }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      onUpdated(data.article);
      setMessage("저장했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function publish(status: "draft" | "publish") {
    if (!wpConnected) {
      setError("먼저 워드프레스 탭에서 사이트를 연결해 주세요.");
      return;
    }
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/wordpress/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "발행에 실패했습니다.");
        return;
      }
      onUpdated({
        ...article,
        title,
        body_html: bodyHtml,
        status: status === "publish" ? "published" : "draft",
        wp_link: data.link ?? article.wp_link,
      });
      setMessage(status === "publish" ? "워드프레스에 발행했습니다." : "워드프레스에 초안으로 저장했습니다.");
    } finally {
      setPublishing(false);
    }
  }

  // 무료 한도 초과로 만든 미리보기(티저): 상단만 보이고 아래는 블러 + 결제 유도. 프로 결제 전까지 유지.
  if (article.locked) {
    return (
      <>
        <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
            <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
              <span className="text-base leading-none">←</span> 목록으로
            </button>
            <Link href="/pricing" className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700">
              프로로 잠금 해제
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 py-8">
          <span className="text-xs text-neutral-400">미리보기 · {article.keyword}</span>
          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{article.title}</h1>

          <div className="relative mt-6">
            <div className="prose prose-neutral max-w-none" dangerouslySetInnerHTML={{ __html: article.body_html }} />
            {/* 초중반부터 블러 + 흰색 페이드로 가린다 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[28%] bg-gradient-to-b from-white/10 via-white/75 to-white backdrop-blur-[3px]" />
          </div>

          {/* 결제 유도 — 발행 욕구가 최고조일 때 */}
          <div className="mt-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center">
            <p className="text-base font-semibold tracking-tight">이 글, 끝까지 보고 바로 발행하고 싶다면</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              프로로 업그레이드하면 이 글의 잠금이 풀려요. 매달 50편까지, 한 편당 5,000자 깊이로 쓰고 워드프레스에 바로 발행할 수 있어요.
            </p>
            <Link
              href="/pricing"
              className="mt-5 inline-block rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              프로로 업그레이드하고 잠금 해제 →
            </Link>
            <p className="mt-3 text-xs text-neutral-400">{formatKRW(PLANS.pro.price)}/월 · 언제든 해지</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* 상단 액션바 — 스크롤해도 따라옴 */}
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
            <span className="text-base leading-none">←</span> 목록으로
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium transition hover:border-neutral-900 disabled:opacity-40"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
            <button
              onClick={() => publish("publish")}
              disabled={publishing}
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {publishing ? "처리 중…" : "워드프레스에 발행"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <span className="truncate text-xs text-neutral-400">키워드 · {article.keyword}</span>
          {autoSavedAt && (
            <span className="shrink-0 text-xs text-neutral-400">{dirty ? "수정 중…" : `✓ 자동저장 · ${autoSavedAt}`}</span>
          )}
        </div>

        {(error || message) && (
          <div className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {error ?? message}
            {!error && message && article.wp_link && (
              <>
                {" "}
                <a href={article.wp_link} target="_blank" rel="noreferrer" className="underline">글 보기</a>
              </>
            )}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
          <p><strong className="text-neutral-700">메타 제목:</strong> {article.meta_title}</p>
          <p className="mt-1"><strong className="text-neutral-700">메타 설명:</strong> {article.meta_description}</p>
        </div>

        <div className="mt-5">
          <ArticleEditor
            title={title}
            onTitleChange={setTitle}
            featuredImage={featured}
            onFeaturedChange={setFeatured}
            originalHtml={article.original_html ?? undefined}
            initialHtml={article.body_html}
            onChange={setBodyHtml}
            toolbarOffset="top-[57px]"
          />
        </div>

        {article.faq.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-neutral-500">자주 묻는 질문</p>
            <ul className="mt-2 space-y-2">
              {article.faq.map((f, i) => (
                <li key={i} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm">
                  <p className="font-medium">{f.question}</p>
                  <p className="mt-1 text-neutral-600">{f.answer}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </>
  );
}
