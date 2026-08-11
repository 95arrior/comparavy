"use client";

import { useEffect, useState } from "react";

/**
 * ★인스타 카드뉴스 시트(2026-08-11 유저: "네이버만 올리는 게 아깝다") — 완성 글을 카드 문구로 압축해 보여준다.
 * 이미지는 유저가 직접 구한다(문구만). 장수 6~10 가변(캐러셀 상한 10장). 캐시는 글 단위 localStorage.
 */

interface InstaCard { head: string; body: string }
interface ClipSegment { say: string; motion: string }
interface ClipScript { hook: ClipSegment; segments: ClipSegment[]; character: string; background: string; styleAnchor: string; cta: string; oneTake?: string }
interface InstaPack { cover: string; cards: InstaCard[]; cta: InstaCard; caption: string; clip?: ClipScript }

export default function InstaCardsSheet({ articleId, onClose }: { articleId: string; onClose: () => void }) {
  const [pack, setPack] = useState<InstaPack | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const lsKey = `ateflo_insta_${articleId}`;

  async function build(force = false) {
    if (busy) return;
    if (!force) {
      try { const c = JSON.parse(localStorage.getItem(lsKey) ?? "null"); if (c?.cover) { setPack(c); return; } } catch { /* 재생성 */ }
    }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/social/insta-cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "실패했어요. 다시 시도해 주세요."); return; }
      setPack(data.pack as InstaPack);
      try { localStorage.setItem(lsKey, JSON.stringify(data.pack)); } catch { /* 무해 */ }
    } catch { setErr("네트워크가 잠깐 불안정해요."); } finally { setBusy(false); }
  }
  useEffect(() => { void build(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  function copy(label: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(null), 1200); });
  }
  const allText = pack
    ? [`[표지]\n${pack.cover}`, ...pack.cards.map((c, i) => `[${i + 2}장] ${c.head}\n${c.body}`), `[마지막 장] ${pack.cta.head}\n${pack.cta.body}`, `[캡션]\n${pack.caption}`,
       ...(pack.clip && Array.isArray(pack.clip.segments) && typeof pack.clip.hook === "object" ? [`[클립 대본]\n컷1: ${pack.clip.hook.say} (프롬프트: ${pack.clip.hook.motion})\n${pack.clip.segments.map((g, i) => `컷${i + 2}: ${g.say} (프롬프트: ${g.motion})`).join("\n")}\n마무리: ${pack.clip.cta}`] : [])].join("\n\n")
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-extrabold text-neutral-900">인스타 카드 + 클립 대사</h3>
            <p className="mt-0.5 text-[12px] text-neutral-500">문구만 만들어요 — 이미지는 직접 구해서 카드마다 얹으면 돼요 (총 {pack ? pack.cards.length + 2 : "6~10"}장)</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => void build(true)} disabled={busy} className="at-press rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] font-bold text-neutral-500 transition hover:text-neutral-800 disabled:opacity-60">{busy ? "…" : "다시"}</button>
            <button onClick={onClose} className="at-press rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] font-bold text-neutral-500 transition hover:text-neutral-800">닫기</button>
          </div>
        </div>

        {busy && !pack && <p className="py-10 text-center text-[13px] text-neutral-400">글을 카드 문구로 압축하는 중…</p>}
        {err && <p className="py-3 text-[12.5px] font-semibold text-rose-500">{err}</p>}

        {pack && (
          <div className="space-y-2">
            <div className="rounded-xl bg-[#111] p-4 text-center">
              <p className="whitespace-pre-line text-[17px] font-extrabold leading-snug text-white">{pack.cover}</p>
              <button onClick={() => copy("cover", pack.cover)} className="mt-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/80">{copied === "cover" ? "복사됨 ✓" : "표지 문구 복사"}</button>
            </div>
            {pack.cards.map((c, i) => (
              <div key={i} className="rounded-xl bg-[#F7F8FA] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-extrabold text-neutral-900">{i + 2}. {c.head}</p>
                  <button onClick={() => copy(`c${i}`, `${c.head}\n${c.body}`)} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-500 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">{copied === `c${i}` ? "✓" : "복사"}</button>
                </div>
                <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-neutral-600">{c.body}</p>
              </div>
            ))}
            <div className="rounded-xl border border-dashed border-[#1D75F7]/40 bg-[#F5F9FF] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13.5px] font-extrabold text-[#1D75F7]">마지막. {pack.cta.head}</p>
                <button onClick={() => copy("cta", `${pack.cta.head}\n${pack.cta.body}`)} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-500">{copied === "cta" ? "✓" : "복사"}</button>
              </div>
              <p className="mt-1 whitespace-pre-line text-[12.5px] text-neutral-600">{pack.cta.body}</p>
            </div>
            <div className="rounded-xl bg-[#F7F8FA] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-extrabold text-neutral-700">캡션 + 해시태그</p>
                <button onClick={() => copy("cap", pack.caption)} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-500">{copied === "cap" ? "✓" : "복사"}</button>
              </div>
              <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-neutral-500">{pack.caption}</p>
            </div>
            {pack.clip && Array.isArray(pack.clip.segments) && typeof pack.clip.hook === "object" && (
              <div className="rounded-xl bg-[#F7F8FA] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-extrabold text-neutral-700">🎬 클립 대본 — 10초 컷 {pack.clip.segments.length + 1}개</p>
                  <button onClick={() => copy("clip", [{ n: 1, ...pack.clip!.hook }, ...pack.clip!.segments.map((g, i) => ({ n: i + 2, ...g }))].map((g) => `[컷 ${g.n} 대사] ${g.say}\n[컷 ${g.n} 프롬프트] ${g.motion}`).concat(`[마무리 대사] ${pack.clip!.cta}`).join("\n\n"))} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-500">{copied === "clip" ? "✓" : "대사+프롬프트"}</button>
                </div>
                {pack.clip.oneTake && (
                  <div className="mt-2 rounded-xl border border-[#8134AF]/30 bg-[#8134AF]/[0.04] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11.5px] font-extrabold text-[#8134AF]">⚡ 20초 통대본 — 이미지 1장 + 이 대사 한 방이면 끝</p>
                      <button onClick={() => copy("onetake", pack.clip!.oneTake!)} className="shrink-0 rounded-full bg-[#8134AF] px-2.5 py-1 text-[10.5px] font-bold text-white">{copied === "onetake" ? "✓" : "복사"}</button>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-neutral-700">{pack.clip.oneTake}</p>
                  </div>
                )}
                <button onClick={() => copy("clipsay", [pack.clip!.hook.say, ...pack.clip!.segments.map((g) => g.say), pack.clip!.cta].join("\n\n"))}
                  className="at-press mt-2 w-full rounded-xl bg-[#8134AF] py-2.5 text-[13px] font-bold text-white transition hover:opacity-90">
                  {copied === "clipsay" ? "복사됨 ✓ — TTS에 그대로 붙여넣으세요" : "🎤 컷별 풀대본 복사 (60초판)"}
                </button>
                {pack.clip.character && (
                  <div className="mt-2 rounded-lg bg-white p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11.5px] font-extrabold text-neutral-600">🧸 이 주제의 캐릭터 (모든 컷 동일)</p>
                      <button onClick={() => copy("char", `${pack.clip!.character} ${pack.clip!.background} Character sheet, full body, front view, plain background, no text.`)}
                        className="shrink-0 rounded-full bg-[#8134AF]/10 px-2 py-0.5 text-[10.5px] font-bold text-[#8134AF]">{copied === "char" ? "✓" : "캐릭터 이미지용 프롬프트"}</button>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{pack.clip.character} <span className="text-neutral-400">{pack.clip.background}</span></p>
                  </div>
                )}
                <div className="mt-1.5 space-y-1.5">
                  {[{ ...pack.clip.hook, label: "훅 컷 1" }, ...pack.clip.segments.map((g, i) => ({ ...g, label: `컷 ${i + 2}` }))].map((g, i) => (
                    <div key={i} className="rounded-lg bg-white p-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] leading-relaxed text-neutral-700"><b>{g.label}.</b> 🎤 {g.say}</p>
                        <button onClick={() => copy(`cm${i}`, g.motion)} className="shrink-0 rounded-full bg-[#8134AF]/10 px-2 py-0.5 text-[10.5px] font-bold text-[#8134AF]">{copied === `cm${i}` ? "✓" : "프롬프트 복사"}</button>
                      </div>
                      <p className="mt-0.5 text-[11px] italic leading-relaxed text-[#8134AF]">🎥 {g.motion}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1D75F7]">마무리 대사: "{pack.clip.cta}" — 마지막 컷 영상에 얹으면 돼요</p>
              </div>
            )}
            <button onClick={() => copy("all", allText)} className="at-press w-full rounded-xl bg-[#1D75F7] py-2.5 text-[13px] font-bold text-white transition hover:bg-[#1667DE]">{copied === "all" ? "전체 복사됨 ✓" : "전체 복사 (메모용)"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
