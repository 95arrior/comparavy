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
  targetBlogId,
  articleId,
  aiImageIdx,
  closingImageUrl,
  sourceTitle,
  onCopied,
  onDone,
  onClose,
}: {
  title: string;
  bodyHtml: string;
  images: Record<number, string>;
  /** 네이버 태그칸 전용 — 본문엔 넣지 않는다(자동 등록 중복 방지) */
  tags?: string[];
  onOpenNaverWrite: () => void;
  /** 이 글이 속한 블로그의 네이버 아이디 — 편집기는 '로그인된 계정'으로 열리므로 대상 명시 가드 */
  targetBlogId?: string | null;
  /** 완료 화면 주소 확정용(선택 입력 — 발행 직후가 주소를 들고 있는 순간) */
  articleId?: string;
  /** 이 글이 근거한 실제 기사 제목 — 있을 때만 '글감(뉴스) 연동'을 권한다 */
  sourceTitle?: string | null;
  aiImageIdx?: number[];
  closingImageUrl?: string | null; // ★탭만 연다 — 클립보드 접근 금지(회귀 테스트로 고정)
  onCopied?: () => void; // 본문 복사 검증 성공 시(상태 모델 copied 전이)
  onDone: () => void;
  onClose: () => void;
}) {
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const imageUrls = useMemo(
    () => Object.keys(images).map(Number).sort((a, b) => a - b).map((k) => images[k]).filter(Boolean),
    [images],
  );

  // 태그: 본문 끝 해시태그를 네이버가 태그칸에 자동 등록(복붙 한 번) — 별도 태그 단계 없음(잉여라 제거, 실측 확인).
  void tags;
  const totalScreens = 4;
  const [screen, setScreen] = useState(1); // 1 본문 → 2 열기 → 3 제목 → 4 완료
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doneUrl, setDoneUrl] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);
  const [urlMsg, setUrlMsg] = useState<string | null>(null);
  const [clip, setClip] = useState<string | null>(null);
  const [titleCopied, setTitleCopied] = useState(false);
  const [imagesSaved, setImagesSaved] = useState(false);

  const richHtml = useMemo(() => { const h = buildRichHtml({ title, bodyHtml, images, ownNaverBlogId: targetBlogId, aiImageIdx, closingImageUrl }); return hasPhotoLeak(h) ? sanitizeForCopy(h) : h; }, [title, bodyHtml, images, targetBlogId]);
  const plain = useMemo(() => { const t = buildPlainText({ title, bodyHtml, images }); return hasPhotoLeakPlain(t) ? sanitizePlain(t) : t; }, [title, bodyHtml, images]);
  const bodyLeak = hasPhotoLeak(richHtml) || hasPhotoLeakPlain(plain);
  const hasLinkSlot = bodyHtml.includes("[상품 링크 자리]"); // 리뷰형에만 존재 — 조건부 안내
  const hasPrevSlot = bodyHtml.includes("[전편 링크 자리]"); // 시리즈 unverified 폴백 — verified면 서버가 URL로 치환해 이 마커가 없음
  const bodyClip = `본문${imageUrls.length ? ` (사진 ${imageUrls.length}장)` : ""}`;

  async function copyBody() {
    if (busy || bodyLeak) return;
    setBusy(true); setErr(null);
    try {
      const r: CopyResult = isMobile ? await copyTextVerified(plain) : await copyRichVerified(richHtml, plain);
      if (r === "fail") { setErr("복사가 안 됐어요. 한 번 더 눌러주세요."); return; }
      setClip(bodyClip);
      onCopied?.();
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
              <span key={n} className={`h-1.5 rounded-full transition-all ${n === screen ? "w-5 tk-grad-cta" : n < screen ? "w-1.5 bg-[#1D75F7]/50" : "w-1.5 bg-neutral-200"}`} />
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
            {targetBlogId && (
              <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-2.5 text-[12.5px] font-medium text-neutral-600">
                이 글은 <b className="text-neutral-900">{targetBlogId}</b> 블로그 글이에요. 편집기는 지금 네이버에 로그인된 계정으로 열리니, 다른 블로그가 열리면 네이버에서 <b className="text-neutral-900">{targetBlogId}</b> 계정으로 다시 로그인해 주세요. 로그인이 안 돼 있으면 로그인 화면이 먼저 떠요.
              </p>
            )}
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
            {hasPrevSlot && (
              <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-2.5 text-[12.5px] font-medium text-neutral-600">전편 글 주소를 본문의 [전편 링크 자리]에 붙여 넣으세요.</p>
            )}
            {/* ★글감(뉴스) 연동 안내 — 근거 기사가 있는 글에만(2026-08-04). 주제와 안 맞는 글감을 넣으면 오히려 저품질이라,
                이 글이 실제로 근거한 기사가 있을 때만 권한다. 없으면 이 안내 자체가 안 뜬다. */}
            <div className="mt-3 rounded-xl bg-[#F7F8FA] px-4 py-3">
              <p className="text-[12.5px] font-bold text-neutral-800">📎 글감으로 근거를 붙이면 좋아요 <span className="font-medium text-neutral-400">(선택)</span></p>
              <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                에디터 상단 <b className="text-neutral-700">[글감]</b> → <b className="text-neutral-700">뉴스</b>에서 {sourceTitle ? "아래 기사를" : "이 글 주제와 맞는 기사를"} 찾아 본문 중간에 넣으면 공신력이 올라가요.
                주제와 다른 글감은 넣지 마세요 — 안 맞는 글감은 오히려 감점이에요.
              </p>
              {sourceTitle && (
                <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[12px] font-medium leading-snug text-neutral-700 ring-1 ring-black/[0.04]">{sourceTitle}</p>
              )}
            </div>
            <button onClick={() => setScreen(4)} className={`${bigBtn} mt-4`} style={{ background: BLUE }}>다음</button>
          </div>
        )}

        {/* 마지막 화면 — 완료(+대표이미지 가이드 — 붙여넣은 사진은 대표로 안 잡히는 네이버 동작, 실측 우회법) */}
        {screen === totalScreens && (
          <div className="mt-5">
            <p className="text-[17px] font-bold text-neutral-900">발행 버튼까지 눌렀나요?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">네이버에서 발행을 마쳤다면 아래를 눌러 오늘 미션을 끝내세요.</p>
            <p className="mt-2 rounded-xl bg-[#F7F8FA] px-3.5 py-2.5 text-[12px] leading-relaxed text-neutral-500">📱 발행 전 <b className="text-neutral-700">모바일 미리보기 10초</b> — 6체크: ①첫 화면 답답? ②7줄 글벽? ③강조 겹침? ④첫 이미지 멂? ⑤한 화면에 장식 3종 이상?(형광·볼드·인용구·이모지·표 동시 노출) ⑥3초 안에 "이 글에서 뭘 얻는지" 보임? 하나라도 YES(⑥은 NO)면 그 부분만 손보고 발행. 스티커는 기본 0개예요.</p>
            {articleId && (
              <div className="mt-3 rounded-xl bg-neutral-50 px-4 py-3">
                <p className="text-[12.5px] font-bold text-neutral-700">발행한 글 주소를 붙여넣어 주세요</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">주소가 있어야 다음 글부터 <b className="text-neutral-700">'함께 보면 좋은 글'로 서로 연결</b>돼요 — 글끼리 오가는 체류가 검색 지수를 올려요.</p>
                <div className="mt-2 flex gap-2">
                  <input value={doneUrl} onChange={(e) => setDoneUrl(e.target.value)} placeholder="https://blog.naver.com/..." className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-[13px] outline-none ring-1 ring-black/[0.06]" />
                  <button onClick={async () => {
                    if (!doneUrl.trim() || urlBusy) return;
                    setUrlBusy(true);
                    try {
                      const r = await fetch("/api/verify-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId, url: doneUrl.trim() }) });
                      const d = await r.json();
                      if (r.ok && d.state === "verified") { setUrlMsg("확인 완료 — 카운트에 반영됐어요"); setTimeout(() => onDone(), 900); }
                      else setUrlMsg(d.error ?? "주소를 확인하지 못했어요");
                    } catch { setUrlMsg("네트워크 오류예요"); }
                    setUrlBusy(false);
                  }} disabled={urlBusy} className="at-press shrink-0 rounded-lg tk-grad-cta px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-50">{urlBusy ? "확인 중" : "확인"}</button>
                </div>
                {urlMsg && <p className="mt-1.5 text-[12px] font-semibold text-neutral-500">{urlMsg}</p>}
              </div>
            )}
            {/<img/i.test(richHtml) && (
              <div className="mt-3 rounded-xl bg-neutral-50 px-4 py-3">
                <p className="text-[12.5px] font-bold text-neutral-700">대표이미지가 안 잡힌다면</p>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">붙여넣은 사진은 네이버가 대표로 인식하지 못할 때가 있어요. 발행 화면에서 대표이미지가 비어 있으면 — 본문에서 그 사진을 지우고, 같은 자리에서 사진 버튼으로 다시 올리면 대표로 지정할 수 있어요.</p>
              </div>
            )}
            {/* ★버튼 위계 역전(2026-08-14 유저: "관련 글 링크 안 나오네" — 주소 없이 끝내면 관련글 후보가 영원히 0) */}
            {articleId ? (
              <button onClick={onDone} className="at-press mt-4 w-full rounded-xl py-3 text-[13px] font-semibold text-neutral-400 transition hover:text-neutral-600">주소 없이 끝내기 (글 연결 안 됨)</button>
            ) : (
              <button onClick={onDone} className={`${bigBtn} mt-4`} style={{ background: BLUE }}>발행까지 끝냈어요</button>
            )}
          </div>
        )}

        {err && <p className="mt-3 text-[12.5px] font-medium text-amber-600">{err}</p>}
      </div>
    </div>
  );
}
