"use client";

import { useMemo, useState } from "react";
import { buildRichHtml, buildPlainText, sanitizeForCopy, sanitizePlain, hasPhotoLeak, hasPhotoLeakPlain } from "@/lib/publishHtml";
import { copyRichVerified, copyTextVerified, saveImage, shareImages, type CopyResult } from "@/lib/clipboard";

// ★발행 위저드 — 한 화면 한 행동(4단계). 복사는 읽기 검증 통과 시에만 진행.
//  1 본문 복사 → 2 네이버 열기(탭만 — 클립보드 절대 안 만짐) → 3 제목(탭 복사) → 4 완료.
//  '지금 붙일 것' 인디케이터 전 화면 고정. 이모지·장식 금지.

const BLUE = "#1D75F7";

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22b573" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function NaverPublishSheet({
  title,
  bodyHtml,
  images,
  tags,
  onOpenNaverWrite,
  onDone,
  onClose,
}: {
  title: string;
  bodyHtml: string;
  images: Record<number, string>;
  /** 네이버 태그칸 전용 — 본문엔 넣지 않는다(자동 등록 중복 방지) */
  tags?: string[];
  onOpenNaverWrite: () => void; // ★탭만 연다 — 클립보드 접근 금지(회귀 테스트로 고정)
  onDone: () => void;
  onClose: () => void;
}) {
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const imageUrls = useMemo(
    () => Object.keys(images).map(Number).sort((a, b) => a - b).map((k) => images[k]).filter(Boolean),
    [images],
  );

  const tagList = (tags ?? []).map((t) => String(t).trim().replace(/^#/, "")).filter(Boolean).slice(0, 10);
  const hasTags = tagList.length > 0;
  const totalScreens = hasTags ? 5 : 4;
  const [screen, setScreen] = useState(1); // 1 본문 → 2 열기 → 3 제목 → (4 태그) → 마지막 완료
  const [tagsCopied, setTagsCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [clip, setClip] = useState<string | null>(null);
  const [titleCopied, setTitleCopied] = useState(false);
  const [imagesSaved, setImagesSaved] = useState(false);

  const richHtml = useMemo(() => { const h = buildRichHtml({ title, bodyHtml, images }); return hasPhotoLeak(h) ? sanitizeForCopy(h) : h; }, [title, bodyHtml, images]);
  const plain = useMemo(() => { const t = buildPlainText({ title, bodyHtml, images }); return hasPhotoLeakPlain(t) ? sanitizePlain(t) : t; }, [title, bodyHtml, images]);
  const bodyLeak = hasPhotoLeak(richHtml) || hasPhotoLeakPlain(plain);
  const hasLinkSlot = bodyHtml.includes("[상품 링크 자리]"); // 리뷰형에만 존재 — 조건부 안내
  const bodyClip = `본문${imageUrls.length ? ` (사진 ${imageUrls.length}장)` : ""}`;

  async function copyBody() {
    if (busy || bodyLeak) return;
    setBusy(true); setErr(null);
    try {
      const r: CopyResult = isMobile ? await copyTextVerified(plain) : await copyRichVerified(richHtml, plain);
      if (r === "fail") { setErr("복사가 안 됐어요. 한 번 더 눌러주세요."); return; }
      setClip(bodyClip);
      setScreen(2); // 검증 성공 시에만 자동 전환
    } finally { setBusy(false); }
  }
  async function copyTitle() {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await copyTextVerified(title);
      if (r === "fail") { setErr("복사가 안 됐어요. 한 번 더 눌러주세요."); return; }
      setClip("제목"); setTitleCopied(true);
    } finally { setBusy(false); }
  }
  async function copyTags() {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await copyTextVerified(tagList.map((t) => `#${t}`).join(" "));
      if (r === "fail") { setErr("복사가 안 됐어요. 한 번 더 눌러주세요."); return; }
      setClip("태그"); setTagsCopied(true);
    } finally { setBusy(false); }
  }
  async function saveAllImages() {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await shareImages(imageUrls);
      if (!ok) for (let i = 0; i < imageUrls.length; i++) await saveImage(imageUrls[i], `ateflo-${i + 1}.png`);
      setImagesSaved(true);
    } finally { setBusy(false); }
  }

  const bigBtn = "at-press w-full rounded-xl py-4 text-[15px] font-bold text-white transition hover:opacity-90 disabled:opacity-60";

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="ateflo-sheet-up max-h-[90vh] w-full max-w-md overflow-y-auto at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — 진행 점 + 뒤로 */}
        <div className="flex items-center justify-between">
          <button onClick={() => (screen > 1 ? setScreen(screen - 1) : onClose())} className="at-press -ml-1 rounded-lg px-2 py-1 text-[13px] font-medium text-neutral-400 transition hover:text-neutral-700">
            {screen > 1 ? "← 뒤로" : "닫기"}
          </button>
          <div className="flex items-center gap-1.5" aria-label={`${screen}/${totalScreens} 단계`}>
            {Array.from({ length: totalScreens }, (_, i) => i + 1).map((n) => (
              <span key={n} className={`h-1.5 rounded-full transition-all ${n === screen ? "w-5 bg-[#1D75F7]" : n < screen ? "w-1.5 bg-[#1D75F7]/50" : "w-1.5 bg-neutral-200"}`} />
            ))}
          </div>
          <span className="w-10" />
        </div>

        {/* 지금 붙일 것 — 전 화면 공통 고정 */}
        <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-semibold"
          style={{ background: clip ? "rgba(29,117,247,0.07)" : "rgba(0,0,0,0.04)", color: clip ? BLUE : "#9aa2ad" }}>
          <span>지금 붙일 것:</span>
          <span>{clip ?? "아직 복사 안 함"}</span>
        </div>

        {/* 화면 1 — 본문 복사 */}
        {screen === 1 && (
          <div className="mt-5">
            <p className="text-[17px] font-bold text-neutral-900">본문을 복사할게요</p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{isMobile ? "사진 자리에 [사진 1] 표시가 들어가요." : "사진도 같이 복사돼요."}</p>
            {isMobile && imageUrls.length > 0 && (
              <button onClick={saveAllImages} disabled={busy} className="at-press mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-100 py-3 text-[13.5px] font-bold text-neutral-700 transition hover:bg-neutral-200 disabled:opacity-60">
                {imagesSaved && <Check />}{imagesSaved ? "사진 저장됨" : `먼저 사진 ${imageUrls.length}장 저장하기`}
              </button>
            )}
            <button onClick={copyBody} disabled={busy || bodyLeak} className={`${bigBtn} mt-4`} style={{ background: BLUE }}>
              {busy ? "확인 중" : "본문 복사 (사진 포함)"}
            </button>
            {bodyLeak && <p className="mt-3 text-[12.5px] font-medium text-amber-600">본문 정리 중 문제가 있어 복사를 잠시 막았어요. 글을 다시 만들어 주세요.</p>}
          </div>
        )}

        {/* 화면 2 — 네이버 열기(탭만 — 부수 동작 금지) */}
        {screen === 2 && (
          <div className="mt-5">
            <p className="text-[17px] font-bold text-neutral-900">네이버 본문 칸에 붙여넣으세요</p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{isMobile ? "본문 칸을 길게 눌러 붙여넣기 하세요." : "본문 칸 클릭 후 Ctrl+V 하세요."}</p>
            <button onClick={() => { onOpenNaverWrite(); setScreen(3); }} className={`${bigBtn} mt-4`} style={{ background: "#03C75A" }}>
              네이버 글쓰기 열기
            </button>
          </div>
        )}

        {/* 화면 3 — 제목(탭 복사) + 리뷰형 조건부 링크 안내 */}
        {screen === 3 && (
          <div className="mt-5">
            <p className="text-[17px] font-bold text-neutral-900">제목을 채우세요</p>
            <button onClick={copyTitle} disabled={busy} className="at-press mt-3 w-full rounded-2xl bg-neutral-50 p-4 text-left ring-1 ring-black/[0.05] transition hover:bg-neutral-100 disabled:opacity-60">
              <p className="text-[16px] font-bold leading-snug text-neutral-900">{title}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: BLUE }}>
                {titleCopied && <Check />}{busy ? "확인 중" : titleCopied ? "제목 복사됨 · 제목 칸에 붙여넣으세요" : "탭하면 복사돼요"}
              </p>
            </button>
            {hasLinkSlot && (
              <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-2.5 text-[12.5px] font-medium text-neutral-600">본문의 [상품 링크 자리]를 쇼핑커넥트에서 만든 내 링크로 바꿔 넣으세요.</p>
            )}
            <button onClick={() => setScreen(4)} className={`${bigBtn} mt-4`} style={{ background: BLUE }}>다음</button>
          </div>
        )}

        {/* 화면 4 — 태그(있을 때만): 본문엔 없음 — 태그칸에 붙여넣으면 자동으로 나뉜다 */}
        {hasTags && screen === 4 && (
          <div className="mt-5">
            <p className="text-[17px] font-bold text-neutral-900">태그를 채우세요</p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">발행 화면 아래 태그 칸에 붙여넣으면 자동으로 나뉘어 들어가요.</p>
            <button onClick={copyTags} disabled={busy} className="at-press mt-3 w-full rounded-2xl bg-neutral-50 p-4 text-left ring-1 ring-black/[0.05] transition hover:bg-neutral-100 disabled:opacity-60">
              <p className="flex flex-wrap gap-1.5">
                {tagList.map((t) => <span key={t} className="rounded-md bg-white px-2 py-0.5 text-[12.5px] font-semibold text-neutral-600 ring-1 ring-black/[0.05]">#{t}</span>)}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: BLUE }}>
                {tagsCopied && <Check />}{busy ? "확인 중" : tagsCopied ? "태그 복사됨 · 태그 칸에 붙여넣으세요" : "탭하면 복사돼요"}
              </p>
            </button>
            <button onClick={() => setScreen(5)} className={`${bigBtn} mt-4`} style={{ background: BLUE }}>다음</button>
          </div>
        )}

        {/* 마지막 화면 — 완료 */}
        {screen === totalScreens && (
          <div className="mt-5">
            <p className="text-[17px] font-bold text-neutral-900">발행 버튼까지 눌렀나요?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">네이버에서 발행을 마쳤다면 아래를 눌러 오늘 미션을 끝내세요.</p>
            <button onClick={onDone} className={`${bigBtn} mt-4`} style={{ background: BLUE }}>발행까지 끝냈어요</button>
          </div>
        )}

        {err && <p className="mt-3 text-[12.5px] font-medium text-amber-600">{err}</p>}
      </div>
    </div>
  );
}
