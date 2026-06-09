"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import ArticleEditor, { type ArticleEditorHandle } from "./ArticleEditor";
import { PLANS, formatKRW } from "@/lib/plans";
import type { Article } from "./types";

export default function ArticleModal({
  article,
  wpConnected,
  canPublish,
  onClose,
  onUpdated,
}: {
  article: Article;
  wpConnected: boolean;
  canPublish?: boolean;
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
  const [showUpsell, setShowUpsell] = useState(false);
  const [faqAdded, setFaqAdded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const editorRef = useRef<ArticleEditorHandle>(null);

  // FAQ를 본문 맨 아래에 실제 텍스트로 추가 (방문자에게 보이는 자주 묻는 질문 섹션).
  function addFaqToBody() {
    if (!article.faq.length) return;
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html =
      `<h2>자주 묻는 질문</h2>` +
      article.faq.map((f) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join("");
    editorRef.current?.appendContent(html);
    setFaqAdded(true);
  }
  const [copied, setCopied] = useState(false);

  // 본문을 클립보드로 복사 (서식 유지 HTML + 평문 동시) — 무료 사용자가 블로그에 붙여넣어 쓰는 핵심 기능
  async function copyBody() {
    try {
      const html = `<h1>${title}</h1>\n${bodyHtml}`;
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const text = `${title}\n\n${tmp.innerText}`;
      if (navigator.clipboard && typeof window !== "undefined" && "ClipboardItem" in window) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 무시
    }
  }
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = title !== article.title || bodyHtml !== article.body_html || featured !== (article.featured_image ?? null);

  // 편집 화면 열릴 때 항상 맨 위로 (작성 화면에서 스크롤 내려와 있어도)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // 자동저장: 변경 후 3초 멈추면 저장하고 "자동저장 완료" 표시
  useEffect(() => {
    if (!dirty) return;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/articles/${article.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body_html: currentBody(), featured_image: featured }),
        });
        if (res.ok) {
          const data = await res.json();
          onUpdated(data.article);
          setAutoSavedAt(new Date().toLocaleTimeString("ko-KR"));
          setSaveFailed(false);
        } else {
          setSaveFailed(true);
        }
      } catch {
        // 자동저장 실패를 화면에 표시 → 수동 저장 유도 (예전엔 조용히 묻혀 '저장 안 됨'처럼 보였음)
        setSaveFailed(true);
      }
    }, 3000);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, bodyHtml, featured]);

  // 저장 시점의 '진짜 최신' 본문 — React 상태가 한 박자 늦더라도 에디터에서 직접 읽어 누락을 막는다.
  function currentBody(): string {
    return editorRef.current?.getHTML() ?? bodyHtml;
  }

  async function save() {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    const liveBody = currentBody();
    setBodyHtml(liveBody);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body_html: liveBody, featured_image: featured }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      onUpdated(data.article);
      setSaveFailed(false);
      setAutoSavedAt(new Date().toLocaleTimeString("ko-KR"));
      setMessage("저장했습니다.");
    } catch {
      setError("저장 중 오류가 났어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function publish(status: "draft" | "publish") {
    if (!wpConnected) {
      setError("먼저 워드프레스 탭에서 사이트를 연결해 주세요.");
      return;
    }
    const isRepublish = Boolean(article.wp_post_id);
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      // 발행 전에 현재 편집 내용을 먼저 저장(완료까지 대기). 발행 API는 DB 본문을 읽으므로,
      // 자동저장(3초 디바운스)이 아직 안 끝났으면 편집분이 누락되는 문제를 막는다.
      if (autoTimer.current) clearTimeout(autoTimer.current);
      const liveBody = currentBody();
      setBodyHtml(liveBody);
      const saveRes = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body_html: liveBody, featured_image: featured }),
      });
      if (!saveRes.ok) {
        setError("편집 내용 저장에 실패해 발행을 멈췄어요. 잠시 후 다시 시도해 주세요.");
        return;
      }

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
        // 발행된 워드프레스 글 ID 저장 → 다음 발행은 같은 글을 수정(재발행), 버튼도 "재발행"으로 전환
        wp_post_id: data.postId ?? article.wp_post_id,
      });
      setMessage(
        status === "publish"
          ? isRepublish
            ? "수정한 내용을 워드프레스에 다시 반영했어요."
            : "워드프레스에 발행했습니다."
          : "워드프레스에 초안으로 저장했습니다.",
      );
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

          {/* 위 ~3줄만 선명, 그 아래는 블러+페이드, 결제 카드가 가운데 떠 있음 (일반적인 페이월 방식) */}
          <div className="relative mt-6">
            {/* 세로 크롭(본문은 위 일부만 노출) */}
            <div className="max-h-[30rem] overflow-hidden">
              <div className="prose prose-neutral max-w-none" dangerouslySetInnerHTML={{ __html: article.body_html }} />
            </div>
            {/* 3줄 아래부터 흐려지고 배경색으로 사라짐. 좌우로 더 넓게 덮어 글자 끝이 안 잘리게 */}
            <div className="pointer-events-none absolute -inset-x-6 bottom-0 top-[4.75rem] bg-gradient-to-b from-transparent via-neutral-50/85 to-neutral-50 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,transparent,#000_3rem)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_3rem)]" />
            {/* 결제 카드: 흐려진 영역 위 중앙, 바닥에서 충분히 띄워 그라데이션·그림자가 안 잘리게 */}
            <div className="absolute inset-x-0 bottom-12 flex justify-center px-4">
              <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-xl">
                <p className="text-base font-semibold tracking-tight">여기부터는 프로 회원만 볼 수 있어요</p>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                  프로로 업그레이드하면 이 글 전체가 열리고, 매달 30편까지 5,000자 깊이로 쓰고 워드프레스에 바로 발행할 수 있어요.
                </p>
                <Link
                  href="/pricing"
                  className="ateflo-rainbow mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-medium text-white transition"
                >
                  프로 업그레이드하고 전체보기 →
                </Link>
                <p className="mt-2 text-xs text-neutral-400">{formatKRW(PLANS.pro.price)}/월 · 언제든 해지</p>
              </div>
            </div>
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
              onClick={copyBody}
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium transition hover:border-neutral-900"
            >
              {copied ? "복사됨 ✓" : "복사"}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium transition hover:border-neutral-900 disabled:opacity-40"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
            <button
              onClick={() => (canPublish ? publish("publish") : setShowUpsell(true))}
              disabled={publishing}
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {publishing
                ? article.wp_post_id
                  ? "재발행 중…"
                  : "처리 중…"
                : article.wp_post_id
                  ? "재발행"
                  : "워드프레스에 발행"}
            </button>
          </div>
        </div>
      </div>

      {/* 자동저장 표시 — 화면에 고정되어 스크롤을 따라다님(현재 보는 위치 우하단에 항상 보임) */}
      {(autoSavedAt || dirty || saveFailed) && (
        <div
          className={`fixed bottom-5 right-5 z-40 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-md backdrop-blur transition ${
            saveFailed
              ? "bg-red-600/90 text-white"
              : dirty
                ? "bg-neutral-900/85 text-white pointer-events-none"
                : "bg-emerald-600/90 text-white pointer-events-none"
          }`}
        >
          {saveFailed ? (
            <button onClick={save} className="font-medium">
              ⚠ 저장 실패 — 눌러서 다시 저장
            </button>
          ) : dirty ? (
            "수정 중…"
          ) : (
            `✓ 자동저장됨${autoSavedAt ? ` · ${autoSavedAt}` : ""}`
          )}
        </div>
      )}

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <span className="truncate text-xs text-neutral-400">키워드 · {article.keyword}</span>
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

        {showUpsell && !canPublish && (
          <div className="mt-4 rounded-2xl border border-[#3f91ff]/30 bg-[#3f91ff]/5 p-5">
            <p className="text-base font-semibold tracking-tight">이 글, 워드프레스에 바로 올리고 싶으세요? 🚀</p>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
              지금 쓴 이 글을 프로로 업그레이드하면 <b>버튼 하나로 워드프레스에 발행</b>돼요. 제목·메타·FAQ까지 자동으로요. 복붙은 이제 그만.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href="/pricing" className="ateflo-rainbow rounded-full px-5 py-2 text-sm font-medium text-white transition">
                프로 업그레이드 →
              </Link>
              <span className="text-xs text-neutral-400">{formatKRW(PLANS.pro.price)}/월 · 언제든 해지</span>
              <button onClick={() => setShowUpsell(false)} className="ml-auto text-xs text-neutral-400 transition hover:text-neutral-600">닫기</button>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
          <p><strong className="text-neutral-700">메타 제목:</strong> {article.meta_title}</p>
          <p className="mt-1"><strong className="text-neutral-700">메타 설명:</strong> {article.meta_description}</p>
        </div>

        <div className="mt-5">
          <ArticleEditor
            ref={editorRef}
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

        {article.write_note && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-medium text-neutral-500">이 글, 이렇게 썼어요</p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">{article.write_note}</p>
          </div>
        )}

        {article.faq.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-neutral-500">자주 묻는 질문</p>
              <button
                onClick={addFaqToBody}
                disabled={faqAdded}
                className="flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium transition hover:border-neutral-900 disabled:cursor-default disabled:border-emerald-200 disabled:text-emerald-600 disabled:opacity-100"
                title="이 질문들을 글 본문 맨 아래에 추가합니다"
              >
                {faqAdded ? "✓ 본문에 추가됨" : "＋ 글 맨 아래에 추가"}
              </button>
            </div>
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
