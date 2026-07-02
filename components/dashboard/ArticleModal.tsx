"use client";

import { useState, useEffect, useMemo } from "react";
import { photoMarkerToGuide, photoMarkerToSlot, photoSlots, markToNaverBold, addNaverSpacing } from "@/lib/photoMarkers";
import CenterToast from "./CenterToast";
import { scanCompliance, applySuggestion } from "@/lib/complianceFilter";
import type { Article } from "./types";

// ★네이버 수익형 단일 — 글 화면은 '검토 → 복사 → 네이버 붙여넣기' 하나의 흐름.
// 앱 안 편집기(TipTap)·워드프레스 발행·예약은 제거. 최종 탈고는 네이버 에디터에서 한다.
// 크레딧 모델(전원 유료) — 무료/프로 구분·티저 잠금 없음.
export default function ArticleModal({
  article,
  vertical,
  onClose,
  onUpdated,
}: {
  article: Article;
  /** 블로그 주제(vertical) — 발행 전 광고규제 표현 검사에 사용(없으면 general). */
  vertical?: string;
  onClose: () => void;
  onUpdated: (a: Article) => void;
}) {
  const [title, setTitle] = useState(article.title);
  const [bodyHtml, setBodyHtml] = useState(article.body_html);
  const [naverOpen, setNaverOpen] = useState(false); // 네이버 복붙 발행 시트
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [titleCopied, setTitleCopied] = useState(false);

  // 편집 화면 열릴 때 항상 맨 위로 (작성 화면에서 스크롤 내려와 있어도)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // 토스트 자동 사라짐
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // 본문만 복사 (제목 제외 — 네이버는 제목칸이 따로라 본문에 제목이 들어가면 안 됨). 서식 유지 HTML + 평문 동시.
  async function copyBody() {
    try {
      const html = addNaverSpacing(photoMarkerToGuide(markToNaverBold(bodyHtml)));
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const text = tmp.innerText;
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

  // 제목만 복사 — 네이버 제목칸에 붙여넣기용
  async function copyTitle() {
    try {
      await navigator.clipboard.writeText(title);
      setTitleCopied(true);
      setTimeout(() => setTitleCopied(false), 1600);
    } catch { /* 무시 */ }
  }

  // 네이버 '글쓰기' 화면으로 바로 이동 — 블로그 아이디는 1회만 입력받아 저장(blog.naver.com/{id}/postwrite)
  function openNaverWrite() {
    let id = "";
    try { id = localStorage.getItem("ateflo_naver_blogid") || ""; } catch { /* ignore */ }
    if (!id) {
      const input = window.prompt("내 네이버 블로그 아이디를 입력해 주세요\n(예: blog.naver.com/myblog → myblog)");
      if (!input) return;
      id = input.trim().replace(/^https?:\/\//, "").replace(/^m\./, "").replace(/^blog\.naver\.com\//, "").replace(/[/?#].*$/, "").trim();
      if (!id) return;
      try { localStorage.setItem("ateflo_naver_blogid", id); } catch { /* ignore */ }
    }
    // ★제목을 미리 클립보드에 — 네이버 열면 커서가 '제목칸'이라 바로 붙여넣게(왕복 1번으로 줄임)
    try { navigator.clipboard?.writeText(title); setTitleCopied(true); setTimeout(() => setTitleCopied(false), 2500); } catch { /* ignore */ }
    window.open(`https://blog.naver.com/${id}/postwrite`, "_blank", "noopener");
    markNaverPublished(); // 글쓰기로 넘어가면 '발행됨'으로 표시(별도 버튼 없이 성과·내글 추적 유지)
  }

  // 네이버에 직접 올린 글을 '발행됨'으로 표시(자동발행 없는 네이버 — 성과·내글 추적용)
  async function markNaverPublished() {
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (res.ok) {
        onUpdated({ ...article, title, body_html: bodyHtml, status: "published" });
        setNaverOpen(false);
        setToast("발행 완료로 표시했어요");
      } else {
        setToast("표시하지 못했어요");
      }
    } catch { setToast("표시하지 못했어요"); }
  }

  // 발행 전 광고규제 표현 검사(주제별). 자동 차단이 아니라 경고 + 대안 제시 → 사용자가 판단.
  const compliance = useMemo(() => {
    const v = vertical ?? "general";
    const inTitle = scanCompliance(title, v).map((x) => ({ ...x, field: "title" as const }));
    const inBody = scanCompliance(bodyHtml, v).map((x) => ({ ...x, field: "body" as const }));
    return [...inTitle, ...inBody].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
  }, [title, bodyHtml, vertical]);

  // '바꾸기' — 위반 표현을 대체 표현으로 치환하고 즉시 저장(에디터 없이 문자열 치환).
  async function fixViolation(v: (typeof compliance)[number]) {
    if (!v.suggestion) return;
    const nextTitle = v.field === "title" ? applySuggestion(title, v.matched, v.suggestion) : title;
    const nextBody = v.field === "body" ? applySuggestion(bodyHtml, v.matched, v.suggestion) : bodyHtml;
    setTitle(nextTitle);
    setBodyHtml(nextBody);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle, body_html: nextBody }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.article);
        setToast(`‘${v.suggestion}’(으)로 바꿨어요`);
      } else {
        setToast("바꾸지 못했어요. 다시 시도해 주세요.");
      }
    } catch {
      setToast("바꾸지 못했어요. 다시 시도해 주세요.");
    }
  }

  return (
    <>
      {/* 상단 액션바 — 스크롤해도 따라옴 */}
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
            <span className="text-base leading-none">←</span> 목록으로
          </button>
          <button
            onClick={() => setNaverOpen(true)}
            className="rounded-xl bg-[#03C75A] px-5 py-2.5 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-95"
          >
            네이버에 올리기
          </button>
        </div>
      </div>

      {/* 저장 완료 등 토스트 — 화면 정중앙 상단(portal) */}
      <CenterToast message={toast} />

      <div className="mx-auto max-w-3xl px-3 pt-8 pb-28 sm:px-6 md:pb-8">
        <div className="flex items-center justify-between gap-4">
          <span className="truncate text-xs text-neutral-400">키워드 · {article.keyword}</span>
        </div>

        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{title}</h1>

        {compliance.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/70 p-4">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
              <p className="text-sm font-bold text-amber-900">광고 규제 표현 검토 {compliance.length}건</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-700">발행 전 확인하세요. 막진 않지만, 표현에 따라 법적 책임이 생길 수 있어요.</p>
            <ul className="mt-3 space-y-2">
              {compliance.map((v, i) => (
                <li key={i} className={`rounded-lg border bg-white px-3 py-2.5 ${v.severity === "high" ? "border-red-200" : "border-amber-200"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${v.severity === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{v.severity === "high" ? "높음" : "주의"}</span>
                    <span className="text-sm font-semibold text-neutral-900">‘{v.matched}’{v.count > 1 ? ` ×${v.count}` : ""}</span>
                    <span className="text-[11px] text-neutral-400">{v.field === "title" ? "제목" : "본문"} · {v.law}</span>
                    {v.suggestion && (
                      <button onClick={() => fixViolation(v)} className="ml-auto shrink-0 rounded-lg bg-[#1D75F7] px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90">‘{v.suggestion}’로 바꾸기</button>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">{v.reason}</p>
                  {v.note && <p className="mt-0.5 text-[11px] text-neutral-400">{v.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs leading-relaxed text-neutral-500">
          <span aria-hidden className="mt-px">💡</span>
          <p>
            여기서는 글을 <span className="font-medium text-neutral-700">검토</span>하고 <span className="font-medium text-neutral-700">복사</span>하는 곳이에요.
            문장을 고치고 싶으면 네이버에 붙여넣은 뒤 네이버 편집기에서 자유롭게 다듬으면 돼요.
          </p>
        </div>

        <div className="prose prose-neutral mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: photoMarkerToSlot(bodyHtml) }} />

        {article.write_note && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-neutral-500">이 글, 이렇게 썼어요</p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">{article.write_note}</p>
          </div>
        )}

        {article.faq.length > 0 && (
          <div className="mt-8">
            <p className="text-sm font-bold">자주 묻는 질문</p>
            <p className="mt-0.5 text-xs text-neutral-400">본문에 없는 추가 질문이에요. 필요하면 네이버에서 글 끝에 붙여도 좋아요.</p>
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

        {/* 네이버 발행 시트 v2 — 컴팩트: 큰 버튼 2개가 전부, 세부는 접힘(모바일 잘림 방지) */}
        {naverOpen && (
          <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setNaverOpen(false)}>
            <div className="ateflo-sheet-up max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
              <p className="text-[17px] font-bold text-neutral-900">네이버에 올리기</p>
              <p className="mt-1 text-[13px] text-neutral-500">두 번 붙여넣으면 끝나요.</p>

              <div className="mt-5 space-y-2.5">
                <button onClick={openNaverWrite} className="at-press w-full rounded-2xl bg-[#03C75A] px-5 py-4 text-left transition hover:opacity-95">
                  <span className="block text-[15px] font-bold text-white">1. 네이버 글쓰기 열기</span>
                  <span className="mt-0.5 block text-[12px] font-medium text-white/80">제목이 복사된 채 열려요 → 제목칸에 붙여넣기</span>
                </button>
                <button onClick={copyBody} className="at-press w-full rounded-2xl bg-[#03C75A]/10 px-5 py-4 text-left transition hover:bg-[#03C75A]/15">
                  <span className="block text-[15px] font-bold text-[#03C75A]">{copied ? "본문 복사됨 ✓" : "2. 본문 복사하기"}</span>
                  <span className="mt-0.5 block text-[12px] font-medium text-[#03C75A]/70">{copied ? "네이버 본문칸에 붙여넣으세요" : "돌아와서 누르면 → 본문칸에 붙여넣기"}</span>
                </button>
              </div>

              {photoSlots(bodyHtml).length > 0 && (
                <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-3 text-[12.5px] leading-relaxed text-neutral-500">
                  📷 사진 자리 <b className="text-neutral-700">{photoSlots(bodyHtml).length}곳</b> — 붙여넣은 뒤 표시된 자리에 사진을 올리고 그 안내 줄은 지워요. <span className="text-amber-600">직접 찍거나 무료 이미지만(저작권)</span>
                </p>
              )}

              <details className="group mt-3">
                <summary className="cursor-pointer list-none rounded-xl px-1 py-2 text-[12.5px] font-semibold text-neutral-400 transition hover:text-neutral-600">
                  자세한 순서·꿀팁 보기 <span className="inline-block transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="mt-1 space-y-1.5 rounded-xl bg-neutral-50 px-4 py-3.5 text-[12.5px] leading-relaxed text-neutral-600">
                  <p>· 붙여넣기는 <b>⌘V</b>(맥) / <b>Ctrl+V</b>(윈도우)</p>
                  <p>· <b>굵은 핵심 문장</b>을 드래그해 형광펜을 칠하면 눈에 띄어요</p>
                  <p>· <b>첫 사진</b>이 검색 썸네일 — 제일 잘 나온 걸로</p>
                  <p>· 발행 시 <b>검색 허용 등 공개 옵션 전부 ON</b> + 전체공개</p>
                  <p>· <b>태그</b>는 본문 끝 해시태그를 그대로</p>
                </div>
              </details>

              <button onClick={copyTitle} className="mt-2 w-full py-1.5 text-center text-[12px] font-medium text-neutral-400 transition hover:text-neutral-600">{titleCopied ? "제목 복사됨 ✓" : "제목만 다시 복사"}</button>
              <button onClick={() => setNaverOpen(false)} className="w-full py-1.5 text-center text-sm font-medium text-neutral-400 transition hover:text-neutral-700">닫기</button>
            </div>
          </div>
        )}

        {/* 모바일 하단 고정 CTA — 검토 → 발행 다음단계 인도 */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-100 bg-white/95 px-4 pt-2.5 backdrop-blur md:hidden" style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}>
          <button onClick={() => setNaverOpen(true)} className="w-full rounded-xl bg-[#03C75A] py-3.5 text-[15px] font-bold text-white transition active:scale-[0.99]">
            네이버에 올리기
          </button>
        </div>
      </div>
    </>
  );
}
