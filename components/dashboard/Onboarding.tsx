"use client";

import { useState, useEffect } from "react";
import { ONLINE_CATEGORIES } from "@/lib/bloggerTypes";
import { defaultBlogName } from "@/lib/blogName";
import LoadingScreen from "@/components/LoadingScreen";
import type { BlogProfile } from "@/lib/blogProfile";

// 토스식 온보딩 — 네이버 수익형 단일. 한 화면 = 한 질문, 최소 스텝(주제 → 확인 → 완료).
// 편집은 ProfileSettings가 담당(분리). 이건 신규(initial=null) 전용.

type Step = "sub" | "review" | "done";

// 한글 초성 추출 — "재테크" → "ㅈㅌㅋ". 초성 검색용.
const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
function toCho(s: string): string {
  return [...s].map((ch) => {
    const code = ch.charCodeAt(0) - 0xac00;
    return code >= 0 && code <= 11171 ? CHO[Math.floor(code / 588)] : ch;
  }).join("");
}
// 칩 검색 매칭 — 부분일치(재→재테크) + 초성(ㅈㅌ→재테크).
function matchSub(chip: string, q: string): boolean {
  const query = q.replace(/\s/g, "");
  if (!query) return true;
  const c = chip.replace(/\s/g, "");
  if (c.includes(query)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(query)) return toCho(c).includes(query);
  return false;
}

// 직접입력 가비지 가드(클라 즉시판정 — 의존성 없는 순수버전). 자판난타·자모·의미없음 차단.
function isGarbageInput(raw: string): boolean {
  const k = (raw ?? "").trim();
  const meaningful = k.match(/[가-힣a-zA-Z]/g) ?? [];
  if (meaningful.length < 2) return true;
  if (new Set(meaningful.map((c) => c.toLowerCase())).size < 2) return true;
  if (/^[a-zA-Z\s]+$/.test(k) && !/[aeiou]/i.test(k)) return true;
  return false;
}

export default function Onboarding({ onSaved, onCancel }: { onSaved: (p: BlogProfile) => void; onCancel?: () => void }) {
  const [step, setStep] = useState<Step>("sub");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [customErr, setCustomErr] = useState("");
  const [sub, setSub] = useState("");
  const [customSub, setCustomSub] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<BlogProfile | null>(null);

  // 온보딩 동안 바깥 페이지(회색 래퍼/body) 스크롤 잠금 — 고정 화면 보장
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const inputCls = "w-full rounded-xl bg-neutral-100 px-4 py-3.5 text-base outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30";
  const primaryBtn = "w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50";
  const skipBtn = "mt-2 w-full py-2 text-sm font-medium text-neutral-400 transition hover:text-neutral-600 disabled:opacity-50";

  const order: Step[] = ["sub", "review", "done"];
  const idx = order.indexOf(step);
  const goBack = () => { setDir("back"); setStep(order[Math.max(idx - 1, 0)]); };

  function pickSub(s: string) {
    setSub(s); setDir("fwd"); setStep("review");
  }
  // 직접입력 제출 — 가비지면 막고(가드), 통과하면 진행
  function submitCustom() {
    const v = customSub.trim();
    if (!v) return;
    if (isGarbageInput(v)) { setCustomErr("그건 주제로 보기 어려워요. 다시 입력해 주세요."); return; }
    setCustomErr(""); pickSub(v);
  }

  async function save() {
    if (saving || !sub) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/blog-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: "online", sub_category: sub, blog_name: defaultBlogName(sub),
          publish_mode: "manual",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "저장하지 못했어요."); return; }
      setSavedProfile(data.profile as BlogProfile);
      setDir("fwd"); setStep("done");
    } catch { setError("네트워크 오류예요. 잠시 후 다시 시도해 주세요."); }
    finally { setSaving(false); }
  }

  const dots = order.filter((s) => s !== "done");

  // 하단 고정 버튼(모바일 앱 표준) — 스텝별 액션. sub(탭 진행)·done 외.
  const footer =
    step === "review" ? (
      <>
        <button onClick={save} disabled={saving} className={primaryBtn}>{saving ? "저장 중…" : "맞아요, 시작할게요"}</button>
        <button onClick={goBack} disabled={saving} className={skipBtn}>수정할게요</button>
      </>
    ) : step === "done" ? (
      <button onClick={() => savedProfile && onSaved(savedProfile)} className={primaryBtn}>첫 글 쓰러 가기</button>
    ) : null;

  return (
    // 화면 전체 고정 — 회색 래퍼 위를 덮고 스크롤 차단. h-[100dvh]로 주소바 토글에 높이 맞춤, 버튼 하단 고정(safe-area).
    <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md px-6 pt-7 pb-4">
      {/* 취소 — 설정에서 재진입(재온보딩)일 때만. 원래 설정으로 복귀 */}
      {onCancel && step !== "done" && (
        <div className="mb-2 flex justify-end">
          <button onClick={onCancel} className="text-sm font-medium text-neutral-400 transition hover:text-neutral-700">취소</button>
        </div>
      )}

      {/* 진행 점 */}
      {step !== "done" && (
        <div className="mb-8 flex items-center justify-center gap-1.5">
          {dots.map((s) => (
            <span key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-5 bg-[#1D75F7]" : dots.indexOf(s) < dots.indexOf(step) ? "w-1.5 bg-[#1D75F7]/40" : "w-1.5 bg-neutral-200"}`} />
          ))}
        </div>
      )}

      {/* 뒤로가기 (첫 화면·완료 제외) */}
      {step !== "sub" && step !== "done" && (
        <button onClick={goBack} className="mb-3 -ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700">
          <span className="text-base leading-none">←</span> 뒤로
        </button>
      )}

      <div key={step} className={`min-h-[300px] ${dir === "back" ? "ateflo-slide-back" : "ateflo-slide-fwd"}`}>
        {/* 1) 주제 — 어떤 주제로 수익 낼 건가 */}
        {step === "sub" && (
          <div>
            <h2 className="font-pretendard whitespace-pre-line text-2xl font-bold tracking-tight">{"어떤 주제로\n수익 낼 거예요?"}</h2>
            <p className="mt-2 text-sm text-neutral-500">고른 주제로 검색되는 글감을 추천해드려요. 나중에 바꿀 수 있어요.</p>
            {/* 검색바(고정) — 부분일치 + 초성(ㅈㅌ→재테크) */}
            <div className="relative mt-4">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <input
                value={customSub}
                onChange={(e) => { setCustomSub(e.target.value); if (customErr) setCustomErr(""); }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const f = ONLINE_CATEGORIES.filter((s) => matchSub(s, customSub));
                  if (f.length === 1) pickSub(f[0]);
                  else if (customSub.trim() && !ONLINE_CATEGORIES.includes(customSub.trim())) submitCustom();
                }}
                placeholder="검색 또는 직접 입력 (예: 재테크 · ㅈㅌ)"
                maxLength={40}
                className={`${inputCls} pl-10`}
              />
            </div>
            {customErr && <p className="mt-2 text-xs font-medium text-amber-600">{customErr}</p>}
            {/* 칩 스크롤 영역 — 검색 결과만 */}
            {(() => {
              const filtered = ONLINE_CATEGORIES.filter((s) => matchSub(s, customSub));
              const q = customSub.trim();
              return (
                <div className="no-scrollbar mt-3 max-h-[42vh] overflow-y-auto">
                  {filtered.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filtered.map((s) => (
                        <button key={s} onClick={() => pickSub(s)} className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-[#1D75F7] hover:bg-[#1D75F7]/[0.03] active:scale-95">{s}</button>
                      ))}
                    </div>
                  )}
                  {/* 목록에 없는 거 입력 → 직접 시작 */}
                  {q && !ONLINE_CATEGORIES.includes(q) && (
                    <button onClick={submitCustom} className="mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-[#1D75F7]/40 bg-[#1D75F7]/[0.04] px-4 py-3 text-left text-sm font-semibold text-[#1D75F7] transition hover:bg-[#1D75F7]/[0.07] active:scale-[0.99]">
                      ＋ ‘{q}’ (으)로 직접 시작하기
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* 2) 확인 */}
        {step === "review" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">이 주제로 시작할까요?</h2>
            <p className="mt-2 text-sm text-neutral-500">맞으면 시작할게요. 나중에 바꿀 수 있어요.</p>
            <dl className="mt-5 divide-y divide-neutral-100 rounded-2xl bg-white ring-1 ring-black/[0.04]">
              {([
                ["주제", sub],
                ["블로그 이름", defaultBlogName(sub)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex gap-3 px-4 py-3">
                  <dt className="w-16 shrink-0 text-[13px] font-medium text-neutral-400">{k}</dt>
                  <dd className="min-w-0 flex-1 break-words text-[14px] font-medium text-neutral-800">{v}</dd>
                </div>
              ))}
            </dl>
            {error && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}
          </div>
        )}

        {/* 완료 — 화면 중앙, 파란 체크가 그려지듯 */}
        {step === "done" && (
          <div className="flex min-h-[58vh] flex-col items-center justify-center text-center">
            <span className="ateflo-circle-pop flex h-20 w-20 items-center justify-center rounded-full bg-[#1D75F7] text-white shadow-[0_12px_44px_rgba(29,117,247,0.45)]">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="ateflo-check-draw" d="M5 13l4 4L19 7" /></svg>
            </span>
            <h2 className="font-pretendard mt-6 text-2xl font-bold tracking-tight">다 됐어요! 🎉</h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-neutral-600">네이버 블로그 수익화,<br />지금부터 시작이에요.</p>
          </div>
        )}
        </div>
        </div>
      </div>
      {footer && (
        <div
          className="sticky bottom-0 z-20 border-t border-neutral-100 bg-white/95 px-6 pt-3.5 backdrop-blur"
          style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-md">{footer}</div>
        </div>
      )}
      {saving && <LoadingScreen label="블로그를 준비하고 있어요" />}
    </div>
  );
}
