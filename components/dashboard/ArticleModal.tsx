"use client";

import { useState, useEffect, useMemo } from "react";
import { photoMarkerToGuide, photoMarkerToSlot, photoSlots, markToNaverBold, addNaverSpacing } from "@/lib/photoMarkers";
import { formatBody, parseSlots } from "@/lib/publishHtml";
import { AI_IMAGES_ENABLED, DATA_CARDS_ENABLED } from "@/config/publish";
import { IMAGE_COST } from "@/lib/creditPacks";
import CenterToast from "./CenterToast";
import { copyImage as clipCopyImage, saveImage as clipSaveImage } from "@/lib/clipboard";
import NaverPublishSheet from "./NaverPublishSheet";
import ThumbMakerSheet from "./ThumbMakerSheet";
import { openNaverBlogApp } from "@/lib/naverApp";
import { scanCompliance, applySuggestion } from "@/lib/complianceFilter";
import type { Article } from "./types";

// ★네이버 수익형 단일 — 글 화면은 '검토 → 복사 → 네이버 붙여넣기' 하나의 흐름.
// 앱 안 편집기(TipTap)·워드프레스 발행·예약은 제거. 최종 탈고는 네이버 에디터에서 한다.
// 크레딧 모델(전원 유료) — 무료/프로 구분·티저 잠금 없음.
export default function ArticleModal({
  article,
  vertical,
  naverBlogId,
  onClose,
  onUpdated,
  onPublished,
  onCredits,
}: {
  article: Article;
  /** 블로그 주제(vertical) — 발행 전 광고규제 표현 검사에 사용(없으면 general). */
  vertical?: string;
  /** 프로필의 네이버 블로그 아이디 — 글쓰기 직행·발행 검증에 사용 */
  naverBlogId?: string | null;
  onClose: () => void;
  onUpdated: (a: Article) => void;
  /** 발행 완료 표시 후 — 모달 닫고 글 목록으로(상위에서 처리) */
  onPublished?: () => void;
  /** 이미지 생성 등으로 크레딧 잔액이 바뀔 때(홈 칩 동기화) */
  onCredits?: (balance: number) => void;
}) {
  const [title, setTitle] = useState(article.title);
  const [bodyHtml, setBodyHtml] = useState(article.body_html);
  const [naverOpen, setNaverOpen] = useState(false); // 네이버 복붙 발행 시트
  // ★제목 2안 — 클릭형(title) / 검색형(meta_title). 다르면 탭으로 고르고, 발행 흐름 전체가 선택본을 쓴다.
  const titleAlt = (article.meta_title ?? "").trim();
  const hasTwoTitles = !!titleAlt && titleAlt !== (article.title ?? "").trim();
  const [titlePick, setTitlePick] = useState<"click" | "search">("click");
  const pubTitle = titlePick === "search" && hasTwoTitles ? titleAlt : title;
  // ★인라인 수정(오타 수준) — 미리보기 문단 탭 → 시트에서 고침. 원문 매칭 실패 시 네이버 수정 안내.
  const [editSeg, setEditSeg] = useState<null | { original: string; value: string }>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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

  // 네이버 '글쓰기' 화면으로 바로 이동 — 블로그 아이디는 1회만 입력받아 저장(blog.naver.com/{id}/postwrite)
  function openNaverWrite() {
    // ★열기 주소 수리(실측 2026-07-05): blog.naver.com/{id}/postwrite가 404('없는 게시물')로 변경됨.
    //  공식 진입 GoBlogWrite.naver = 로그인한 내 블로그 에디터로 자동 이동 — blogId 입력 자체가 불필요.
    //  클립보드는 절대 건드리지 않는다(본문 복사 보존 — 덮어쓰기 버그 2회 재발 지점).
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // 모바일 — 네이버 블로그 '앱' 우선(iOS 스킴), 안드로이드 웹 폴백도 에디터 진입으로.
      openNaverBlogApp({ webPath: "GoBlogWrite.naver" });
      return;
    }
    window.open("https://blog.naver.com/GoBlogWrite.naver", "_blank", "noopener");
    // 발행 완료 처리는 시트의 '다 올렸어요' 버튼으로만 — 자동 처리하면 시트가 닫혀 본문 복사를 못 함(모바일 왕복 버그)
  }

  // 네이버에 직접 올린 글을 '발행됨'으로 표시(자동발행 없는 네이버 — 성과·내글 추적용)
  async function markNaverPublished() {
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending_verify" }), // ★RSS 검증 모델 — 신고=pending, verified는 서버(RSS 매칭)만 부여
      });
      if (res.ok) {
        // 즉시 1차 검증(발행 직후 RSS에 대부분 반영) — 실패해도 크론이 10분×6 재시도
        let blogId = ""; try { blogId = localStorage.getItem("ateflo_naver_blogid") ?? ""; } catch { /* ignore */ }
        void fetch("/api/verify-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId: article.id, blogId }) })
          .then((r) => r.json()).then((d) => { if (d.state === "verified") setToast("네이버 발행 확인됐어요"); }).catch(() => { /* 크론 몫 */ });
        onUpdated({ ...article, title, body_html: bodyHtml, status: "pending_verify" });
        try { const { localPubFlagKey } = await import("@/lib/course"); localStorage.setItem(localPubFlagKey(), "1"); } catch { /* ignore */ }
        setNaverOpen(false);
        setToast("발행 완료로 표시했어요");
        onPublished?.();
      } else {
        setToast("표시하지 못했어요");
      }
    } catch { setToast("표시하지 못했어요"); }
  }

  // ★AI 이미지 — 사진 자리별 무자막 일러스트 생성(장당 4크레딧, 실패 시 자동 환불).
  //  네이버 앱 업로드용으로 다운로드 → 사진 자리에 올리는 흐름(외부 이미지 붙여넣기는 네이버가 차단).
  const [imgs, setImgs] = useState<Record<number, { url?: string; busy?: boolean; err?: string }>>({});
  // 이미지 로드 — ★서버(article.images, 계정 저장)가 진실 + 기기(localStorage) 병합. 기기에만 있던 건 서버로 승격(1회).
  useEffect(() => {
    const server: Record<string, string> = (article.images as Record<string, string>) ?? {};
    let local: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(`ateflo_imgs_${article.id}`);
      if (raw) local = JSON.parse(raw);
    } catch { /* ignore */ }
    const combined = { ...local, ...server }; // 서버 우선
    if (Object.keys(combined).length > 0) {
      setImgs((m) => {
        const next = { ...m };
        for (const [k, v] of Object.entries(combined)) if (v) next[Number(k)] = { url: v };
        return next;
      });
    }
    // 기기에만 있고 서버에 없는 건 승격 → 다른 기기에서도 보이게
    const promote: Record<string, string> = {};
    for (const [k, v] of Object.entries(local)) if (v && !server[k]) promote[k] = v;
    if (Object.keys(promote).length > 0) {
      void fetch(`/api/articles/${article.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: promote }) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);
  // ★썸네일 3초 훅 문구 추천(무료) — 유저가 직접 만드는 썸네일용. 탭=복사.
  const [thumbCopies, setThumbCopies] = useState<string[] | null>(null);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [thumbMakerOpen, setThumbMakerOpen] = useState(false);
  const [lastThumb, setLastThumb] = useState<string | null>(null); // 시트 닫아도 생성물 보존
  async function fetchThumbCopies() {
    if (thumbBusy) return;
    setThumbBusy(true);
    try {
      const r = await fetch("/api/thumb-copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId: article.id }) });
      const d = await r.json();
      if (r.ok && Array.isArray(d.copies)) setThumbCopies(d.copies);
      else setToast(d.error ?? "문구를 만들지 못했어요");
    } catch { setToast("문구를 만들지 못했어요"); }
    setThumbBusy(false);
  }

  async function makeImage(i: number, slot: string) {
    if (imgs[i]?.busy) return;
    setImgs((m) => ({ ...m, [i]: { ...m[i], busy: true, err: undefined } }));
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, title, thumb: i === 0, articleId: article.id, idx: i }),
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
    } catch {
      setImgs((m) => ({ ...m, [i]: { ...m[i], busy: false, err: "네트워크 오류가 났어요" } }));
    }
  }

  // ★사진 올리기(AI 봉인 대체) — 문서순 슬롯 idx로 업로드 → 미리보기·복사 HTML에 포함.
  async function uploadImage(i: number, file: File) {
    if (imgs[i]?.busy) return;
    setImgs((m) => ({ ...m, [i]: { ...m[i], busy: true, err: undefined } }));
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("articleId", article.id); fd.append("idx", String(i));
      const res = await fetch("/api/images/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) { setImgs((m) => ({ ...m, [i]: { ...m[i], busy: false, err: data.error ?? "업로드하지 못했어요" } })); return; }
      setImgs((m) => ({ ...m, [i]: { url: data.url, busy: false } }));
      try { const key = `ateflo_imgs_${article.id}`; const saved = JSON.parse(localStorage.getItem(key) ?? "{}"); saved[i] = data.url; localStorage.setItem(key, JSON.stringify(saved)); } catch { /* ignore */ }
    } catch { setImgs((m) => ({ ...m, [i]: { ...m[i], busy: false, err: "네트워크 오류가 났어요" } })); }
  }

  // 이미지 복사·저장은 lib/clipboard로 일원화. 여기선 UI 피드백만.
  const [imgCopied, setImgCopied] = useState<number | null>(null);
  async function copyImageAt(i: number, url: string) {
    const ok = await clipCopyImage(url);
    if (ok) {
      setImgCopied(i);
      setTimeout(() => setImgCopied((c) => (c === i ? null : c)), 2500);
    } else {
      void clipSaveImage(url, `ateflo-image-${i + 1}.png`); // 미지원 → 저장 폴백
    }
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

        {hasTwoTitles ? (
          <div className="mt-3">
            <div className="flex gap-1.5">
              {([["click", "클릭형"], ["search", "검색형"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setTitlePick(k)}
                  className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${titlePick === k ? "tk-grad-cta text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{label}</button>
              ))}
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{pubTitle}</h1>
          </div>
        ) : (
          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        )}

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
                      <button onClick={() => fixViolation(v)} className="ml-auto shrink-0 rounded-lg tk-grad-cta px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90">‘{v.suggestion}’로 바꾸기</button>
                    )}


                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">{v.reason}</p>
                  {v.note && <p className="mt-0.5 text-[11px] text-neutral-400">{v.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ★이미지 슬롯 패널 — 문서순(사진+카드). 사진=추천 가이드+올리기(AI 봉인), 카드=자동 생성. */}
        {parseSlots(bodyHtml).length > 0 && (<>
          {/* 썸네일 문구 추천 — 3초 훅(어그로되 글이 답하는 약속만) */}
          <div className="mt-4 rounded-2xl at-glass p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-neutral-900">썸네일 문구</p>
                <p className="mt-0.5 text-[12px] text-neutral-400">썸네일에 큰 글씨로 박을 3초 훅 — 탭하면 복사돼요.</p>
              </div>
              <button onClick={fetchThumbCopies} disabled={thumbBusy} className="at-press shrink-0 rounded-lg bg-[#1D75F7]/10 px-3 py-1.5 text-[12px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/15 disabled:opacity-50">
                {thumbBusy ? "만드는 중" : thumbCopies ? "다시 추천" : "✦ 추천 받기"}
              </button>
            </div>
            {thumbCopies && (
              <div className="mt-3 flex flex-wrap gap-2">
                {thumbCopies.map((c) => (
                  <button key={c} onClick={async () => { try { await navigator.clipboard.writeText(c); setToast("복사했어요 — 썸네일에 붙여넣으세요"); } catch { setToast("복사하지 못했어요"); } }}
                    className="at-press rounded-full bg-neutral-50 px-3.5 py-2 text-[13px] font-bold text-neutral-800 ring-1 ring-black/[0.05] transition hover:bg-[#1D75F7]/[0.06] hover:ring-[#1D75F7]/30">
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl at-glass p-5">
            <p className="text-[14px] font-bold text-neutral-900">이미지 자리 {parseSlots(bodyHtml).filter((sl) => sl.type === "photo" || DATA_CARDS_ENABLED).length}곳</p>
            <p className="mt-1 text-[12px] leading-relaxed text-neutral-400">직접 찍은 사진이 노출에 가장 좋아요. 올리면 그 자리에 들어가고, 복사할 때 같이 넘어가요. 비워 두고 발행해도 괜찮아요. 첫 번째 사진이 대표이미지 후보가 돼요.</p>
            <button onClick={() => setThumbMakerOpen(true)} className="at-press mt-3 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-[#1D75F7]/[0.07] py-3 text-[13.5px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/[0.12]">
              <span aria-hidden>✦</span> 썸네일 만들기 <span className="text-[11.5px] font-semibold text-[#1D75F7]/60">문구·배경 골라서</span>
            </button>
            <div className="mt-3 space-y-2.5">
              {parseSlots(bodyHtml).map((slot, i) => {
                const st = imgs[i] ?? {};
                if (slot.type === "card") {
                  if (!DATA_CARDS_ENABLED) return null; // 카드 봉인 — 행 자체 미표시(문서순 인덱스는 유지)
                  return (
                    <div key={i} className="rounded-xl bg-white/70 p-3.5 ring-1 ring-black/[0.04]">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1D75F7]/10 text-[11px] font-bold text-[#1D75F7]">{i + 1}</span>
                        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-700">데이터 카드 · 자동으로 만들어져요</p>
                        {st.url && <span className="text-[11px] font-bold text-emerald-600">완료</span>}
                      </div>
                      {st.url && <img src={st.url} alt="" className="mt-3 max-h-56 w-full rounded-lg object-cover" />}
                    </div>
                  );
                }
                return (
                  <div key={i} className={`rounded-xl bg-white/70 p-3.5 ring-1 ring-black/[0.04] ${st.busy ? "at-ai-swap" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-500">{i + 1}</span>
                      <p className="min-w-0 flex-1 text-[13px] font-medium text-neutral-700">
                        {i === 0 && <span className="mr-1.5 rounded bg-[#1D75F7]/10 px-1.5 py-0.5 text-[10.5px] font-bold text-[#1D75F7] align-middle">대표</span>}
                        예: {slot.desc}
                      </p>
                      <label className="at-press shrink-0 cursor-pointer rounded-lg bg-[#1D75F7]/10 px-3 py-1.5 text-[12px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/15">
                        {st.busy ? "올리는 중" : st.url ? "바꾸기" : "사진 올리기"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(i, f); e.target.value = ""; }} />
                      </label>
                      {AI_IMAGES_ENABLED && !st.url && (
                        <button onClick={() => makeImage(i, slot.desc)} disabled={st.busy} className="at-press shrink-0 rounded-lg bg-[#1D75F7]/10 px-3 py-1.5 text-[12px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/15 disabled:opacity-50"><span aria-hidden>✦</span> AI 생성 · {IMAGE_COST}크레딧</button>
                      )}
                    </div>
                    {st.err && <p className="mt-2 text-[12px] font-medium text-amber-600">{st.err}</p>}
                    {st.url && (
                      <div className="mt-3">
                        <img src={st.url} alt="" className="max-h-56 w-full rounded-lg object-cover" />
                        <div className="mt-2 flex items-center gap-2">
                          <button onClick={() => st.url && copyImageAt(i, st.url)} className="at-press rounded-lg tk-grad-cta px-3.5 py-2 text-[12.5px] font-bold text-white transition hover:opacity-90">{imgCopied === i ? "복사됨 · 네이버에 붙여넣기" : "이미지 복사"}</button>
                          <button onClick={() => st.url && clipSaveImage(st.url, `ateflo-image-${i + 1}.png`)} className="at-press rounded-lg bg-neutral-100 px-3.5 py-2 text-[12.5px] font-bold text-neutral-600 transition hover:bg-neutral-200">저장</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>)}

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs leading-relaxed text-neutral-500">
          <span aria-hidden className="mt-px">💡</span>
          <p>
            여기서는 글을 <span className="font-medium text-neutral-700">검토</span>하고 <span className="font-medium text-neutral-700">복사</span>하는 곳이에요.
            문장을 고치고 싶으면 네이버에 붙여넣은 뒤 네이버 편집기에서 자유롭게 다듬으면 돼요.
          </p>
        </div>

        {/* ★모바일 미리보기 — 독자가 보는 그대로(390px 프레임, 가운데 정렬). PC에서도 이 프레임이 기본. */}
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-[390px] rounded-2xl bg-white px-5 py-6 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]">
            <p className="mb-3 text-center text-[11px] font-semibold text-neutral-400">모바일에서 이렇게 보여요</p>
            <div
              className="max-w-none [word-break:keep-all] text-[15px] leading-[1.7] text-neutral-800 [&_img]:mx-auto [&_img]:rounded-lg [&_p]:my-0 [&_h2]:my-0 [&_h2]:text-[17px] [&_h2]:font-bold [&_blockquote]:my-0 [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-3 [&_ul]:my-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-0 [&_p]:cursor-pointer"
              onClick={(e) => {
                // ★문장 탭 → 오타 수준 인라인 수정(편집기 신설 금지 — 탈고는 네이버 원칙 유지)
                const el = (e.target as HTMLElement).closest("p");
                const text = el?.textContent?.trim();
                if (!text || text.length < 4 || el?.querySelector("img")) return;
                setEditSeg({ original: text, value: text });
              }}
              dangerouslySetInnerHTML={{ __html: formatBody({ title, bodyHtml, images: Object.fromEntries(Object.entries(imgs).filter(([, v]) => v.url).map(([k, v]) => [Number(k), v.url as string])) }) }}
            />
            <p className="mt-3 text-center text-[10.5px] text-neutral-300">문장을 탭하면 오타를 고칠 수 있어요</p>
          </div>
        </div>

        {/* ★전략 카드(접힘) — 이 글이 노리는 것. 별도 패널·대시보드화 금지, 접힌 한 섹션만. */}
        <div className="mt-4 rounded-2xl at-glass">
          <button onClick={() => setStrategyOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
            <span className="text-[13.5px] font-bold text-neutral-800">이 글의 작전</span>
            <svg className={`text-neutral-300 transition-transform ${strategyOpen ? "rotate-180" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {strategyOpen && (
            <div className="space-y-2.5 px-5 pb-4">
              <p className="text-[12.5px] text-neutral-600"><span className="font-bold text-neutral-800">노리는 검색어</span> · {article.keyword}</p>
              {Array.isArray(article.tags) && article.tags.length > 0 && (
                <p className="flex flex-wrap gap-1">{(article.tags as string[]).slice(0, 6).map((t) => <span key={t} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-500">#{t}</span>)}</p>
              )}
              <p className="text-[12.5px] leading-relaxed text-neutral-600"><span className="font-bold text-neutral-800">발행 후 할 일</span> · 이웃 5명에게 첫 반응 받기 — 첫 반응이 노출 테스트를 통과시켜요(홈 이웃 미션).</p>
            </div>
          )}
        </div>

        {/* ★검증 폴백 — 재시도 소진 시 글 주소 붙여넣기(verify-post가 살아있는 글 확인 후 verified) */}
        {article.status === "pending_verify" && (article.verify_attempts ?? 0) >= 6 && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/60">
            <p className="text-[13px] font-bold text-amber-800">발행 확인이 아직 안 됐어요</p>
            <p className="mt-1 text-[12px] leading-relaxed text-amber-700/80">발행한 글 주소를 붙여넣으면 바로 확인할게요.</p>
            <div className="mt-2 flex gap-2">
              <input value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} placeholder="https://blog.naver.com/..." className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-[13px] outline-none ring-1 ring-black/[0.06]" />
              <button onClick={async () => {
                const r = await fetch("/api/verify-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId: article.id, url: manualUrl }) });
                const d = await r.json();
                if (r.ok && d.state === "verified") { setToast("발행 확인됐어요"); onUpdated({ ...article, status: "verified" } as Article); }
                else setToast(d.error ?? "확인하지 못했어요");
              }} className="at-press shrink-0 rounded-lg bg-amber-600 px-3.5 py-2 text-[12.5px] font-bold text-white">확인</button>
            </div>
          </div>
        )}

        {/* ★증폭 수동 신고 — '이 글 반응 좋아요'(다음 날 후속 글감 배정 + 배합 가중 학습).
            상태 불문 노출(실측: 위저드 도입 전 발행 글이 draft로 남아 버튼이 숨음) — draft면 발행됨 마킹도 겸한다. */}
        <button onClick={async () => {
          if (article.status === "draft") { try { await markNaverPublished(); } catch { /* 무해 */ } }
          const r = await fetch(`/api/articles/${article.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hot: true }) });
          if (r.ok) setToast("반영했어요 — 내일 이 글의 후속을 준비할게요");
        }} className="at-press mt-4 w-full rounded-xl bg-emerald-50 py-3 text-[13.5px] font-bold text-emerald-700 transition hover:bg-emerald-100">이 글 반응 좋아요 · 후속 준비하기</button>

        {/* ★수동 차감 — 발행 글을 지웠을 때(게이지는 verified만 세므로 상태 전환=자동 차감) */}
        {(article.status === "verified" || article.status === "published") && (
          <button onClick={async () => {
            const r = await fetch(`/api/articles/${article.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "deleted" }) });
            if (r.ok) { setToast("반영했어요"); onUpdated({ ...article, status: "deleted" } as Article); }
          }} className="mt-4 w-full py-2 text-center text-[12px] font-medium text-neutral-300 transition hover:text-neutral-500">네이버에서 이 글을 지웠어요 · 발행 수에서 빼기</button>
        )}

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
        {editSeg && (
          <div className="ateflo-backdrop-in fixed inset-0 z-[75] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setEditSeg(null)}>
            <div className="ateflo-sheet-up w-full max-w-md at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
              <p className="text-[15px] font-bold text-neutral-900">문장 고치기</p>
              <p className="mt-0.5 text-[12px] text-neutral-400">오타 수준만 — 큰 수정은 네이버 편집기가 편해요.</p>
              <textarea value={editSeg.value} onChange={(e) => setEditSeg({ ...editSeg, value: e.target.value })} rows={4}
                className="mt-3 w-full rounded-xl bg-white p-3.5 text-[14px] leading-relaxed text-neutral-800 outline-none ring-1 ring-black/[0.06] focus:ring-[#1D75F7]/40" />
              <div className="mt-3 flex gap-2">
                <button onClick={async () => {
                  const { original, value } = editSeg;
                  if (!value.trim() || value === original) { setEditSeg(null); return; }
                  if (!bodyHtml.includes(original)) { setToast("이 문장은 네이버에서 수정해 주세요"); setEditSeg(null); return; }
                  const next = bodyHtml.replace(original, value.trim());
                  setBodyHtml(next);
                  setEditSeg(null);
                  const res = await fetch(`/api/articles/${article.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body_html: next }) });
                  if (res.ok) { setToast("고쳤어요"); onUpdated({ ...article, title, body_html: next }); } else setToast("저장하지 못했어요");
                }} className="at-press flex-1 rounded-xl tk-grad-cta py-3 text-[14px] font-bold text-white transition hover:opacity-90">저장</button>
                <button onClick={() => setEditSeg(null)} className="at-press rounded-xl bg-neutral-100 px-5 py-3 text-[14px] font-bold text-neutral-600">취소</button>
              </div>
            </div>
          </div>
        )}

        {thumbMakerOpen && (
          <ThumbMakerSheet
            articleId={article.id}
            copies={thumbCopies}
            onFetchCopies={fetchThumbCopies}
            slots={parseSlots(bodyHtml).map((sl, i) => ({ idx: i, desc: sl.desc, type: sl.type })).filter((x) => x.type === "photo").map(({ idx, desc }) => ({ idx, desc }))}
            onPlaced={(idx, url) => setImgs((m) => ({ ...m, [idx]: { ...m[idx], url } }))}
            onCredits={onCredits}
            onClose={() => setThumbMakerOpen(false)}
          />
        )}

        {naverOpen && (
          <NaverPublishSheet
            title={pubTitle}
            bodyHtml={bodyHtml}
            images={Object.fromEntries(Object.entries(imgs).filter(([, v]) => v.url).map(([k, v]) => [Number(k), v.url as string]))}
            tags={Array.isArray(article.tags) ? (article.tags as string[]) : []}
            onCopied={() => { if (article.status === "draft") void fetch(`/api/articles/${article.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "copied" }) }); }}
            onOpenNaverWrite={openNaverWrite}
            targetBlogId={naverBlogId}
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
