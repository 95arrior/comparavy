"use client";

import { useEffect, useState } from "react";
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

export default function ThumbMakerSheet({ articleId, articleTitle, copies, slots, onFetchCopies, onPlaced, onCredits, onClose, initialPreview, onGenerated }: {
  articleId: string;
  articleTitle?: string; // 배경 오브젝트 주제 힌트
  copies: string[] | null; // 썸네일 문구 추천(상위 공유)
  slots: { idx: number; desc: string }[]; // 배치 가능한 사진 슬롯
  onFetchCopies: () => void;
  onPlaced: (idx: number, url: string) => void;
  onCredits?: (n: number) => void;
  onClose: () => void;
  /** 시트를 닫아도 생성물이 사라지지 않게 — 상위가 보존한 마지막 결과 */
  initialPreview?: string | null;
  onGenerated?: (url: string) => void;
}) {
  const [text, setText] = useState("");
  const [palette, setPalette] = useState(SWATCHES[0].name);
  const [tone, setTone] = useState("mid");
  const [bgKind, setBgKind] = useState<"photo" | "toss" | "plain">("photo"); // 기본=실사(유저 확정)
  const [font, setFont] = useState("GmarketSansBold");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(initialPreview ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [placed, setPlaced] = useState<number | null>(null);

  useEffect(() => {
    if (!copies) onFetchCopies();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function make() {
    if (!text.trim() || busy) return;
    setBusy(true); setErr(null); setPreview(null); setPlaced(null);
    try {
      const r = await fetch("/api/images/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbMaker: true, mainCopy: text.trim(), paletteName: palette, wash: TONES.find((t) => t.key === tone)?.wash ?? 0.35, aiBg: bgKind !== "plain", bgStyle: bgKind === "toss" ? "toss" : "photo", articleId, fontName: font, title: articleTitle }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "만들지 못했어요"); if (typeof d.credits === "number") onCredits?.(d.credits); }
      else { const u = d.url ?? d.dataUrl ?? null; setPreview(u); if (u) onGenerated?.(u); if (typeof d.credits === "number") onCredits?.(d.credits); }
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
        <p className="mt-1 text-[12.5px] text-neutral-400">문구가 주인공이에요 — 배경은 은은하게 깔려요.</p>

        {/* 문구 — 추천 칩 클릭 또는 직접 입력 */}
        <p className="mt-4 text-[13px] font-bold text-neutral-700">문구</p>
        {copies && copies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {copies.map((c) => (
              <button key={c} onClick={() => setText(c)} className={`at-press rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${text === c ? "tk-grad-cta text-white" : "bg-neutral-50 text-neutral-700 ring-1 ring-black/[0.05]"}`}>{c}</button>
            ))}
          </div>
        )}
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 20))} placeholder="직접 입력 (최대 20자)"
          className="mt-2 w-full rounded-[12px] bg-neutral-50 px-4 py-3 text-[14px] font-semibold outline-none ring-1 ring-black/[0.05] placeholder:text-neutral-300 focus:ring-2 focus:ring-[#1D75F7]/30" />

        {/* 배경색 */}
        <p className="mt-4 text-[13px] font-bold text-neutral-700">배경색</p>
        <div className="mt-2 flex gap-2">
          {SWATCHES.map((s) => (
            <button key={s.name} onClick={() => setPalette(s.name)} aria-label={s.label}
              className={`h-9 w-9 rounded-full transition ${palette === s.name ? "ring-2 ring-[#1D75F7] ring-offset-2" : "ring-1 ring-black/10"}`}
              style={{ background: `linear-gradient(135deg, ${s.bg} 55%, ${s.dot})` }} />
          ))}
        </div>

        {/* 폰트 */}
        <p className="mt-4 text-[13px] font-bold text-neutral-700">글씨체</p>
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

        {/* 배경 종류 — 실사 기본(주제 사진 깔고 정중앙 문구) */}
        <p className="mt-4 text-[13px] font-bold text-neutral-700">배경</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[
            { k: "photo" as const, label: "실사 사진", sub: `추천 · ${IMAGE_COST}cr` },
            { k: "toss" as const, label: "3D 일러스트", sub: `${IMAGE_COST}cr` },
            { k: "plain" as const, label: "단색", sub: "무료" },
          ].map((o) => (
            <button key={o.k} onClick={() => setBgKind(o.k)} className={`at-press rounded-[12px] px-2 py-2.5 text-center transition ${bgKind === o.k ? "bg-[#1D75F7]/[0.08] ring-1 ring-[#1D75F7]/40" : "bg-neutral-50"}`}>
              <span className={`block text-[12.5px] font-bold ${bgKind === o.k ? "text-[#1D75F7]" : "text-neutral-700"}`}>{o.label}</span>
              <span className="mt-0.5 block text-[10.5px] text-neutral-400">{o.sub}</span>
            </button>
          ))}
        </div>

        <button onClick={make} disabled={!text.trim() || busy} className="at-press tk-grad-cta mt-4 w-full rounded-[12px] py-3.5 text-[15px] font-bold text-white disabled:opacity-50">
          {busy
            ? <><span className="tk-wand mr-1.5" aria-hidden>✦</span>썸네일을 만들고 있어요</>
            : <>{preview ? "다시 만들기" : "썸네일 만들기"}<span className="ml-1.5 text-[12.5px] font-semibold text-white/75">{bgKind !== "plain" ? `· ${IMAGE_COST}크레딧` : "· 무료"}</span></>}
        </button>
        {err && <p className="mt-2 text-[12.5px] font-medium text-amber-600">{err}</p>}

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
            }} className="at-press mt-2 w-full rounded-[10px] bg-neutral-100 py-2.5 text-[12.5px] font-bold text-neutral-600 transition hover:bg-neutral-200">💾 내 기기에 저장 (네이버 대표이미지로 올릴 때)</button>
            <p className="mt-3 text-[13px] font-bold text-neutral-700">어디에 넣을까요?</p>
            <div className="mt-2 space-y-1.5">
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
