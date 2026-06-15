"use client";

import { useState } from "react";
import { TONE_CHOICES, TYPE_CHOICES, type BlogProfile } from "@/lib/blogProfile";
import { isTopCategory, subsOf, ALL_SUB } from "@/lib/categories";
import CategoryPicker from "./CategoryPicker";

const BRAND = "#3f91ff";
const STEPS = ["카테고리", "이름", "문체", "유형", "타겟", "발행"] as const;

/**
 * 블로그 설정 — 단계별 온보딩. ①카테고리(대분류+세부) ②이름 ③문체 ④유형 ⑤타겟 ⑥발행안내.
 * 세부를 고르면 그 범위로 키워드 발굴이 좁혀진다(topic = 세부, "전체"면 대분류).
 */
export default function BlogSetup({
  initial,
  onSaved,
}: {
  initial?: BlogProfile | null;
  onSaved: (p: BlogProfile) => void;
}) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(initial?.category ?? (initial && isTopCategory(initial.topic) ? initial.topic : ""));
  const [sub, setSub] = useState(
    initial ? (initial.topic && initial.topic !== (initial.category ?? "") ? initial.topic : ALL_SUB) : "",
  );
  const [blogName, setBlogName] = useState(initial?.blog_name ?? "");
  const [tone, setTone] = useState(initial?.tone ?? "friendly");
  const [articleType, setArticleType] = useState(initial?.article_type ?? "info");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial;
  const last = STEPS.length - 1;

  const topic = sub === ALL_SUB ? category : sub; // 키워드 발굴 검색어
  const defaultName = category ? `${category} 블로그` : "";
  const canNext = step === 0 ? isTopCategory(category) && sub !== "" : true;

  function next() {
    if (!canNext) { setError("카테고리와 세부 분류를 골라주세요."); return; }
    setError(null);
    if (step < last) setStep(step + 1);
  }
  function back() { setError(null); if (step > 0) setStep(step - 1); }

  async function save() {
    if (!topic || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/blog-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic, category, blog_name: blogName.trim(),
          tone, article_type: articleType, target: target.trim(), publish_mode: "manual",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "저장하지 못했어요."); return; }
      onSaved(data.profile as BlogProfile);
    } catch {
      setError("네트워크 오류예요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  const chip = (on: boolean) =>
    `rounded-xl border px-4 py-3 text-sm font-medium transition ${
      on ? "border-[#3f91ff] bg-[#3f91ff]/5 text-[#2f7fe6]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
    }`;
  const smallChip = (on: boolean) =>
    `rounded-lg border px-3 py-2 text-sm font-medium transition ${
      on ? "border-[#3f91ff] bg-[#3f91ff]/5 text-[#2f7fe6]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
    }`;
  const inputCls =
    "mt-4 w-full rounded-xl border border-neutral-200 px-4 py-3.5 text-base outline-none transition focus:border-[#3f91ff] focus:ring-2 focus:ring-[#3f91ff]/20";

  return (
    <div className="mx-auto max-w-md pt-6">
      {/* 진행 표시 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => { if (i <= step || (isEdit && topic)) setStep(i); }}
              className="flex flex-col items-center gap-1.5"
              aria-label={`${i + 1}단계 ${s}`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                i < step ? "bg-[#3f91ff] text-white" : i === step ? "bg-[#3f91ff] text-white ring-4 ring-[#3f91ff]/15" : "bg-neutral-100 text-neutral-400"
              }`}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className={`text-[11px] ${i === step ? "font-semibold text-neutral-800" : "text-neutral-400"}`}>{s}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-[#3f91ff] transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <p className="mt-2 text-right text-xs text-neutral-400">{step + 1} / {STEPS.length}</p>
      </div>

      {/* 단계 내용 */}
      <div key={step} className="ateflo-step-in min-h-[240px]">
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">어떤 블로그인가요?</h2>
            <p className="mt-2 text-sm text-neutral-500">카테고리를 고르고, 세부 분류로 좁혀요. <b>좁힐수록 경쟁이 낮아</b> 유리해요.</p>
            <CategoryPicker value={category} onSelect={(c) => { setCategory(c); setSub(""); }} autoFocus topOnly />
            {isTopCategory(category) && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-neutral-400">세부 분류</p>
                <div className="flex flex-wrap gap-2">
                  {subsOf(category).map((s) => (
                    <button key={s} type="button" onClick={() => setSub(s)} className={smallChip(sub === s)}>
                      {s === ALL_SUB ? "전체" : s}
                    </button>
                  ))}
                </div>
                {sub && sub !== ALL_SUB && (
                  <p className="mt-3 text-xs text-neutral-400">‘<b className="text-neutral-600">{sub}</b>’ 범위로 키워드를 발굴해요.</p>
                )}
              </div>
            )}
          </div>
        )}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">블로그 이름을 정해요</h2>
            <p className="mt-2 text-sm text-neutral-500">내 블로그 같은 이름이면 좋아요. 나중에 워드프레스 연결에도 써요.</p>
            <input value={blogName} onChange={(e) => setBlogName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") next(); }} placeholder="예: 월급쟁이 부동산 일기" maxLength={60} className={inputCls} />
            <p className="mt-2 text-xs text-neutral-400">비우면 <b className="text-neutral-600">‘{defaultName}’</b>로 정해져요.</p>
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">어떤 말투로 쓸까요?</h2>
            <p className="mt-2 text-sm text-neutral-500">글 전체의 문체를 정해요.</p>
            <div className="mt-5 grid gap-2">
              {TONE_CHOICES.map((c) => (
                <button key={c.value} type="button" onClick={() => setTone(c.value)} className={chip(tone === c.value)}>{c.label}</button>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">글 유형은요?</h2>
            <p className="mt-2 text-sm text-neutral-500">정보를 전달하는 글인지, 단계별 가이드인지.</p>
            <div className="mt-5 grid gap-2">
              {TYPE_CHOICES.map((c) => (
                <button key={c.value} type="button" onClick={() => setArticleType(c.value)} className={chip(articleType === c.value)}>{c.label}</button>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">누가 읽을 글인가요? <span className="text-sm font-normal text-neutral-400">(선택)</span></h2>
            <p className="mt-2 text-sm text-neutral-500">타겟 독자를 적으면 눈높이에 맞춰 써요. 비워도 괜찮아요.</p>
            <input value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") next(); }} placeholder="예: 초보 견주" maxLength={80} className={inputCls} />
          </div>
        )}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-bold tracking-tight">발행은 이렇게 돼요</h2>
            <div className="mt-5 rounded-2xl border border-[#3f91ff]/20 bg-[#3f91ff]/5 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#2f7fe6]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                매일 1터치
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">매일 한 번, 발행 버튼만 누르면 글이 올라가요.</p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-400">직접 한 번씩 확인하며 올리는 방식이에요. ‘블로그 시작’을 누르면 바로 연구소로 가요.</p>
          </div>
        )}
      </div>

      {error && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <div className="mt-8 flex items-center gap-2">
        {step > 0 && (
          <button onClick={back} className="rounded-xl border border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-600 transition hover:border-neutral-400">이전</button>
        )}
        {step < last ? (
          <button onClick={next} disabled={!canNext} className="flex-1 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40" style={{ backgroundColor: BRAND }}>다음</button>
        ) : (
          <button onClick={save} disabled={saving} className="flex-1 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-50" style={{ backgroundColor: BRAND }}>
            {saving ? "저장 중…" : isEdit ? "설정 저장" : "설정 끝, 블로그 시작"}
          </button>
        )}
      </div>
    </div>
  );
}
