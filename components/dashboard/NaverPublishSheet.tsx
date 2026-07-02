"use client";

import { useState } from "react";

// ★네이버 발행 위저드 — 80대 기준: 한 화면 = 한 문장 + 한 버튼. 다음 단계는 버튼을 눌러야 나옴.
// 모바일(웹 에디터 붙여넣기 차단) = 앱 플로우 / 데스크톱 = 2회 붙여넣기 플로우.

export default function NaverPublishSheet({
  photoCount,
  copied,
  allCopied,
  onOpenNaverWrite,
  onCopyBody,
  onCopyAll,
  onDone,
  onClose,
}: {
  photoCount: number;
  copied: boolean;
  allCopied: boolean;
  /** 데스크톱: 네이버 글쓰기 새 탭(제목 자동 복사) */
  onOpenNaverWrite: () => void;
  /** 데스크톱: 본문(서식) 복사 */
  onCopyBody: () => void;
  /** 모바일: 제목+본문 전체 플레인 복사 */
  onCopyAll: () => void;
  /** 발행 완료 확정 */
  onDone: () => void;
  onClose: () => void;
}) {
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [step, setStep] = useState(0);

  // 단계 정의 — 기기별로 다른 시나리오
  const steps = isMobile
    ? [
        {
          title: "글을 통째로 복사할게요",
          sub: "제목부터 해시태그까지 한 번에 담겨요.",
          cta: allCopied ? "복사됐어요 ✓ 다음" : "글 전체 복사하기",
          act: () => { onCopyAll(); setTimeout(() => setStep(1), 600); },
        },
        {
          title: "네이버 블로그 앱을 열고\n글쓰기를 누르세요",
          sub: "초록색 연필 버튼이에요. 본문을 길게 눌러 ‘붙여넣기’ 하세요.",
          cta: "붙여넣었어요, 다음",
          act: () => setStep(2),
        },
        {
          title: "첫 줄을 잘라서\n제목칸으로 옮기세요",
          sub: photoCount > 0 ? `그리고 📷 사진 자리 ${photoCount}곳에 사진을 올리고 그 안내 줄은 지워요. (직접 찍거나 무료 이미지만)` : "다 됐으면 네이버에서 ‘발행’을 누르세요. 공개 설정은 전체공개로!",
          cta: "발행까지 다 했어요",
          act: onDone,
        },
      ]
    : [
        {
          title: "네이버 글쓰기를 열게요",
          sub: "제목이 자동으로 복사돼요. 열리면 제목칸에 붙여넣으세요(⌘V).",
          cta: "네이버 글쓰기 열기",
          act: () => { onOpenNaverWrite(); setTimeout(() => setStep(1), 600); },
        },
        {
          title: "이제 본문을 복사할게요",
          sub: "복사한 뒤 네이버 본문칸에 붙여넣으세요. 소제목·형광펜이 그대로 따라가요.",
          cta: copied ? "복사됐어요 ✓ 다음" : "본문 복사하기",
          act: () => { onCopyBody(); setTimeout(() => setStep(2), 600); },
        },
        {
          title: "마지막 확인이에요",
          sub: `${photoCount > 0 ? `📷 사진 자리 ${photoCount}곳에 사진을 올리고 안내 줄은 지워요. ` : ""}발행할 때 검색 허용 등 공개 옵션을 켜고 전체공개로 올리세요.`,
          cta: "발행까지 다 했어요",
          act: onDone,
        },
      ];

  const cur = steps[step];

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="ateflo-sheet-up w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
        {/* 진행 점 */}
        <div className="flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-[#03C75A]" : i < step ? "w-1.5 bg-[#03C75A]/40" : "w-1.5 bg-neutral-200"}`} />
          ))}
        </div>

        {/* 한 화면 = 한 문장 + 한 버튼 */}
        <div key={step} className="ateflo-slide-fwd mt-6 min-h-[120px]">
          <h3 className="whitespace-pre-line text-[20px] font-extrabold leading-snug tracking-tight text-[color:var(--at-grey-900)]">{cur.title}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-500">{cur.sub}</p>
        </div>

        <button onClick={cur.act} className="at-press mt-5 w-full rounded-xl bg-[#03C75A] py-4 text-[15px] font-bold text-white transition hover:opacity-95">
          {cur.cta}
        </button>

        <div className="mt-2 flex items-center justify-between">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="py-2 text-[13px] font-medium text-neutral-400 transition hover:text-neutral-600">← 이전</button>
          ) : <span />}
          <button onClick={onClose} className="py-2 text-[13px] font-medium text-neutral-400 transition hover:text-neutral-600">닫기</button>
        </div>
      </div>
    </div>
  );
}
