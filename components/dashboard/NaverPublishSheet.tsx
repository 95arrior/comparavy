"use client";

import { useMemo, useState } from "react";
import { PASTE_MODE } from "@/config/publish";
import { buildRichHtml, buildPlainText, countPhotoSlots, sanitizeForCopy, sanitizePlain, hasPhotoLeak, hasPhotoLeakPlain } from "@/lib/publishHtml";
import { copyRichVerified, copyTextVerified, saveImage, shareImages, type CopyResult } from "@/lib/clipboard";

// 네이버 발행 복사 마법사(신뢰성판) — 복사는 '읽기 검증'을 통과해야만 완료로 표시.
//  흐름: [1 본문 복사(사진 포함)] → [2 네이버 글쓰기 열기]. 제목은 마지막 카드(탭해서 복사).
//  클립보드 인디케이터로 '지금 붙일 것'을 항상 보여준다. 이모지·장식기호 금지.

const BLUE = "#1D75F7";

function PasteKeys() {
  return (
    <svg width="112" height="40" viewBox="0 0 112 40" fill="none" aria-hidden>
      <rect x="1" y="1" width="52" height="38" rx="8" fill="#fff" stroke="#d7deea" strokeWidth="1.5" />
      <rect x="59" y="1" width="52" height="38" rx="8" fill="#fff" stroke="#d7deea" strokeWidth="1.5" />
      <text x="27" y="25" textAnchor="middle" fontSize="13" fontWeight="700" fill="#5b6472">Ctrl</text>
      <text x="85" y="25" textAnchor="middle" fontSize="15" fontWeight="700" fill="#5b6472">V</text>
    </svg>
  );
}
function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22b573" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

interface StepDef { key: string; label: string; sub?: string; showKeys?: boolean; run: () => Promise<CopyResult | boolean | void> | CopyResult | boolean | void }

export default function NaverPublishSheet({
  title,
  bodyHtml,
  images,
  onOpenNaverWrite,
  onDone,
  onClose,
}: {
  title: string;
  bodyHtml: string;
  images: Record<number, string>;
  onOpenNaverWrite: () => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const photoCount = useMemo(() => countPhotoSlots(bodyHtml), [bodyHtml]);
  const imageUrls = useMemo(
    () => Object.keys(images).map(Number).sort((a, b) => a - b).map((k) => images[k]).filter(Boolean),
    [images],
  );

  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [clip, setClip] = useState<string | null>(null); // 지금 클립보드에 담긴 것
  const mark = (k: string) => setDone((s) => new Set(s).add(k));

  // ★복사는 검증 통과("fail"이 아닐 때)만 완료 표시. 실패면 원상복구 + 안내.
  async function act(key: string, fn: StepDef["run"]) {
    if (busy) return;
    setBusy(key); setErr(null);
    try {
      const r = await fn();
      if (r === "fail" || r === false) { setErr("복사가 안 됐어요. 한 번 더 눌러주세요."); setBusy(null); return; }
      mark(key);
    } catch {
      setErr("복사가 안 됐어요. 한 번 더 눌러주세요.");
    } finally {
      setBusy(null);
    }
  }

  // 본문 문자열 — 최종 게이트(사진 마커/지시·이모지 잔존 시 자동 재처리).
  const richHtml = useMemo(() => { const h = buildRichHtml({ title, bodyHtml, images }); return hasPhotoLeak(h) ? sanitizeForCopy(h) : h; }, [title, bodyHtml, images]);
  const plain = useMemo(() => { const t = buildPlainText({ title, bodyHtml, images }); return hasPhotoLeakPlain(t) ? sanitizePlain(t) : t; }, [title, bodyHtml, images]);
  const bodyLeak = hasPhotoLeak(richHtml) || hasPhotoLeakPlain(plain);
  const hasLinkSlot = bodyHtml.includes("[상품 링크 자리]"); // 리뷰형 — 쇼핑커넥트 링크 교체 안내
  const bodyClip = `본문${imageUrls.length ? ` (사진 ${imageUrls.length}장)` : ""}`;

  const copyBody = async (): Promise<CopyResult> => {
    const r = isMobile ? await copyTextVerified(plain) : await copyRichVerified(richHtml, plain);
    if (r !== "fail") setClip(bodyClip);
    return r;
  };

  // 단계 — 본문 복사 → 네이버 열기 (제목은 아래 카드). 마커 모드는 이미지 별도 붙임 안내 유지.
  let steps: StepDef[] = [];
  if (isMobile) {
    steps = [
      ...(imageUrls.length > 0
        ? [{ key: "save", label: "사진 모두 저장", sub: "공유 창이 뜨면 이미지 저장을 누르세요.", run: async () => { const ok = await shareImages(imageUrls); if (!ok) for (let i = 0; i < imageUrls.length; i++) await saveImage(imageUrls[i], `ateflo-${i + 1}.png`); return true; } } as StepDef]
        : []),
      { key: "body", label: "본문 복사 (사진 자리 포함)", sub: photoCount > 0 ? "사진 자리에 [사진 1] 표시가 있어요. 저장한 사진을 그 자리에 넣으세요." : "네이버 앱 본문 칸에 붙여넣으세요.", run: copyBody },
      { key: "open", label: "네이버 앱에서 글쓰기", sub: "본문 칸을 누르고 붙여넣으세요.", run: () => onOpenNaverWrite() },
    ];
  } else {
    steps = [
      { key: "body", label: "본문 복사 (사진 포함)", sub: "네이버 본문 칸을 누르고 붙여넣으세요. 사진도 같이 들어가요.", showKeys: true, run: copyBody },
      { key: "open", label: "네이버 글쓰기 열기", sub: "본문 칸에 붙여넣으세요.", run: () => onOpenNaverWrite() },
    ];
  }

  const currentIdx = steps.findIndex((s) => !done.has(s.key));

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="ateflo-sheet-up max-h-[90vh] w-full max-w-md overflow-y-auto at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[17px] font-bold text-neutral-900">네이버에 올리기</p>
        <p className="mt-1 text-[13px] text-neutral-500">순서대로 눌러주세요.</p>

        {/* 클립보드 인디케이터 — 지금 붙이면 뭐가 들어가는지 항상 표시 */}
        <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-semibold"
          style={{ background: clip ? "rgba(29,117,247,0.07)" : "rgba(0,0,0,0.04)", color: clip ? BLUE : "#9aa2ad" }}>
          <span>지금 붙일 것:</span>
          <span>{clip ?? "아직 복사 안 함"}</span>
        </div>

        <div className="mt-4 space-y-2.5">
          {steps.map((s, i) => {
            const isDone = done.has(s.key);
            const isCurrent = i === currentIdx;
            const disabled = busy !== null || (s.key === "body" && bodyLeak);
            return (
              <div key={s.key}>
                <button
                  onClick={() => act(s.key, s.run)}
                  disabled={disabled}
                  className={`flex w-full items-center gap-3 rounded-2xl px-5 text-left transition ${isDone ? "bg-neutral-100" : isCurrent ? "" : "bg-white ring-1 ring-black/[0.06]"} disabled:opacity-60`}
                  style={{ minHeight: 56, background: isCurrent && !isDone ? BLUE : undefined }}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${isDone ? "bg-white" : isCurrent ? "bg-white/25 text-white" : "bg-neutral-100 text-neutral-500"}`}>
                    {isDone ? <Check /> : i + 1}
                  </span>
                  <span className={`text-[15px] font-bold ${isDone ? "text-neutral-500" : isCurrent ? "text-white" : "text-neutral-800"}`}>
                    {busy === s.key ? "확인 중" : isDone ? "됐어요" : s.label}
                  </span>
                  {s.showKeys && isCurrent && !isDone && <span className="ml-auto opacity-90"><PasteKeys /></span>}
                </button>
                {s.sub && (isCurrent || isDone) && <p className="mt-1 px-2 text-[12.5px] leading-relaxed text-neutral-500">{s.sub}</p>}
              </div>
            );
          })}
        </div>

        {/* 제목 — 스텝 아님. 크게 보여주고, 탭하면 복사(본문 붙인 뒤 제목 칸에서 치거나 탭) */}
        <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
          <p className="text-[11.5px] font-semibold text-neutral-400">제목</p>
          <p className="mt-1 text-[16px] font-bold leading-snug text-neutral-900">{title}</p>
          <button
            onClick={() => act("title", async () => { const r = await copyTextVerified(title); if (r !== "fail") setClip("제목"); return r; })}
            disabled={busy !== null}
            className="at-press mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-[13px] font-bold text-neutral-700 ring-1 ring-black/[0.08] transition disabled:opacity-60"
          >
            {done.has("title") && <Check />}
            {busy === "title" ? "확인 중" : done.has("title") ? "제목 복사됨 · 다시 탭하면 재복사" : "탭하면 제목이 복사돼요"}
          </button>
        </div>

        {hasLinkSlot && <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-2.5 text-[12.5px] font-medium text-neutral-600">본문의 [상품 링크 자리]를 쇼핑커넥트에서 만든 내 링크로 바꿔 넣으세요.</p>}
        {bodyLeak && <p className="mt-3 text-[12.5px] font-medium text-amber-600">본문 정리 중 문제가 있어 복사를 잠시 막았어요. 글을 다시 만들어 주세요.</p>}
        {err && <p className="mt-3 text-[12.5px] font-medium text-amber-600">{err}</p>}

        <button onClick={onDone} className="at-press mt-5 w-full rounded-xl py-4 text-[15px] font-bold text-white transition hover:opacity-90" style={{ background: BLUE }}>
          발행까지 끝냈어요
        </button>
        <button onClick={onClose} className="mt-2 w-full py-2 text-center text-[13px] font-medium text-neutral-400 transition hover:text-neutral-600">
          닫기
        </button>
      </div>
    </div>
  );
}
