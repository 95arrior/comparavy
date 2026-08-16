"use client";

import { useEffect, useRef, useState } from "react";
import { buildThumbImagePrompt } from "@/lib/imagePrompts";
import { IMAGE_COST } from "@/lib/creditPacks";

// ★썸네일 메이커(유저 요청) — 문구(추천 클릭/직접 입력) + 배경색 + 오브젝트 톤 + 3D/심플 배경 → 원하는 슬롯에 배치.
//  원칙: 텍스트가 주인공(톤을 높일수록 배경 오브젝트가 은은해짐), 개행은 서버가 어절 균형으로.
const SWATCHES = [
  { name: "paper-cobalt", bg: "#F5F4F0", dot: "#2E5AAC", label: "코발트" },
  { name: "navy-sky", bg: "#0E2A47", dot: "#6FB1E6", label: "네이비" },
  { name: "sky-ink", bg: "#E6EEF4", dot: "#2C6E8F", label: "스카이" },
  { name: "ink-cream", bg: "#F4EFE6", dot: "#C6553F", label: "크림" },
  { name: "charcoal-gold", bg: "#1E1E22", dot: "#D9A441", label: "차콜" },
  { name: "slate-mint", bg: "#12312F", dot: "#67C7B0", label: "민트" },
];
const TONES = [
  { key: "subtle", label: "은은하게", wash: 0.55 },
  { key: "mid", label: "보통", wash: 0.35 },
  { key: "vivid", label: "살리기", wash: 0.12 },
];

export default function ThumbMakerSheet({ articleId, articleTitle, copies, slots, onFetchCopies, onPlaced, onCredits, onClose, initialPreview, onGenerated, brandKey, brandName, betType, promptLane }: {
  articleId: string;
  articleTitle?: string; // 배경 오브젝트 주제 힌트
  promptLane?: "home" | "search"; // ★프롬프트 강도(2026-08-17: 검색형=약한 후킹, 홈판=강한 감정)
  /** ★무문구 모드용 홈판 유형 키 — 소재 문법이 여기서 갈린다(lib/thumbSubject) */
  betType?: string;
  copies: string[] | null; // 썸네일 문구 추천(상위 공유)
  slots: { idx: number; desc: string }[]; // 배치 가능한 사진 슬롯
  onFetchCopies: () => void;
  onPlaced: (idx: number, url: string) => void;
  onCredits?: (n: number) => void;
  onClose: () => void;
  /** 시트를 닫아도 생성물이 사라지지 않게 — 상위가 보존한 마지막 결과 */
  initialPreview?: string | null;
  onGenerated?: (url: string) => void;
  brandKey?: string; // ★블로그별 폰트 고정(앨범 일관성)
  brandName?: string; // ★활성 블로그명(실측: 서버 조회가 첫 블로그 고정 — 박카에 경제 이름)
}) {
  const [text, setText] = useState("");
  const [palette, setPalette] = useState(SWATCHES[0].name);
  const [tone, setTone] = useState("mid");
  const [bgKind, setBgKind] = useState<"photo" | "plain" | "upload" | "textless">("photo"); // photo=일러스트(2026-07-09 실사 폐기 — 프롬프트가 일러스트), 기본=일러스트. upload=내 사진(무료)
  const [promptCopied, setPromptCopied] = useState(false);
  const promptRollRef = useRef(0); // ★리롤(2026-08-17 v3) — 누를 때마다 다른 장면 조합 // 썸네일 프롬프트 복사 표시
  const [promptBusy, setPromptBusy] = useState(false);
  const [promptText, setPromptText] = useState<string | null>(null); // 클립보드 차단 시 수동 복사
  const [customBg, setCustomBg] = useState<string | null>(null); // 유저 업로드 배경(1080 정방 크롭 dataURL)
  const fileRef = useRef<HTMLInputElement>(null);
  const fontKey = `ateflo_tfont_${brandKey ?? ""}`;
  const [font, setFontRaw] = useState("GmarketSansBold");
  useEffect(() => { try { const v = localStorage.getItem(fontKey); if (v) setFontRaw(v); } catch { /* ignore */ } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontKey]);
  const setFont = (f: string) => { setFontRaw(f); try { localStorage.setItem(fontKey, f); } catch { /* ignore */ } }; // ★한 번 고르면 이 블로그 고정(실측: 앨범뷰 폰트 뒤죽박죽)
  const [busy, setBusy] = useState(false);
  const retryRef = useRef<{ copy: string; n: number }>({ copy: "", n: 0 });
  const [preview, setPreview] = useState<string | null>(initialPreview ?? null);
  const [err, setErr] = useState<string | null>(null);
  // ★무문구 AI 2회 실패 시 받는 촬영 주문서(유저가 직접 찍는 경로)
  const [shotBrief, setShotBrief] = useState<string | null>(null);
  const [placed, setPlaced] = useState<number | null>(null);

  useEffect(() => {
    if (!copies) onFetchCopies();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function make() {
    if (busy) return;
    if (bgKind !== "textless" && !text.trim()) return; // 무문구는 문구가 필요 없다
    if (bgKind === "upload" && !customBg) { fileRef.current?.click(); return; } // 사진 미선택 — 선택창부터
    setBusy(true); setErr(null); setShotBrief(null); setPreview(null); setPlaced(null);
    try {
      const r = await fetch("/api/images/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbMaker: true, lane: promptLane ?? "home", ...(bgKind === "textless" ? { textless: true, betType } : {}), mainCopy: text.trim(), paletteName: palette, wash: TONES.find((t) => t.key === tone)?.wash ?? 0.35, aiBg: bgKind === "photo" || bgKind === "textless", ...(bgKind === "upload" && customBg ? { customBg } : {}), bgStyle: "photo", articleId, fontName: font, title: articleTitle, brandName, variant: (() => { if (retryRef.current.copy === text.trim()) { retryRef.current.n += 1; } else { retryRef.current = { copy: text.trim(), n: 0 }; } return retryRef.current.n; })() }),
      });
      const d = await r.json();
      if (d.textlessFailed) { setErr(d.error ?? "만들지 못했어요"); setShotBrief(typeof d.manualBrief === "string" ? d.manualBrief : null); if (typeof d.credits === "number") onCredits?.(d.credits); }
      else if (!r.ok) { setErr(d.error ?? "만들지 못했어요"); if (typeof d.credits === "number") onCredits?.(d.credits); }
      else { const u = d.url ?? d.dataUrl ?? null; setPreview(u); if (u) onGenerated?.(u); if (typeof d.credits === "number") onCredits?.(d.credits); if (d.aiFailReason && !d.usedAiBackground) setErr(`AI 배경 실패 → 단색 폴백 (${d.aiFailReason}) · 크레딧은 환불됐어요`); }
    } catch { setErr("네트워크 오류예요. 다시 시도해 주세요."); }
    setBusy(false);
  }

  async function place(idx: number) {
    if (!preview) return;
    setPlaced(idx);
    onPlaced(idx, preview);
    // 서버 저장 — 글 images에 병합(재방문 유지)
    try {
      await fetch(`/api/articles/${articleId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: { [String(idx)]: preview } }) });
    } catch { /* 기기 반영은 이미 됨 */ }
  }

  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="ateflo-sheet-up at-thin-scroll flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
        <p className="text-[17px] font-bold text-neutral-900">썸네일 만들기</p>
        <p className="mt-1 text-[12.5px] text-neutral-400">{bgKind === "textless" ? "사진이 주인공이에요 — 글자 없이 스크롤을 멈춥니다." : "문구가 주인공이에요 — 배경은 은은하게 깔려요."}</p>

        {/* 문구 — 추천 칩 클릭 또는 직접 입력. ★무문구 모드에선 통째로 숨긴다(조판이 없어 들어갈 자리가 없다) */}
        {bgKind !== "textless" && <>
        <p className="mt-4 text-[13px] font-bold text-neutral-700">문구</p>
        {copies && copies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {copies.map((c) => (
              <button key={c} onClick={() => setText((v) => (v === c ? "" : c))} className={`at-press rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${text === c ? "tk-grad-cta text-white" : "bg-neutral-50 text-neutral-700 ring-1 ring-black/[0.05]"}`}>{c}</button>
            ))}
          </div>
        )}
        <input value={text} onChange={(e) => setText([...e.target.value].slice(0, 18).join(""))} placeholder="직접 입력 (최대 18자)"
          className="mt-2 w-full rounded-[12px] bg-neutral-50 px-4 py-3 text-[14px] font-semibold outline-none ring-1 ring-black/[0.05] placeholder:text-neutral-300 focus:ring-2 focus:ring-[#1D75F7]/30" />
        </>}
        {bgKind === "textless" && (
          <p className="mt-4 rounded-[12px] bg-[#1D75F7]/[0.06] px-4 py-3 text-[12.5px] font-medium leading-relaxed text-[#1D75F7]">
            글자 없이 사진 한 장으로 만들어요. 제목에서 소재를 뽑아 그립니다.
          </p>
        )}

        {/* 배경색 */}
        <p className="mt-4 text-[13px] font-bold text-neutral-700">배경색</p>
        <div className="mt-2 flex gap-2">
          {SWATCHES.map((s) => (
            <button key={s.name} onClick={() => setPalette(s.name)} aria-label={s.label}
              className={`h-9 w-9 rounded-full transition ${palette === s.name ? "ring-2 ring-[#1D75F7] ring-offset-2" : "ring-1 ring-black/10"}`}
              style={{ background: `linear-gradient(135deg, ${s.bg} 55%, ${s.dot})` }} />
          ))}
        </div>

        {/* 폰트 — 블로그별 고정(앨범 일관성) */}
        <p className="mt-4 text-[13px] font-bold text-neutral-700">글씨체 <span className="text-[11px] font-medium text-neutral-400">한 번 고르면 이 블로그에 계속 적용 — 앨범이 통일돼요</span></p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {[
            { key: "GmarketSansBold", label: "G마켓산스" },
            { key: "BlackHanSans", label: "블랙한" },
            { key: "Pretendard-Black", label: "프리텐다드" },
            { key: "Jua", label: "주아" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFont(f.key)} className={`at-press rounded-[10px] py-2 text-[12px] font-bold transition ${font === f.key ? "bg-[#1D75F7]/[0.08] text-[#1D75F7] ring-1 ring-[#1D75F7]/40" : "bg-neutral-50 text-neutral-500"}`}>{f.label}</button>
          ))}
        </div>

        {/* 오브젝트 톤 */}
        <p className="mt-4 text-[13px] font-bold text-neutral-700">배경 오브젝트</p>
        <div className="mt-2 flex gap-1.5">
          {TONES.map((t) => (
            <button key={t.key} onClick={() => setTone(t.key)} className={`at-press flex-1 rounded-[10px] py-2 text-[12.5px] font-bold transition ${tone === t.key ? "bg-[#1D75F7]/[0.08] text-[#1D75F7] ring-1 ring-[#1D75F7]/40" : "bg-neutral-50 text-neutral-500"}`}>{t.label}</button>
          ))}
        </div>

        {/* ★썸네일 이미지 프롬프트(2026-08-17 유저: 외부 도구로 생성→'내 사진'으로 넣는 흐름) —
            돼지통 규격(1200² 중앙 70%·스타일 5종 로테이션·주제별 색·소품≤2·무텍스트)을 담아 복사 */}
        <button onClick={async () => {
          // ★v4(2026-08-17): 서버 장면 설계(제목·키워드 → 주제 앵커 장면) 우선 — 실패·지연 시 로컬 v3 폴백.
          //  클립보드 쓰기는 유저 제스처 직후가 아니면 막힐 수 있어, 실패하면 텍스트를 펼쳐 수동 복사로.
          const roll = promptRollRef.current++;
          const local = buildThumbImagePrompt(articleTitle ?? "", null, promptLane ?? "home", `${articleId}:${roll}`);
          setPromptBusy(true);
          let text = local;
          try {
            const r = await fetch("/api/thumb-prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId, roll }) });
            const j = await r.json().catch(() => null);
            if (j?.prompt) text = String(j.prompt);
          } catch { /* 로컬 폴백 */ }
          setPromptBusy(false);
          try { await navigator.clipboard.writeText(text); setPromptCopied(true); setPromptText(null); setTimeout(() => setPromptCopied(false), 1500); }
          catch { setPromptText(text); } // 클립보드 차단 — 수동 복사 UI
        }}
          className="at-press mt-3 w-full rounded-xl bg-[#8134AF]/10 py-2.5 text-[12.5px] font-bold text-[#8134AF] transition hover:bg-[#8134AF]/15">
          {promptBusy ? "이 글에 맞는 장면을 설계하는 중…" : promptCopied ? "복사됨 ✓ — 다시 누르면 다른 장면이 나와요" : "🎨 썸네일 이미지 프롬프트 복사 (외부 생성용)"}
        </button>
        {promptText && (
          <div className="mt-2 rounded-xl bg-neutral-50 p-3">
            <p className="text-[11.5px] font-semibold text-neutral-500">자동 복사가 막혔어요 — 아래를 길게 눌러 복사하세요</p>
            <textarea readOnly value={promptText} rows={4} className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white p-2 text-[11px] leading-relaxed text-neutral-700" onFocus={(e) => e.currentTarget.select()} />
          </div>
        )}
        {/* 배경 종류 — 실사 기본(주제 사진 깔고 정중앙 문구). 내 사진=유저 업로드(무료) */}
        <p className="mt-4 text-[13px] font-bold text-neutral-700">배경</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {[
            { k: "photo" as const, label: "일러스트", sub: `추천 · ${IMAGE_COST}cr` },
            { k: "plain" as const, label: "색면", sub: "무료" },
            { k: "upload" as const, label: "내 사진", sub: customBg ? "선택됨 ✓" : "무료" },
            // ★무문구(2026-08-02) — 조판 없이 이미지 한 장. 홈피드에서 조판 카드는 광고로 읽힌다.
            { k: "textless" as const, label: "문구 없이", sub: `홈판 · ${IMAGE_COST}cr` },
          ].map((o) => (
            <button key={o.k} onClick={() => { setBgKind(o.k); if (o.k === "upload") fileRef.current?.click(); }} className={`at-press rounded-[12px] px-2 py-2.5 text-center transition ${bgKind === o.k ? "bg-[#1D75F7] ring-2 ring-[#1D75F7]" : "bg-neutral-50"}`}>
              <span className={`block text-[12.5px] font-bold ${bgKind === o.k ? "text-white" : "text-neutral-700"}`}>{o.label}</span>
              <span className={`mt-0.5 block text-[10.5px] ${bgKind === o.k ? "text-white/80" : o.k === "upload" && customBg ? "text-emerald-600 font-semibold" : "text-neutral-400"}`}>{o.sub}</span>
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // 같은 파일 재선택 허용
          if (!f) return;
          try {
            const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
            const img = await new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
            // 1080 정방 커버 크롭 — 페이로드 축소 + 렌더 규격 일치
            const S = 1080, cv = document.createElement("canvas"); cv.width = S; cv.height = S;
            const ctx = cv.getContext("2d")!;
            const sc = Math.max(S / img.width, S / img.height);
            ctx.drawImage(img, (S - img.width * sc) / 2, (S - img.height * sc) / 2, img.width * sc, img.height * sc);
            setCustomBg(cv.toDataURL("image/jpeg", 0.86));
            setBgKind("upload");
          } catch { setErr("사진을 읽지 못했어요. 다른 사진으로 시도해 주세요."); }
        }} />

        <button onClick={make} disabled={(bgKind !== "textless" && !text.trim()) || busy} className="at-press tk-grad-cta mt-4 w-full rounded-[12px] py-3.5 text-[15px] font-bold text-white disabled:opacity-50">
          {busy
            ? <><span className="tk-wand mr-1.5" aria-hidden>✦</span>썸네일을 만들고 있어요</>
            : <>{preview ? "다시 만들기" : "썸네일 만들기"}<span className="ml-1.5 text-[12.5px] font-semibold text-white/75">{bgKind === "photo" || bgKind === "textless" ? `· ${IMAGE_COST}크레딧` : "· 무료"}</span></>}
        </button>
        {err && <p className="mt-2 text-[12.5px] font-medium text-amber-600">{err}</p>}
        {/* ★AI가 두 번 실패하면 조판 카드로 되돌아가지 않고 촬영 주문서를 준다(유저 확정 운영 방식) */}
        {shotBrief && (
          <div className="mt-2 rounded-2xl bg-neutral-50 p-4">
            <p className="text-[12.5px] font-bold text-neutral-900">직접 찍어주세요</p>
            {/* ★왜 실패했는지 보여준다(2026-08-02) — 사유가 안 보여서 매번 추측으로 원인을 찾고 있었다 */}
            {err && <p className="mt-0.5 text-[11px] font-medium text-amber-600">AI가 못 만든 이유: {err.replace(/^이미지를 못 만들었어요 \(|\) · 크레딧은 환불됐어요$/g, "")}</p>}
            <pre className="mt-1.5 whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-neutral-600">{shotBrief}</pre>
            <button onClick={() => fileRef.current?.click()} className="at-press mt-2.5 w-full rounded-xl bg-white py-2.5 text-[12.5px] font-bold text-neutral-800 ring-1 ring-neutral-200">
              찍은 사진 올리기
            </button>
          </div>
        )}

        {/* 미리보기 + 슬롯 배치 */}
        {preview && (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="썸네일 미리보기" className="w-full rounded-[14px]" />
            <button onClick={async () => {
              try {
                const r = await fetch(preview); const b = await r.blob();
                const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "ateflo-thumbnail.png"; a.click(); URL.revokeObjectURL(a.href);
              } catch { /* ignore */ }
            }} className="at-press mt-2 w-full rounded-[10px] bg-neutral-100 py-2.5 text-[12.5px] font-bold text-neutral-600 transition hover:bg-neutral-200">💾 원본 화질로 저장</button>
            <p className="mt-3 text-[13px] font-bold text-neutral-700">어디에 넣을까요?</p>
            <div className="mt-2 space-y-1.5">
              <button onClick={async () => {
                if (!preview) return;
                setPlaced(-1);
                try { await fetch(`/api/articles/${articleId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: { top: preview } }) }); } catch { /* ignore */ }
                onPlaced(-1, preview);
              }} className={`at-press flex w-full items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-left text-[12.5px] font-semibold transition ${placed === -1 ? "bg-emerald-50 text-emerald-700" : "bg-[#1D75F7]/[0.06] text-[#1D75F7] hover:bg-[#1D75F7]/[0.1]"}`}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10.5px] font-bold ring-1 ring-black/10">↑</span>
                <span className="min-w-0 flex-1">맨 위 · 제목 바로 아래 (대표컷)</span>
                {placed === -1 && <span className="shrink-0 text-[11px] font-bold">넣었어요</span>}
              </button>
              {slots.map((sl) => (
                <button key={sl.idx} onClick={() => place(sl.idx)}
                  className={`at-press flex w-full items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-left text-[12.5px] font-semibold transition ${placed === sl.idx ? "bg-emerald-50 text-emerald-700" : "bg-neutral-50 text-neutral-700 hover:bg-neutral-100"}`}>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10.5px] font-bold ring-1 ring-black/10">{sl.idx + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{sl.idx === 0 ? "1번 · 대표이미지 자리 (추천)" : sl.desc}</span>
                  {placed === sl.idx && <span className="shrink-0 text-[11px] font-bold">넣었어요</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} className="mt-3 w-full py-2 text-center text-sm font-medium text-neutral-400 transition hover:text-neutral-700">닫기</button>
      </div>
    </div>
  );
}
