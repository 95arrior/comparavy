"use client";

import { useState, useEffect, useMemo } from "react";
import { photoMarkerToGuide, photoMarkerToSlot, photoSlots, markToNaverBold, addNaverSpacing } from "@/lib/photoMarkers";
import CenterToast from "./CenterToast";
import NaverPublishSheet from "./NaverPublishSheet";
import { openNaverBlogApp } from "@/lib/naverApp";
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
  onCredits,
}: {
  article: Article;
  /** 블로그 주제(vertical) — 발행 전 광고규제 표현 검사에 사용(없으면 general). */
  vertical?: string;
  onClose: () => void;
  onUpdated: (a: Article) => void;
  /** 이미지 생성 등으로 크레딧 잔액이 바뀔 때(홈 칩 동기화) */
  onCredits?: (balance: number) => void;
}) {
  const [title, setTitle] = useState(article.title);
  const [bodyHtml, setBodyHtml] = useState(article.body_html);
  const [naverOpen, setNaverOpen] = useState(false); // 네이버 복붙 발행 시트
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  // 모바일용: 제목+본문을 '한 번에' 플레인 텍스트로 복사 (앱 붙여넣기는 서식이 어차피 안 살아서 텍스트로)
  const [allCopied, setAllCopied] = useState(false);
  async function copyAllPlain() {
    try {
      const tmp = document.createElement("div");
      tmp.innerHTML = addNaverSpacing(photoMarkerToGuide(markToNaverBold(bodyHtml)));
      const text = `${title}\n\n${tmp.innerText}`;
      await navigator.clipboard.writeText(text);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2200);
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
    // ★모바일 — 무조건 네이버 블로그 '앱'으로(iOS는 naverblog:// 스킴, 미설치 시 스토어).
    //  클립보드는 건드리지 않는다(1단계에서 복사한 글 전체 보존).
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      openNaverBlogApp({ webPath: `${id}/postwrite` });
      return;
    }
    // 데스크톱 — 제목 미리 복사 후 글쓰기 새 탭
    try { navigator.clipboard?.writeText(title); } catch { /* ignore */ }
    window.open(`https://blog.naver.com/${id}/postwrite`, "_blank", "noopener");
    // 발행 완료 처리는 시트의 '다 올렸어요' 버튼으로만 — 자동 처리하면 시트가 닫혀 본문 복사를 못 함(모바일 왕복 버그)
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

  // ★AI 이미지 — 사진 자리별 무자막 일러스트 생성(장당 4크레딧, 실패 시 자동 환불).
  //  네이버 앱 업로드용으로 다운로드 → 사진 자리에 올리는 흐름(외부 이미지 붙여넣기는 네이버가 차단).
  const [imgs, setImgs] = useState<Record<number, { url?: string; busy?: boolean; err?: string }>>({});
  // 글 쓸 때 동시 생성된 이미지 이어받기(기기 저장 URL) — 재방문에도 유지
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ateflo_imgs_${article.id}`);
      if (raw) {
        const saved = JSON.parse(raw) as Record<number, string>;
        setImgs((m) => {
          const next = { ...m };
          for (const [k, v] of Object.entries(saved)) if (v) next[Number(k)] = { url: v };
          return next;
        });
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);
  async function makeImage(i: number, slot: string) {
    if (imgs[i]?.busy) return;
    setImgs((m) => ({ ...m, [i]: { ...m[i], busy: true, err: undefined } }));
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, title }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.credits === "number") onCredits?.(data.credits);
        setImgs((m) => ({ ...m, [i]: { ...m[i], busy: false, err: data.error ?? "실패했어요" } }));
        return;
      }
      if (typeof data.credits === "number") onCredits?.(data.credits);
      const finalUrl = data.url ?? data.dataUrl;
      setImgs((m) => ({ ...m, [i]: { url: finalUrl, busy: false } }));
      // URL이면 기기 저장(재방문 유지 — dataUrl은 용량상 저장 안 함)
      if (data.url) {
        try {
          const key = `ateflo_imgs_${article.id}`;
          const saved = JSON.parse(localStorage.getItem(key) ?? "{}");
          saved[i] = data.url;
          localStorage.setItem(key, JSON.stringify(saved));
        } catch { /* ignore */ }
      }
      // ★추천 문구 정리 — 만든 자리의 긴 설명을 '저장한 AI 사진 N번'으로 교체(복붙 시 안내 줄이 간결해짐)
      try {
        let idx = -1;
        const nextBody = bodyHtml.replace(/\[사진:\s*([^\]]+)\]/g, (m0) => {
          idx += 1;
          return idx === i ? `[사진: 저장한 AI 사진 ${i + 1}번]` : m0;
        });
        if (nextBody !== bodyHtml) {
          setBodyHtml(nextBody);
          void fetch(`/api/articles/${article.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body_html: nextBody }) });
        }
      } catch { /* 본문 갱신 실패해도 이미지엔 지장 없음 */ }
    } catch {
      setImgs((m) => ({ ...m, [i]: { ...m[i], busy: false, err: "네트워크 오류가 났어요" } }));
    }
  }

  // ★진짜 다운로드 — 외부 저장소 URL은 <a download>가 무시돼 새 탭이 열림 → blob으로 받아 강제 저장
  async function downloadImage(url: string, name: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(obj), 4000);
    } catch {
      window.open(url, "_blank", "noopener"); // 최후 폴백
    }
  }

  // ★본문 미리보기에 이미지 '그 자리' 반영 — n번째 사진 마커를 생성된 이미지로 치환(표시 전용, 저장 본문은 그대로)
  function previewWithImages(html: string): string {
    let idx = -1;
    const withImgs = html.replace(/\[사진:\s*([^\]]+)\]/g, (m0, d) => {
      idx += 1;
      const u = imgs[idx]?.url;
      if (!u) return m0;
      return `<img src="${u}" alt="" style="border-radius:14px;max-height:340px;object-fit:cover;width:100%;margin:0.4em 0" />`;
    });
    return photoMarkerToSlot(withImgs);
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
            className="hidden rounded-xl bg-[#03C75A] px-5 py-2.5 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-95 md:inline-block"
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

        {/* ★AI 이미지 패널 — 사진 자리별 생성/다운로드 */}
        {photoSlots(bodyHtml).length > 0 && (
          <div className="mt-4 rounded-2xl at-glass p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[14px] font-bold text-neutral-900">사진 자리 {photoSlots(bodyHtml).length}곳</p>
              <p className="text-[11.5px] text-neutral-400">AI 이미지 1장 = 4크레딧</p>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-neutral-400">직접 찍은 사진이 가장 좋아요. 없으면 AI 일러스트로 채워요 — 만들면 저장했다가 네이버에서 사진 자리에 올려요.</p>
            <div className="mt-3 space-y-2.5">
              {photoSlots(bodyHtml).map((slot, i) => {
                const st = imgs[i] ?? {};
                return (
                  <div key={i} className={`rounded-xl bg-white/70 p-3.5 ring-1 ring-black/[0.04] ${st.busy ? "at-ai-swap" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-500">{i + 1}</span>
                      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-700">{slot}</p>
                      {!st.url && (
                        <button onClick={() => makeImage(i, slot)} disabled={st.busy} className="at-press shrink-0 rounded-lg bg-[#1D75F7]/10 px-3 py-1.5 text-[12px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/15 disabled:opacity-50">
                          {st.busy ? "그리는 중…" : "AI 이미지 만들기"}
                        </button>
                      )}
                    </div>
                    {st.err && <p className="mt-2 text-[12px] font-medium text-amber-600">{st.err}</p>}
                    {st.url && (
                      <div className="mt-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={st.url} alt="" className="max-h-56 w-full rounded-lg object-cover" />
                        <div className="mt-2 flex items-center gap-2">
                          <button onClick={() => st.url && downloadImage(st.url, `ateflo-image-${i + 1}.png`)} className="at-press rounded-lg bg-[#1D75F7] px-3.5 py-2 text-[12.5px] font-bold text-white transition hover:opacity-90">저장하기</button>
                          <button onClick={() => makeImage(i, slot)} disabled={st.busy} className="at-press rounded-lg bg-neutral-100 px-3.5 py-2 text-[12.5px] font-bold text-neutral-600 transition hover:bg-neutral-200 disabled:opacity-50">
                            {st.busy ? "그리는 중…" : "다시 만들기 · 4크레딧"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs leading-relaxed text-neutral-500">
          <span aria-hidden className="mt-px">💡</span>
          <p>
            여기서는 글을 <span className="font-medium text-neutral-700">검토</span>하고 <span className="font-medium text-neutral-700">복사</span>하는 곳이에요.
            문장을 고치고 싶으면 네이버에 붙여넣은 뒤 네이버 편집기에서 자유롭게 다듬으면 돼요.
          </p>
        </div>

        <div className="prose prose-neutral mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: previewWithImages(bodyHtml) }} />

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

        {/* 네이버 발행 위저드 — 한 화면 = 한 문장 + 한 버튼 (80대 기준) */}
        {naverOpen && (
          <NaverPublishSheet
            photoCount={photoSlots(bodyHtml).length}
            copied={copied}
            allCopied={allCopied}
            onOpenNaverWrite={openNaverWrite}
            onCopyBody={copyBody}
            onCopyAll={copyAllPlain}
            onDone={markNaverPublished}
            onClose={() => setNaverOpen(false)}
          />
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
