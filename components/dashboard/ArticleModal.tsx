"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import ArticleEditor, { type ArticleEditorHandle } from "./ArticleEditor";
import CenterToast from "./CenterToast";
import { PLANS, formatKRW } from "@/lib/plans";
import type { Article } from "./types";

export default function ArticleModal({
  article,
  wpConnected,
  canPublish,
  canEdit,
  wpCategories,
  wpTags,
  onCategoryCreated,
  onCategoryDeleted,
  onClose,
  onUpdated,
}: {
  article: Article;
  wpConnected: boolean;
  canPublish?: boolean;
  /** 편집(수정·이미지 삽입)은 프로 전용. 무료는 읽기전용 + 복사만. */
  canEdit?: boolean;
  /** 미리 불러온 워드프레스 카테고리·태그 (드롭다운 즉시 표시용) */
  wpCategories?: { id: number; name: string; count?: number }[];
  wpTags?: string[];
  onCategoryCreated?: (c: { id: number; name: string }) => void;
  onCategoryDeleted?: (id: number) => void;
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
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const editorRef = useRef<ArticleEditorHandle>(null);
  const FAQ_HEADING = "자주 묻는 질문";

  // 발행 설정: 카테고리·태그
  const [categories, setCategories] = useState<{ id: number; name: string; count?: number }[]>(wpCategories ?? []);
  const [category, setCategory] = useState(article.category ?? "");
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [catToDelete, setCatToDelete] = useState<{ id: number; name: string; count: number } | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);
  const [addToc, setAddToc] = useState(true);
  const [addInternalLinks, setAddInternalLinks] = useState(true);

  // reassignToId: 0이면 미분류로, 그 외엔 해당 카테고리로 글 옮긴 뒤 삭제
  async function deleteCategory(reassignToId: number) {
    if (!catToDelete || deletingCat) return;
    const target = catToDelete;
    setDeletingCat(true);
    try {
      const res = await fetch("/api/wordpress/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, reassignToId: reassignToId || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== target.id));
        onCategoryDeleted?.(target.id);
        if (category === target.name) {
          const moved = categories.find((c) => c.id === reassignToId);
          setCategory(moved ? moved.name : "");
        }
        setToast(`‘${target.name}’ 삭제했어요`);
        setCatToDelete(null);
      } else {
        setToast(data.error ?? "카테고리 삭제에 실패했어요.");
      }
    } catch {
      setToast("카테고리 삭제 중 오류가 났어요.");
    } finally {
      setDeletingCat(false);
    }
  }

  // '확인' → 워드프레스에 카테고리를 지금 생성(또는 기존 것 사용). 미리 여러 개 만들어 둬도 다 유지된다.
  async function confirmNewCategory() {
    const name = newCatInput.trim();
    if (!name || creatingCat) return;
    if (categories.some((c) => c.name === name)) {
      setCategory(name);
      setNewCatInput("");
      setNewCatMode(false);
      return;
    }
    setCreatingCat(true);
    try {
      const res = await fetch("/api/wordpress/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setCategories((prev) => [{ id: data.id, name: data.name }, ...prev.filter((c) => c.name !== data.name)]);
        onCategoryCreated?.({ id: data.id, name: data.name });
        setCategory(data.name);
        setNewCatInput("");
        setNewCatMode(false);
        setToast(`카테고리 ‘${data.name}’ 만들었어요`);
      } else {
        setToast(data.error ?? "카테고리 생성에 실패했어요.");
      }
    } catch {
      setToast("카테고리 생성 중 오류가 났어요.");
    } finally {
      setCreatingCat(false);
    }
  }
  const [tags, setTags] = useState<string[]>(Array.isArray(article.tags) ? article.tags : []);
  const [existingTags, setExistingTags] = useState<string[]>(wpTags ?? []);

  // 카테고리·태그는 대시보드에서 미리 불러온 값을 props로 받아 즉시 표시한다.
  // (대시보드 로딩이 모달 오픈보다 늦게 끝난 경우에도 반영되도록, 로컬에서 만든 항목은 보존하며 병합)
  useEffect(() => {
    if (wpCategories && wpCategories.length) {
      setCategories((prev) => {
        const merged = [...wpCategories];
        for (const c of prev) if (!merged.some((m) => m.name === c.name)) merged.push(c);
        return merged;
      });
    }
  }, [wpCategories]);
  useEffect(() => {
    if (wpTags && wpTags.length) setExistingTags(wpTags);
  }, [wpTags]);

  const [aiSuggested, setAiSuggested] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  // AI 태그 추천은 글당 1회. 한 번 누르면 이 기기에서 영구 비활성(새로고침·재방문해도 유지) → 크레딧 낭비 방지.
  const aiUsedKey = `ateflo_ai_tags_${article.id}`;
  const [aiUsed, setAiUsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(aiUsedKey) === "1";
  });

  // 이 글 내용을 분석해 태그 추천 (기존 글 포함). 크레딧 절약 위해 글당 1회만 호출.
  async function suggestTags() {
    if (aiUsed || suggesting) return;
    // 클릭 즉시 영구 비활성 (한 번 누르면 모델 호출=크레딧 → 무조건 1회로 제한)
    setAiUsed(true);
    if (typeof window !== "undefined") localStorage.setItem(aiUsedKey, "1");
    setSuggesting(true);
    try {
      const res = await fetch(`/api/articles/${article.id}/suggest-tags`, { method: "POST" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.tags)) {
        setAiSuggested(data.tags);
        if (!data.tags.length) setToast("추천할 태그를 찾지 못했어요.");
      } else {
        setToast(data.error ?? "태그 추천에 실패했어요.");
      }
    } catch {
      setToast("태그 추천 중 오류가 났어요.");
    } finally {
      setSuggesting(false);
    }
  }

  // 토스트 자동 사라짐
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // 본문(HTML)에 들어있는 H3(=FAQ 질문) 텍스트 집합. 추가/제거 버튼 상태의 '진짜 기준'.
  // → 새로고침해도 저장된 본문 기준으로 정확히 표시되고, 저장 안 됐으면 다시 '추가'로 보인다.
  const faqInBody = useMemo(() => {
    if (typeof window === "undefined") return new Set<string>();
    const doc = new DOMParser().parseFromString(bodyHtml, "text/html");
    const set = new Set<string>();
    doc.querySelectorAll("h3").forEach((h) => set.add((h.textContent || "").trim()));
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyHtml]);

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // FAQ 한 개를 본문 맨 아래에 추가 (방문자에게 보이는 자주 묻는 질문 섹션).
  function addFaqItem(i: number) {
    const f = article.faq[i];
    if (!f) return;
    // 현재 본문에 FAQ가 하나도 없으면 '자주 묻는 질문' 제목(H2)을 한 번만 넣는다.
    const anyFaq = article.faq.some((x) => faqInBody.has(x.question.trim()));
    const header = anyFaq ? "" : `<h2>${FAQ_HEADING}</h2>`;
    editorRef.current?.appendContent(`${header}<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`);
  }

  // 추가했던 FAQ 한 개를 본문에서 제거 (해당 H3 + 다음 P, FAQ가 다 빠지면 제목 H2도 제거).
  function removeFaqItem(i: number) {
    const f = article.faq[i];
    if (!f) return;
    const html = editorRef.current?.getHTML() ?? bodyHtml;
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("h3").forEach((h) => {
      if ((h.textContent || "").trim() === f.question.trim()) {
        const next = h.nextElementSibling;
        if (next && next.tagName === "P") next.remove();
        h.remove();
      }
    });
    // 남은 FAQ가 없으면 '자주 묻는 질문' 제목도 제거
    const remaining = new Set<string>();
    doc.querySelectorAll("h3").forEach((h) => remaining.add((h.textContent || "").trim()));
    if (!article.faq.some((x) => remaining.has(x.question.trim()))) {
      doc.querySelectorAll("h2").forEach((h) => {
        if ((h.textContent || "").trim() === FAQ_HEADING) h.remove();
      });
    }
    editorRef.current?.setHTML(doc.body.innerHTML);
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

  const tagsChanged = JSON.stringify(tags) !== JSON.stringify(Array.isArray(article.tags) ? article.tags : []);
  const categoryChanged = category !== (article.category ?? "");
  const dirty =
    title !== article.title ||
    bodyHtml !== article.body_html ||
    featured !== (article.featured_image ?? null) ||
    tagsChanged ||
    categoryChanged;

  // 편집 화면 열릴 때 항상 맨 위로 (작성 화면에서 스크롤 내려와 있어도)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // 모달을 닫을 때(언마운트) 아직 자동저장 안 된 변경이 있으면 즉시 저장한다.
  // (자동저장 3초가 차기 전에 목록으로 나가면 변경이 사라지던 문제 방지 — keepalive로 언마운트 중에도 전송 완료)
  const flushRef = useRef<{ id: string; payload: Record<string, unknown>; dirty: boolean; canEdit: boolean }>({
    id: article.id,
    payload: {},
    dirty: false,
    canEdit: Boolean(canEdit),
  });
  flushRef.current = {
    id: article.id,
    payload: { title, body_html: bodyHtml, featured_image: featured, tags, category },
    dirty,
    canEdit: Boolean(canEdit),
  };
  useEffect(() => {
    return () => {
      const f = flushRef.current;
      if (!f.canEdit || !f.dirty) return;
      try {
        fetch(`/api/articles/${f.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(f.payload),
          keepalive: true,
        });
      } catch {
        // 무시 (최선 노력)
      }
    };
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
          body: JSON.stringify({ title, body_html: currentBody(), featured_image: featured, tags, category }),
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
  }, [title, bodyHtml, featured, tags, category]);

  // 저장 시점의 '진짜 최신' 본문 — React 상태가 한 박자 늦더라도 에디터에서 직접 읽어 누락을 막는다.
  function currentBody(): string {
    return editorRef.current?.getHTML() ?? bodyHtml;
  }

  // 예약 최소 시각(지금) — datetime-local 형식 YYYY-MM-DDTHH:mm
  function minScheduleAt(): string {
    const d = new Date(Date.now() + 60000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
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
        body: JSON.stringify({ title, body_html: liveBody, featured_image: featured, tags, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장하지 못했어요. 다시 시도해 주세요.");
        return;
      }
      onUpdated(data.article);
      setSaveFailed(false);
      setAutoSavedAt(new Date().toLocaleTimeString("ko-KR"));
      setToast("저장했어요.");
    } catch {
      setError("저장 중 오류가 났어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function publish(status: "draft" | "publish" | "future", date?: string) {
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
        body: JSON.stringify({ title, body_html: liveBody, featured_image: featured, tags, category }),
      });
      if (!saveRes.ok) {
        setError("편집 내용 저장에 실패해 발행을 멈췄어요. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const res = await fetch("/api/wordpress/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id, status, category, tags, date, addToc, addInternalLinks }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "발행하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      onUpdated({
        ...article,
        title,
        body_html: bodyHtml,
        status: status === "publish" ? "published" : status === "future" ? "future" : "draft",
        wp_link: data.link ?? article.wp_link,
        // 발행된 워드프레스 글 ID 저장 → 다음 발행은 같은 글을 수정(재발행), 버튼도 "재발행"으로 전환
        wp_post_id: data.postId ?? article.wp_post_id,
      });
      setMessage(
        status === "future"
          ? `예약했어요. ${date ? new Date(date).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : ""}에 자동 발행돼요.`
          : status === "publish"
            ? isRepublish
              ? "수정한 내용을 워드프레스에 다시 반영했어요."
              : "워드프레스에 발행했어요."
            : "워드프레스에 초안으로 저장했어요.",
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
            <Link href="/pricing" className="rounded-xl bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700">
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
              <div className="w-full max-w-sm rounded-2xl border border-neutral-100 bg-white shadow-sm p-5 text-center shadow-xl">
                <p className="text-base font-semibold tracking-tight">여기부터는 프로 회원만 볼 수 있어요</p>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                  프로로 업그레이드하면 이 글 전체가 열리고, 매달 30편까지 5,000자 깊이로 쓰고 워드프레스에 바로 발행할 수 있어요.
                </p>
                <Link
                  href="/pricing"
                  className="ateflo-rainbow mt-4 inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-white transition"
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

  // 무료 플랜: 읽기전용. AI가 쓴 글을 '복사'해서 블로그에 붙여넣는 것까지만.
  // 편집(수정·이미지 삽입)과 워드프레스 발행은 프로 전용 → 프로 결제 유도.
  if (!canEdit) {
    return (
      <>
        {toast && <CenterToast>{toast}</CenterToast>}
        <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
            <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
              <span className="text-base leading-none">←</span> 목록으로
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => {
                  copyBody();
                  setToast("복사했어요. 블로그에 붙여넣어 보세요.");
                }}
                className="rounded-xl border border-neutral-300 px-4 py-1.5 text-sm font-medium transition hover:border-neutral-900"
              >
                {copied ? "복사됨 ✓" : "복사"}
              </button>
              <Link
                href="/pricing"
                className="rounded-xl bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                프로로 편집하기
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 py-8">
          <span className="truncate text-xs text-neutral-400">키워드 · {article.keyword}</span>
          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{article.title}</h1>

          <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-500">
            <p><strong className="text-neutral-700">메타 제목:</strong> {article.meta_title}</p>
            <p className="mt-1"><strong className="text-neutral-700">메타 설명:</strong> {article.meta_description}</p>
          </div>

          {/* 편집 유도 안내 */}
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-900">글 수정·이미지 넣기·워드프레스 발행</span>은 프로 기능이에요. 지금은 복사해서 블로그에 붙여넣을 수 있어요.
            </p>
            <Link
              href="/pricing"
              className="ateflo-rainbow shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
            >
              프로 업그레이드 →
            </Link>
          </div>

          <div className="prose prose-neutral mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: article.body_html }} />

          {article.faq.length > 0 && (
            <div className="mt-8">
              <p className="text-sm font-bold">자주 묻는 질문</p>
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

  return (
    <>
      {/* 상단 액션바 — 스크롤해도 따라옴 */}
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
            <span className="text-base leading-none">←</span> 목록으로
          </button>
          <div className="relative flex shrink-0 items-center gap-2">
            <button
              onClick={copyBody}
              title="복사"
              className="rounded-xl border border-neutral-300 px-4 py-1.5 text-sm font-medium transition hover:border-neutral-900"
            >
              {copied ? "복사됨 ✓" : "복사"}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl border border-neutral-300 px-4 py-1.5 text-sm font-medium transition hover:border-neutral-900 disabled:opacity-40"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
            {canPublish && (
              <button
                onClick={() => setScheduleOpen((o) => !o)}
                disabled={publishing}
                title="예약 발행"
                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition disabled:opacity-50 ${scheduleOpen ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600 hover:border-neutral-900"}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              </button>
            )}
            <button
              onClick={() => (canPublish ? publish("publish") : setShowUpsell(true))}
              disabled={publishing}
              className="rounded-xl bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {publishing
                ? article.wp_post_id
                  ? "재발행 중…"
                  : "처리 중…"
                : article.wp_post_id
                  ? "재발행"
                  : "발행"}
            </button>

            {scheduleOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setScheduleOpen(false)} />
                <div className="ateflo-dropdown absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 shadow-xl">
                  <p className="text-sm font-semibold">예약 발행</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">정한 시간에 워드프레스로 자동 발행돼요. 출퇴근길에 미리 예약해두세요.</p>
                  <input
                    type="datetime-local"
                    min={minScheduleAt()}
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="mt-3 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        if (!scheduleAt) return;
                        const date = scheduleAt.length === 16 ? `${scheduleAt}:00` : scheduleAt;
                        setScheduleOpen(false);
                        publish("future", date);
                      }}
                      disabled={!scheduleAt || publishing}
                      className="flex-1 rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40"
                    >
                      {publishing ? "예약 중…" : "예약하기"}
                    </button>
                    <button
                      onClick={() => setScheduleOpen(false)}
                      className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm transition hover:border-neutral-900"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 저장 완료 등 토스트 — 화면 정중앙 상단(portal) */}
      {toast && <CenterToast>{toast}</CenterToast>}

      {/* 자동저장 표시 — 화면에 고정되어 스크롤을 따라다님(현재 보는 위치 우하단에 항상 보임) */}
      {(autoSavedAt || dirty || saveFailed) && (
        <div
          className={`fixed bottom-5 right-5 z-40 rounded-lg px-3.5 py-1.5 text-xs font-medium shadow-md backdrop-blur transition ${
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
              <Link href="/pricing" className="ateflo-rainbow rounded-lg px-5 py-2 text-sm font-medium text-white transition">
                프로 업그레이드 →
              </Link>
              <span className="text-xs text-neutral-400">{formatKRW(PLANS.pro.price)}/월 · 언제든 해지</span>
              <button onClick={() => setShowUpsell(false)} className="ml-auto text-xs text-neutral-400 transition hover:text-neutral-600">닫기</button>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-500">
          <p><strong className="text-neutral-700">메타 제목:</strong> {article.meta_title}</p>
          <p className="mt-1"><strong className="text-neutral-700">메타 설명:</strong> {article.meta_description}</p>
        </div>

        {/* 발행 설정: 카테고리 · 태그 (SEO) */}
        {wpConnected && (() => {
          // 추천(눌러서 추가)은 한 곳으로 모은다: AI 추천 먼저, 그다음 이미 쓰던 태그. 이미 담긴 건 제외·중복 제거.
          const suggestions = Array.from(new Set([...aiSuggested, ...existingTags])).filter((t) => !tags.includes(t));
          // 드롭다운 옵션: WP에서 가져온 목록 + 현재 선택값(아직 WP에 없는 새 카테고리 포함) → 다시 열어도 안 사라짐
          return (
            <div className="mt-4 rounded-2xl border border-neutral-100 bg-white shadow-sm p-5">
              <p className="text-[15px] font-semibold tracking-tight">발행 설정</p>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">카테고리와 태그를 정하면 검색에 더 잘 잡혀요.</p>

              {/* 카테고리 */}
              <div className={`mt-5 ${catOpen ? "relative z-50" : ""}`}>
                <label className="text-[13px] font-medium text-neutral-700">카테고리</label>
                {newCatMode ? (
                  <div className="ateflo-fade-in mt-2 flex items-center gap-2">
                    <input
                      value={newCatInput}
                      autoFocus
                      onChange={(e) => setNewCatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmNewCategory(); } }}
                      placeholder="새 카테고리 이름 (예: 강아지 건강)"
                      className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-neutral-900"
                    />
                    <button
                      onClick={confirmNewCategory}
                      disabled={!newCatInput.trim() || creatingCat}
                      className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-30"
                    >
                      {creatingCat ? "생성 중…" : "확인"}
                    </button>
                    <button
                      onClick={() => { setNewCatMode(false); setNewCatInput(""); }}
                      disabled={creatingCat}
                      className="shrink-0 rounded-lg px-1.5 py-1.5 text-[13px] text-neutral-400 transition hover:text-neutral-700 disabled:opacity-40"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="ateflo-fade-in">
                    {/* 커스텀 드롭다운: 클릭 즉시 아래로 부드럽게 펼쳐지고, 셀렉박스를 가리지 않음 */}
                    <div className={`relative mt-2 ${catOpen ? "z-50" : ""}`}>
                      <button
                        type="button"
                        onClick={() => setCatOpen((o) => !o)}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-3 text-left text-sm outline-none transition ${catOpen ? "border-neutral-900 ring-2 ring-neutral-900/5" : "border-neutral-300 hover:border-neutral-400"}`}
                      >
                        <span className={category ? "text-neutral-900" : "text-neutral-400"}>{category || "분류 선택 안 함"}</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-neutral-400 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                      {catOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => { setCatOpen(false); setCatToDelete(null); }} />
                          <div className="ateflo-dropdown absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-auto rounded-2xl border border-neutral-100 bg-white shadow-sm p-1.5 shadow-xl">
                            {catToDelete ? (
                              /* 삭제 확인 — 옮길 곳을 누르면 옮기고 삭제 (네이티브 셀렉트 없이 같은 리스트 스타일) */
                              <div>
                                <div className="px-2.5 py-2">
                                  <p className="text-sm font-semibold text-neutral-900">‘{catToDelete.name}’ 삭제</p>
                                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                                    {catToDelete.count > 0
                                      ? `이 분류의 글 ${catToDelete.count}개를 어디로 옮길까요? 고르면 옮기고 삭제해요.`
                                      : "글이 없어 바로 삭제할 수 있어요."}
                                  </p>
                                </div>
                                {catToDelete.count > 0 ? (
                                  <>
                                    {categories.filter((c) => c.id !== catToDelete.id).map((c) => (
                                      <button
                                        key={c.id}
                                        type="button"
                                        disabled={deletingCat}
                                        onClick={() => deleteCategory(c.id)}
                                        className="block w-full rounded-lg px-2.5 py-2.5 text-left text-sm text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-50"
                                      >
                                        <span className="font-medium">{c.name}</span><span className="text-neutral-400">(으)로 옮기고 삭제</span>
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      disabled={deletingCat}
                                      onClick={() => deleteCategory(0)}
                                      className="block w-full rounded-lg px-2.5 py-2 text-left text-xs text-neutral-400 transition hover:bg-neutral-100 disabled:opacity-50"
                                    >
                                      미분류로 보내고 삭제 (비추천)
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={deletingCat}
                                    onClick={() => deleteCategory(0)}
                                    className="block w-full rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                  >
                                    {deletingCat ? "삭제 중…" : "삭제"}
                                  </button>
                                )}
                                <div className="my-1 h-px bg-neutral-100" />
                                <button
                                  type="button"
                                  disabled={deletingCat}
                                  onClick={() => setCatToDelete(null)}
                                  className="block w-full rounded-lg px-2.5 py-2.5 text-left text-sm text-neutral-500 transition hover:bg-neutral-100 disabled:opacity-50"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => { setCategory(""); setCatOpen(false); }}
                                  className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-neutral-100 ${!category ? "font-medium" : "text-neutral-500"}`}
                                >
                                  분류 선택 안 함
                                </button>
                                {categories.map((c) => (
                                  <div key={c.id} className={`group flex items-center rounded-lg transition ${category === c.name ? "bg-neutral-50" : "hover:bg-neutral-100"}`}>
                                    <button
                                      type="button"
                                      onClick={() => { setCategory(c.name); setCatOpen(false); }}
                                      className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm ${category === c.name ? "font-medium text-neutral-900" : "text-neutral-800"}`}
                                    >
                                      {category === c.name
                                        ? <span className="shrink-0 text-emerald-600">✓</span>
                                        : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />}
                                      <span className="truncate">{c.name}</span>
                                      {typeof c.count === "number" && c.count > 0 && (
                                        <span className="ml-auto shrink-0 rounded-full bg-neutral-100 px-1.5 text-xs text-neutral-400">{c.count}</span>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCatToDelete({ id: c.id, name: c.name, count: c.count ?? 0 })}
                                      title="이 카테고리 삭제"
                                      className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-300 transition hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"
                                    >
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                                    </button>
                                  </div>
                                ))}
                                {category && !categories.some((c) => c.name === category) && (
                                  <button
                                    type="button"
                                    onClick={() => setCatOpen(false)}
                                    className="flex w-full items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-left text-sm font-medium text-neutral-900"
                                  >
                                    <span className="shrink-0 text-emerald-600">✓</span>
                                    <span className="truncate">{category}</span>
                                  </button>
                                )}
                                <div className="my-1 h-px bg-neutral-100" />
                                <button
                                  type="button"
                                  onClick={() => { setNewCatMode(true); setCatOpen(false); }}
                                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-500 transition hover:bg-neutral-100"
                                >
                                  ＋ 새 카테고리 만들기
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <p className={`mt-2 text-xs ${category ? "text-emerald-600" : "text-amber-500"}`}>
                      {category ? `‘${category}’ 분류로 발행돼요` : "미선택 시 ‘미분류’로 올라가요. 정해두면 검색에 유리해요."}
                    </p>
                  </div>
                )}
              </div>

              <div className="my-5 h-px bg-neutral-100" />

              {/* 태그 */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[13px] font-medium text-neutral-700">태그</label>
                  <button
                    onClick={suggestTags}
                    disabled={suggesting || aiUsed || tags.length >= 8}
                    className="flex items-center gap-1 rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-neutral-900 disabled:border-neutral-200 disabled:text-neutral-300"
                  >
                    {suggesting ? "분석 중…" : aiUsed ? "✓ 추천 완료" : "✨ AI 태그 추천"}
                  </button>
                </div>

                {/* 선택된 태그 (추천을 누르면 여기로 모임). 직접 입력 없이 추천으로만 채운다. */}
                <div className="mt-2 flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50/60 px-3 py-2.5">
                  {tags.length === 0 ? (
                    <span className="px-1 text-sm text-neutral-400">아래 추천에서 골라 담아주세요</span>
                  ) : (
                    tags.map((t) => (
                      <span key={t} className="ateflo-chip-in inline-flex items-center gap-1 rounded-xl bg-neutral-900 py-1 pl-2.5 pr-1.5 text-xs font-medium text-white">
                        {t}
                        <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="flex h-4 w-4 items-center justify-center rounded-full text-white/60 transition hover:bg-white/20 hover:text-white" aria-label="태그 삭제">×</button>
                      </span>
                    ))
                  )}
                </div>
                <p className="mt-1.5 text-xs text-neutral-400">{tags.length}/8개 · 3~5개를 권장해요</p>

                {/* 추천 (눌러서 위 칸에 추가) — AI + 기존 태그를 한 곳에 */}
                {suggestions.length > 0 && tags.length < 8 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-neutral-500">
                      {aiUsed ? "추천 태그 · 눌러서 추가" : "이미 쓰던 태그 · 눌러서 추가"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {suggestions.slice(0, 14).map((t) => {
                        const fromAi = aiSuggested.includes(t);
                        return (
                          <button
                            key={t}
                            onClick={() => setTags((prev) => (prev.length >= 8 || prev.includes(t) ? prev : [...prev, t]))}
                            className={`ateflo-chip-in rounded-xl border px-2.5 py-1 text-xs transition ${
                              fromAi
                                ? "border-neutral-900/15 bg-neutral-900/[0.04] font-medium text-neutral-800 hover:border-neutral-900"
                                : "border-dashed border-neutral-300 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900"
                            }`}
                          >
                            {fromAi && <span className="mr-0.5">✨</span>}＋ {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="my-5 h-px bg-neutral-100" />

              {/* 발행 옵션: 목차 · 내부 링크 */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-neutral-800">목차 자동 추가</p>
                    <p className="mt-0.5 text-xs text-neutral-400">소제목으로 목차를 만들어요. 가독성·체류시간↑</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={addToc}
                    onClick={() => setAddToc((v) => !v)}
                    className={`relative h-6 w-10 shrink-0 rounded-full transition ${addToc ? "bg-neutral-900" : "bg-neutral-300"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${addToc ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-neutral-800">관련 글 자동 링크</p>
                    <p className="mt-0.5 text-xs text-neutral-400">내가 쓴 다른 글로 연결해 SEO·체류 강화</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={addInternalLinks}
                    onClick={() => setAddInternalLinks((v) => !v)}
                    className={`relative h-6 w-10 shrink-0 rounded-full transition ${addInternalLinks ? "bg-neutral-900" : "bg-neutral-300"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${addInternalLinks ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs leading-relaxed text-neutral-500">
          <span aria-hidden className="mt-px">💡</span>
          <p>
            여기서는 <span className="font-medium text-neutral-700">글의 구조와 내용</span>을 다듬는 곳이에요. 제목·소제목·목록·이미지 배치는 그대로 발행돼요.
            다만 <span className="font-medium text-neutral-700">실제 색·폰트·간격은 연결한 블로그 테마</span>를 따라가서, 미리보기와 조금 다르게 보일 수 있어요.
          </p>
        </div>

        <div className="mt-3">
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
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-neutral-500">이 글, 이렇게 썼어요</p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">{article.write_note}</p>
          </div>
        )}

        {article.faq.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-neutral-500">자주 묻는 질문</p>
            <p className="mt-1 text-xs text-neutral-400">＋ 버튼으로 원하는 질문만 골라 글 맨 아래에 추가할 수 있어요. (추가한 질문은 ‘제거’로 다시 뺄 수 있어요)</p>
            <ul className="mt-2 space-y-2">
              {article.faq.map((f, i) => {
                const added = faqInBody.has(f.question.trim());
                return (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{f.question}</p>
                      <p className="mt-1 text-neutral-600">{f.answer}</p>
                    </div>
                    {added ? (
                      <button
                        onClick={() => removeFaqItem(i)}
                        className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:border-red-400"
                        title="이 질문을 본문에서 제거"
                      >
                        － 제거
                      </button>
                    ) : (
                      <button
                        onClick={() => addFaqItem(i)}
                        className="shrink-0 rounded-xl border border-neutral-300 px-3 py-1 text-xs font-medium transition hover:border-neutral-900"
                        title="이 질문을 글 본문 맨 아래에 추가"
                      >
                        ＋ 추가
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

      </div>
    </>
  );
}
