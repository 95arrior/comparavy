"use client";

import { useMemo, useState } from "react";
import { PASTE_MODE } from "@/config/publish";
import { buildRichHtml, buildMarkerHtml, buildPlainText, countPhotoSlots } from "@/lib/publishHtml";
import { copyText, copyRich, copyImage, saveImage, shareImages } from "@/lib/clipboard";

// 네이버 발행 복사 마법사. 세로 순차 버튼: 완료 전은 흐리게, 지금 누를 것만 파란색.
// 이모지·장식기호 금지. 대괄호, 숫자, 한글, 마침표만. 최종 탈고는 네이버 편집기에서.

const BLUE = "#1D75F7";

// 붙여넣기 안내용 키보드 일러스트 (키 글자는 허용).
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

interface StepDef {
  key: string;
  label: string;
  sub?: string;
  showKeys?: boolean;
  run: () => Promise<boolean> | boolean | void;
}

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
  onOpenNaverWrite: () => void; // 기기별 앱/웹 글쓰기 열기(lib/naverApp)
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

  const mark = (k: string) => setDone((s) => new Set(s).add(k));

  async function act(key: string, fn: () => Promise<boolean> | boolean | void) {
    if (busy) return;
    setBusy(key); setErr(null);
    try {
      const r = await fn();
      if (r === false) { setErr("복사가 안 되었어요. 화면을 한 번 누른 뒤 다시 시도해 주세요."); return; }
      mark(key);
    } catch {
      setErr("복사가 안 되었어요. 화면을 한 번 누른 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  // 본문 문자열(모드별) — 순수 함수
  const richHtml = useMemo(() => buildRichHtml({ title, bodyHtml, images }), [title, bodyHtml, images]);
  const markerHtml = useMemo(() => buildMarkerHtml({ title, bodyHtml }), [title, bodyHtml]);
  const plain = useMemo(() => buildPlainText({ title, bodyHtml }), [title, bodyHtml]);

  // 단계 정의
  let steps: StepDef[] = [];
  if (isMobile) {
    steps = [
      ...(imageUrls.length > 0
        ? [{
            key: "save",
            label: "사진 모두 저장",
            sub: "공유 창이 뜨면 이미지 저장을 누르세요.",
            run: async () => {
              const ok = await shareImages(imageUrls);
              if (!ok) for (let i = 0; i < imageUrls.length; i++) await saveImage(imageUrls[i], `ateflo-${i + 1}.png`);
              return true;
            },
          } as StepDef]
        : []),
      { key: "title", label: "제목 복사", sub: "네이버 앱 제목 칸에 붙여넣으세요.", run: () => copyText(title) },
      { key: "body", label: "본문 복사", sub: photoCount > 0 ? "사진 자리에 [사진 1] 표시가 들어가 있어요." : "본문 칸에 붙여넣으세요.", run: () => copyText(plain) },
      { key: "open", label: "네이버 앱에서 글쓰기", sub: "사진 첨부에서 방금 저장한 사진을 한 번에 고르세요.", run: () => onOpenNaverWrite() },
    ];
  } else if (PASTE_MODE === "rich") {
    steps = [
      { key: "title", label: "제목 복사", sub: "네이버 글쓰기의 제목 칸에 붙여넣으세요.", showKeys: true, run: () => copyText(title) },
      { key: "body", label: "본문 전체 복사 (사진 포함)", sub: "본문 칸을 누르고 붙여넣으세요. 사진도 같이 들어가요.", showKeys: true, run: () => copyRich(richHtml, plain) },
      { key: "open", label: "네이버 글쓰기 열기", run: () => onOpenNaverWrite() },
    ];
  } else {
    steps = [
      { key: "title", label: "제목 복사", sub: "제목 칸에 붙여넣으세요.", showKeys: true, run: () => copyText(title) },
      { key: "body", label: "본문 복사", sub: "사진 자리에 [사진 1] 표시가 들어가 있어요.", showKeys: true, run: () => copyRich(markerHtml, plain) },
      { key: "open", label: "네이버 글쓰기 열기", run: () => onOpenNaverWrite() },
    ];
  }

  const currentIdx = steps.findIndex((s) => !done.has(s.key));
  const showImageList = !isMobile && PASTE_MODE === "marker" && imageUrls.length > 0 && done.has("body");

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="ateflo-sheet-up max-h-[90vh] w-full max-w-md overflow-y-auto at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[17px] font-bold text-neutral-900">네이버에 올리기</p>
        <p className="mt-1 text-[13px] text-neutral-500">순서대로 눌러주세요.</p>

        <div className="mt-5 space-y-2.5">
          {steps.map((s, i) => {
            const isDone = done.has(s.key);
            const isCurrent = i === currentIdx;
            const n = i + 1;
            return (
              <div key={s.key}>
                <button
                  onClick={() => act(s.key, s.run)}
                  disabled={busy !== null}
                  className={`flex w-full items-center gap-3 rounded-2xl px-5 text-left transition ${
                    isDone ? "bg-neutral-100" : isCurrent ? "" : "bg-white ring-1 ring-black/[0.06]"
                  } disabled:opacity-60`}
                  style={{ minHeight: 56, background: isCurrent && !isDone ? BLUE : undefined }}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${isDone ? "bg-white" : isCurrent ? "bg-white/25 text-white" : "bg-neutral-100 text-neutral-500"}`}>
                    {isDone ? <Check /> : n}
                  </span>
                  <span className={`text-[15px] font-bold ${isDone ? "text-neutral-500" : isCurrent ? "text-white" : "text-neutral-800"}`}>
                    {busy === s.key ? "잠시만요" : isDone ? "복사했어요" : s.label}
                  </span>
                  {s.showKeys && isCurrent && !isDone && <span className="ml-auto opacity-90"><PasteKeys /></span>}
                </button>
                {s.sub && (isCurrent || isDone) && <p className="mt-1 px-2 text-[12.5px] leading-relaxed text-neutral-500">{s.sub}</p>}
              </div>
            );
          })}
        </div>

        {showImageList && (
          <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
            <p className="text-[13px] font-bold text-neutral-800">사진 넣기</p>
            <p className="mt-0.5 text-[12px] text-neutral-500">본문에서 [사진 1] 글자를 지우고 그 자리에 붙여넣으세요.</p>
            <div className="mt-3 space-y-2">
              {imageUrls.map((u, i) => {
                const key = `img${i}`;
                const isDone = done.has(key);
                return (
                  <div key={key} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    <span className="text-[13px] font-semibold text-neutral-700">사진 {i + 1}</span>
                    <button
                      onClick={() => act(key, () => copyImage(u))}
                      disabled={busy !== null}
                      className="at-press ml-auto flex items-center gap-1.5 rounded-lg bg-[#1D75F7] px-3.5 py-2 text-[12.5px] font-bold text-white transition disabled:opacity-60"
                    >
                      {isDone && <Check />}
                      {isDone ? "복사했어요" : `사진 ${i + 1} 복사`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {err && <p className="mt-3 text-[12.5px] font-medium text-amber-600">{err}</p>}

        <button
          onClick={onDone}
          className="at-press mt-5 w-full rounded-xl py-4 text-[15px] font-bold text-white transition hover:opacity-90"
          style={{ background: BLUE }}
        >
          발행까지 끝냈어요
        </button>
        <button onClick={onClose} className="mt-2 w-full py-2 text-center text-[13px] font-medium text-neutral-400 transition hover:text-neutral-600">
          닫기
        </button>
      </div>
    </div>
  );
}
