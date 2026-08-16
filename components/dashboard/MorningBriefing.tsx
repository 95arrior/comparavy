"use client";

import { useRef, useState } from "react";

/**
 * ★아침 브리핑(답안지 레인 1단계, 2026-08-10) — docs/answer-sheet-lane.md
 * 네이버 크리에이터 어드바이저 '인기유입검색어'를 통째로 붙여넣으면
 * 검색어 추출 → 며칠째 등장 → 문서수 측정 → "오늘 심을 것"을 골라준다.
 * 판단은 전부 서버 몫(뇌빼기) — 유저는 복사·붙여넣기·버튼 하나.
 */

interface BriefItem { keyword: string; days: number; docs: number | null; verdict: "direct" | "variant" | "written" | "unmeasured" | "blocked"; reason?: string }
interface DayLog { date: string; keywords: string[] }

const LS_KEY = "ateflo_answer_sheet_days";

function kstToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}
function loadHistory(): DayLog[] {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

/** 스크린샷을 서버로 보내기 전 축소(레티나 캡처 수 MB → 수백 KB, 비전 인식엔 충분). */
function shrinkImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1400 / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export default function MorningBriefing({ onWrite }: { onWrite: (keyword: string, sel: Record<string, unknown>) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<BriefItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 스크린샷 지원 — 유저의 자연 습관은 캡처(⌘V·파일 선택 둘 다). 텍스트 복사를 가르치지 않는다.
  async function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 4 - images.length);
    for (const f of picked) {
      const dataUrl = await shrinkImage(f);
      if (dataUrl) setImages((prev) => (prev.length >= 4 ? prev : [...prev, dataUrl]));
    }
  }
  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter((f): f is File => Boolean(f));
    if (files.length > 0) { e.preventDefault(); void addFiles(files); }
  }

  async function analyze() {
    const raw = text.trim();
    if ((!raw && images.length === 0) || busy) return;
    setBusy(true); setErr(null);
    try {
      const today = kstToday();
      const history = loadHistory().filter((d) => d.date !== today);
      const res = await fetch("/api/briefing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw, images, history }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "분석에 실패했어요. 다시 시도해 주세요."); return; }
      setItems(data.items as BriefItem[]);
      setOpen(false); // 결과는 접힌 화면에 뜬다 — 분석이 끝나면 바로 보여줘야 한다(붙여넣기 원문은 볼 일이 끝났다)
      setImages([]); // 다음 붙여넣기를 위해 비운다(원문 텍스트는 남겨 재분석 가능)
      // 오늘 목록을 기록 — 내일부터 'N일째'가 자동으로 계산된다(같은 날 재분석은 합집합).
      // ★검증된 것만 저장(2026-08-10): 스크린샷 오독('민심지않금')이 기록에 들어가면 연속일수가 오염된다.
      //  문서수가 실측된 키워드(직행·변형)와 이미 심은 키워드만 실존이 증명된 것이다.
      const parsed: string[] = (data.items as BriefItem[] ?? [])
        .filter((i) => i.verdict === "direct" || i.verdict === "variant" || i.verdict === "written")
        .map((i) => i.keyword);
      const rest = loadHistory().filter((d) => d.date !== today);
      const prevToday = loadHistory().find((d) => d.date === today)?.keywords ?? [];
      const merged = Array.from(new Set([...prevToday, ...parsed]));
      localStorage.setItem(LS_KEY, JSON.stringify([...rest, { date: today, keywords: merged }].slice(-7)));
    } catch {
      setErr("네트워크가 잠깐 불안정해요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const picks = (items ?? []).filter((i) => i.verdict === "direct");
  const variants = (items ?? []).filter((i) => i.verdict === "variant");
  const writtenOnes = (items ?? []).filter((i) => i.verdict === "written");
  const restCount = (items ?? []).filter((i) => i.verdict === "unmeasured" || i.verdict === "blocked").length;

  return (
    <section className="mb-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-extrabold text-neutral-900">아침 브리핑</h2>
          <p className="mt-0.5 text-[12px] text-neutral-500">어제 실제로 유입을 만든 검색어에서, 오늘 심을 것만 골라드려요</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="at-press shrink-0 rounded-full bg-[#1D75F7]/[0.08] px-3.5 py-1.5 text-[12px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/[0.14]"
        >
          {open ? "접기" : items ? "다시 붙여넣기" : "붙여넣기"}
        </button>
      </div>

      {open && (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            rows={4}
            placeholder={"통계(크리에이터 어드바이저) → 검색 유입 트렌드 화면의\n스크린샷을 여기 붙여넣거나(⌘V), 화면 글자를 복사해 넣어도 돼요"}
            className="w-full resize-none rounded-xl border border-neutral-200 bg-[#FAFBFC] p-3 text-[13px] leading-relaxed text-neutral-800 outline-none transition focus:border-[#1D75F7]/50 focus:bg-white"
          />
          <div className="mt-2 flex items-center gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`스크린샷 ${i + 1}`} className="h-full w-full object-cover" />
                <button onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} aria-label="스크린샷 빼기"
                  className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl-lg bg-black/50 text-[10px] font-bold text-white">×</button>
              </div>
            ))}
            {images.length < 4 && (
              <button onClick={() => fileRef.current?.click()}
                className="at-press h-12 shrink-0 rounded-lg border border-dashed border-neutral-300 px-3 text-[12px] font-bold text-neutral-400 transition hover:border-[#1D75F7]/50 hover:text-[#1D75F7]">
                {images.length > 0 ? "+ 추가" : "스크린샷 올리기"}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
          </div>
          <button
            onClick={analyze}
            disabled={busy || (!text.trim() && images.length === 0)}
            className="at-press mt-2 w-full rounded-xl bg-[#1D75F7] py-2.5 text-[13px] font-bold text-white transition hover:bg-[#1667DE] disabled:opacity-50"
          >
            {busy ? "검색어 추출하고 문서수 재는 중…" : "오늘 심을 키워드 고르기"}
          </button>
          {err && <p className="mt-2 text-[12px] font-semibold text-rose-500">{err}</p>}
        </div>
      )}

      {items && !open && (
        <div className="mt-3 space-y-1.5">
          {picks.length === 0 && (
            <p className="rounded-xl bg-[#FAFBFC] px-3 py-2.5 text-[12.5px] text-neutral-500">
              오늘은 선점 구간 검색어가 없어요 — 내일 아침 다시 붙여넣어 보세요.
            </p>
          )}
          {picks.slice(0, 8).map((i) => (
            <div key={i.keyword} className="flex items-center gap-2 rounded-xl bg-[#F5F9FF] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-neutral-900">{i.keyword}</span>
              <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#1D75F7]">{i.days >= 2 ? `${i.days}일째` : "신규"}</span>
              {i.docs != null && <span className="shrink-0 text-[11.5px] font-semibold text-neutral-500">글 {i.docs.toLocaleString()}편</span>}
              <button
                onClick={() => onWrite(i.keyword, { species: "answer_sheet", asDocs: i.docs, asDays: i.days, asDate: kstToday() })}
                className="at-press shrink-0 rounded-full bg-[#1D75F7] px-3 py-1 text-[11.5px] font-bold text-white transition hover:bg-[#1667DE]"
              >
                이 키워드로 쓰기
              </button>
            </div>
          ))}
          {variants.slice(0, 4).map((i) => (
            <div key={i.keyword} className="flex items-center gap-2 rounded-xl bg-[#FAFBFC] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-neutral-600">{i.keyword}</span>
              <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-600">글 {i.docs?.toLocaleString()}편 — 이미 붐벼요</span>
            </div>
          ))}
          {writtenOnes.slice(0, 4).map((i) => (
            <div key={i.keyword} className="flex items-center gap-2 rounded-xl bg-[#FAFBFC] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-neutral-400">{i.keyword}</span>
              <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">이미 심었어요 ✓</span>
            </div>
          ))}
          {restCount > 0 && (
            <p className="px-1 pt-1 text-[11.5px] text-neutral-400">그 외 {restCount}개는 측정 대기·차단으로 뺐어요</p>
          )}
        </div>
      )}
    </section>
  );
}
