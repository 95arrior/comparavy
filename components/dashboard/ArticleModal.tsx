"use client";

import { useState, useEffect, useRef } from "react";
import ArticleEditor from "./ArticleEditor";
import type { Article } from "./types";

export default function ArticleModal({
  article,
  wpConnected,
  onClose,
  onUpdated,
  onDeleted,
}: {
  article: Article;
  wpConnected: boolean;
  onClose: () => void;
  onUpdated: (a: Article) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(article.title);
  const [bodyHtml, setBodyHtml] = useState(article.body_html);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = title !== article.title || bodyHtml !== article.body_html;

  // 자동저장: 변경 후 3초 멈추면 저장하고 "자동저장 완료" 표시
  useEffect(() => {
    if (!dirty) return;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/articles/${article.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body_html: bodyHtml }),
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
  }, [title, bodyHtml]);

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

  async function remove() {
    if (!confirm("이 글을 삭제할까요?")) return;
    await fetch(`/api/articles/${article.id}`, { method: "DELETE" });
    onDeleted(article.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div
        className="my-4 w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="text-xs text-neutral-400">{article.keyword}</span>
          <button onClick={onClose} className="text-sm text-neutral-400 transition hover:text-neutral-900">닫기 ✕</button>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
          <p><strong className="text-neutral-700">메타 제목:</strong> {article.meta_title}</p>
          <p className="mt-1"><strong className="text-neutral-700">메타 설명:</strong> {article.meta_description}</p>
        </div>

        <div className="mt-4">
          <ArticleEditor
            title={title}
            onTitleChange={setTitle}
            initialHtml={article.body_html}
            onChange={setBodyHtml}
          />
        </div>

        {article.faq.length > 0 && (
          <div className="mt-4">
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

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {message && (
          <p className="mt-4 text-sm text-emerald-600">
            {message}{" "}
            {article.wp_link && (
              <a href={article.wp_link} target="_blank" rel="noreferrer" className="underline">글 보기</a>
            )}
          </p>
        )}
        {autoSavedAt && (
          <p className="mt-2 text-xs text-neutral-400">{dirty ? "수정 중…" : `✓ 자동저장 완료 · ${autoSavedAt}`}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium transition hover:border-neutral-900 disabled:opacity-40"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          <button
            onClick={() => publish("publish")}
            disabled={publishing}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {publishing ? "처리 중…" : "워드프레스에 발행"}
          </button>
          <button
            onClick={() => publish("draft")}
            disabled={publishing}
            className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium transition hover:border-neutral-900 disabled:opacity-50"
          >
            초안으로 보내기
          </button>
          <button onClick={remove} className="ml-auto text-sm text-red-500 transition hover:text-red-700">삭제</button>
        </div>
      </div>
    </div>
  );
}
