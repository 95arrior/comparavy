"use client";

import { useState, useEffect } from "react";
import HoursEditor from "./HoursEditor";
import AddressSearch from "./AddressSearch";
import { VERTICAL_SUBS } from "@/lib/verticalSubs";
import { BLOGGER_TYPE_CARDS, categoriesFor, type BloggerType } from "@/lib/bloggerTypes";
import { defaultBlogName } from "@/lib/blogName";
import { ACADEMY_AUDIENCES, AUDIENCE_ALL } from "@/lib/audience";
import { formatKoreanPhone } from "@/lib/businessBox";
import LoadingScreen from "@/components/LoadingScreen";
import type { BlogProfile, WeeklyHours } from "@/lib/blogProfile";

// 토스식 온보딩 — 한 화면 = 한 질문. 옆으로 쓱 전환 + 핵심칸 자동 포커스. 인증 대신 '확인' 화면으로 오타 방지.
// 편집은 ProfileSettings가 담당(분리). 이건 신규(initial=null) 전용.

const VERTS = [
  { v: "medical", label: "병원·약국", desc: "환자가 찾는 질환·치료 정보", icon: <path d="M12 7v10M7 12h10" /> },
  { v: "academy", label: "교육·학원", desc: "학부모·학생이 찾는 학습·입시", icon: <><path d="M3 6.5 12 3l9 3.5L12 10 3 6.5z" /><path d="M7 8.5V13c0 1.5 2.2 2.5 5 2.5s5-1 5-2.5V8.5" /></> },
  { v: "professional", label: "법률·세무", desc: "의뢰인이 찾는 절차·비용", icon: <><path d="M12 3v18M5 7h14M7 7l-3 6h6l-3-6zM17 7l-3 6h6l-3-6z" /></> },
  { v: "general", label: "기타", desc: "가게·서비스 등 무엇이든", icon: <><path d="M4 9h16l-1 11H5L4 9z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></> },
] as const;

const VLABEL: Record<string, string> = Object.fromEntries(VERTS.map((x) => [x.v, x.label]));

type Step = "type" | "vertical" | "sub" | "audience" | "biz" | "hours" | "strength" | "review" | "done";

// 한글 초성 추출 — "성형외과" → "ㅅㅎㅇㄱ". 초성 검색용.
const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
function toCho(s: string): string {
  return [...s].map((ch) => {
    const code = ch.charCodeAt(0) - 0xac00;
    return code >= 0 && code <= 11171 ? CHO[Math.floor(code / 588)] : ch;
  }).join("");
}
// 칩 검색 매칭 — 부분일치(성→성형외과) + 초성(ㅅㅎ→성형외과).
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
  const [step, setStep] = useState<Step>("type");
  const [bType, setBType] = useState<BloggerType>("local"); // local/online/hobby — vertical로 인코딩
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [customErr, setCustomErr] = useState("");
  const [vertical, setVertical] = useState("");
  const [sub, setSub] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customSub, setCustomSub] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizDetail, setBizDetail] = useState("");
  const [bizLat, setBizLat] = useState<number | null>(null);
  const [bizLng, setBizLng] = useState<number | null>(null);
  const [bizPhone, setBizPhone] = useState("");
  const [bizStrength, setBizStrength] = useState("");
  const [audience, setAudience] = useState<string[]>([]);
  const [hours, setHours] = useState<WeeklyHours>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<BlogProfile | null>(null);

  // 온보딩 동안 바깥 페이지(회색 래퍼/body) 스크롤 잠금 — 고정 화면 보장
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const toggleAud = (v: string) =>
    setAudience((prev) =>
      v === AUDIENCE_ALL
        ? (prev.includes(AUDIENCE_ALL) ? [] : [AUDIENCE_ALL])
        : (() => { const n = prev.filter((x) => x !== AUDIENCE_ALL); return n.includes(v) ? n.filter((x) => x !== v) : [...n, v]; })());

  const inputCls = "w-full rounded-xl border border-neutral-200 px-4 py-3.5 text-base outline-none transition focus:border-[#1D75F7] focus:ring-2 focus:ring-[#1D75F7]/20";
  const primaryBtn = "w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50";
  const skipBtn = "mt-2 w-full py-2 text-sm font-medium text-neutral-400 transition hover:text-neutral-600 disabled:opacity-50";

  // 화면 순서 — local은 풀스텝, online/hobby는 주소·시간·강점 스킵. done 제외하고 진행 점 표시.
  const isLocal = bType === "local";
  const order: Step[] = isLocal
    ? ["type", "vertical", "sub", ...(vertical === "academy" ? (["audience"] as Step[]) : []), "biz", "hours", "strength", "review", "done"]
    : (["type", "sub", "review", "done"] as Step[]);
  const idx = order.indexOf(step);
  const goNext = () => { setDir("fwd"); setStep(order[Math.min(idx + 1, order.length - 1)]); };
  const goBack = () => { setDir("back"); setStep(order[Math.max(idx - 1, 0)]); };

  // 유형 선택 — local은 업종 화면으로, online/hobby는 vertical 인코딩 후 바로 카테고리로
  function pickType(t: BloggerType, v: string | null) {
    setBType(t); setSub(""); setCustomMode(false); setCustomSub(""); setCustomErr(""); setDir("fwd");
    if (t === "local") { setVertical(""); setStep("vertical"); }
    else { setVertical(v!); setStep("sub"); }
  }
  function pick(v: string) {
    setVertical(v); setSub(""); setCustomMode(false); setCustomSub(""); setCustomErr("");
    setDir("fwd"); setStep("sub");
  }
  function pickSub(s: string) {
    setSub(s); setDir("fwd");
    setStep(!isLocal ? "review" : vertical === "academy" ? "audience" : "biz");
  }
  // 직접입력 제출 — 가비지면 막고(가드), 통과하면 진행
  function submitCustom() {
    const v = customSub.trim();
    if (!v) return;
    if (isGarbageInput(v)) { setCustomErr("그건 주제로 보기 어려워요. 다시 입력해 주세요."); return; }
    setCustomErr(""); pickSub(v);
  }

  // sub 스텝 — local은 업종별 세부, online/hobby는 유형 카테고리
  const subCats = isLocal ? (VERTICAL_SUBS[vertical] ?? []) : categoriesFor(bType);
  const subHeading = isLocal ? `${VLABEL[vertical]} 중\n어떤 분야세요?` : bType === "online" ? "어떤 주제로\n수익 낼 거예요?" : "무슨 취미를\n기록하세요?";

  async function save() {
    if (saving || !vertical) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/blog-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical, sub_category: sub, blog_name: bizName.trim() || (sub ? defaultBlogName(sub) : ""),
          biz_name: bizName.trim(), biz_address: bizAddress.trim(), biz_detail_address: bizDetail.trim(),
          biz_lat: bizLat, biz_lng: bizLng, biz_phone: bizPhone.trim(), biz_strength: bizStrength.trim(),
          audience, biz_hours_json: hours, publish_mode: "manual",
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
  const hoursCount = Object.keys(hours).length;

  // 하단 고정 버튼(모바일 앱 표준) — 스텝별 액션. vertical/sub(탭 진행)·done은 footer 없음.
  const footer =
    step === "audience" || step === "biz" ? (
      <button onClick={goNext} className={primaryBtn}>계속</button>
    ) : step === "hours" || step === "strength" ? (
      <>
        <button onClick={goNext} className={primaryBtn}>계속</button>
        <button onClick={goNext} className={skipBtn}>나중에 할게요</button>
      </>
    ) : step === "review" ? (
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
      {step !== "type" && step !== "done" && (
        <button onClick={goBack} className="mb-3 -ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700">
          <span className="text-base leading-none">←</span> 뒤로
        </button>
      )}

      <div key={step} className={`min-h-[300px] ${dir === "back" ? "ateflo-slide-back" : "ateflo-slide-fwd"}`}>
        {/* 0) 유형 — 어떤 블로거인가 */}
        {step === "type" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">어떤 블로그를<br />운영하세요?</h2>
            <p className="mt-2 text-sm text-neutral-500">유형에 맞춰 글감·글을 다르게 추천해드려요.</p>
            <div className="mt-6 grid gap-2.5">
              {BLOGGER_TYPE_CARDS.map((c) => (
                <button key={c.type} onClick={() => pickType(c.type, c.vertical)} className="rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-[#1D75F7] hover:bg-[#1D75F7]/[0.03] active:scale-[0.99]">
                  <span className="block text-[15px] font-bold text-neutral-900">{c.label}</span>
                  <span className="mt-0.5 block text-[13px] text-neutral-500">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1) 업종 (local 전용) */}
        {step === "vertical" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">어떤 곳을 운영하세요?</h2>
            <p className="mt-2 text-sm text-neutral-500">업종에 맞춰 글을 써드릴게요.</p>
            <div className="mt-6 grid gap-2.5">
              {VERTS.map((x) => (
                <button key={x.v} onClick={() => pick(x.v)} className="flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-[#1D75F7] hover:bg-[#1D75F7]/[0.03] active:scale-[0.99]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1D75F7]/10 text-[#1D75F7]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{x.icon}</svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold text-neutral-900">{x.label}</span>
                    <span className="mt-0.5 block text-[13px] text-neutral-500">{x.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2) 세부 분야 */}
        {step === "sub" && (
          <div>
            <h2 className="font-pretendard whitespace-pre-line text-2xl font-bold tracking-tight">{subHeading}</h2>
            <p className="mt-2 text-sm text-neutral-500">{isLocal ? "검색하거나 골라주세요. 없으면 직접 입력해도 돼요." : "고른 주제의 검색되는 글감을 추천해드려요."}</p>
            {/* 검색바(고정) — 부분일치 + 초성(ㅅㅎ→성형외과) */}
            <div className="relative mt-4">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <input
                value={customSub}
                onChange={(e) => { setCustomSub(e.target.value); if (customErr) setCustomErr(""); }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const f = subCats.filter((s) => matchSub(s, customSub));
                  if (f.length === 1) pickSub(f[0]);
                  else if (customSub.trim() && !subCats.includes(customSub.trim())) submitCustom();
                }}
                placeholder="검색 또는 직접 입력 (예: 성형외과 · ㅅㅎ)"
                maxLength={40}
                className={`${inputCls} pl-10`}
              />
            </div>
            {customErr && <p className="mt-2 text-xs font-medium text-amber-600">{customErr}</p>}
            {/* 칩 스크롤 영역 — 검색 결과만 */}
            {(() => {
              const filtered = subCats.filter((s) => matchSub(s, customSub));
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
                  {q && !subCats.includes(q) && (
                    <button onClick={submitCustom} className="mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-[#1D75F7]/40 bg-[#1D75F7]/[0.04] px-4 py-3 text-left text-sm font-semibold text-[#1D75F7] transition hover:bg-[#1D75F7]/[0.07] active:scale-[0.99]">
                      ＋ ‘{q}’ (으)로 직접 시작하기
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* 대상 (academy만) */}
        {step === "audience" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">누구를 주로<br />가르치세요?</h2>
            <p className="mt-2 text-sm text-neutral-500">고른 대상이 검색할 만한 글감만 추천해 드려요. (여러 개 선택 가능)</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {ACADEMY_AUDIENCES.map((a) => (
                <button key={a.value} type="button" onClick={() => toggleAud(a.value)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${audience.includes(a.value) ? "border-[#1D75F7] bg-[#1D75F7]/10 font-semibold text-[#1D75F7]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5) 영업장 정보 (상호+주소+전화) */}
        {step === "biz" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">영업장 정보를<br />입력해주세요!</h2>
            <p className="mt-2 text-sm text-neutral-500">글 맨 아래에 자동으로 들어가요. 지금 안 해도 돼요.</p>
            <input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="상호명 (예: 우리동네치과의원)" maxLength={80} className={`mt-5 ${inputCls}`} autoFocus />
            <div className="mt-3">
              <AddressSearch address={bizAddress} detail={bizDetail} onPick={(r) => { setBizAddress(r.address); setBizLat(r.lat); setBizLng(r.lng); }} onDetailChange={setBizDetail} inputCls={inputCls} />
            </div>
            <input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} onBlur={() => setBizPhone(formatKoreanPhone(bizPhone))} inputMode="numeric" placeholder="‘-’ 없이 입력해주세요" maxLength={40} className={`mt-3 ${inputCls}`} />
            <p className="mt-2 text-xs text-neutral-500">숫자만 입력하면 자동으로 정리돼요. 휴대폰·매장 어떤 번호든 괜찮아요.</p>
          </div>
        )}

        {/* 6) 영업시간 (스킵 가능) */}
        {step === "hours" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">영업시간을<br />알려주세요</h2>
            <p className="mt-2 text-sm text-neutral-500">요일별로 설정하면 글에 깔끔하게 정리돼요.</p>
            <div className="mt-5"><HoursEditor value={hours} onChange={setHours} /></div>
          </div>
        )}

        {/* 7) 강점 (스킵 가능) */}
        {step === "strength" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">어떤 점이<br />강점이세요?</h2>
            <p className="mt-2 text-sm text-neutral-500">글 마무리에 자연스럽게 녹여 드려요.</p>
            <input value={bizStrength} onChange={(e) => setBizStrength(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") goNext(); }} placeholder="예: 입시 영어 전문, 원장 직강, 주말 진료" maxLength={200} className={`mt-5 ${inputCls}`} autoFocus />
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">과장 표현(1위·최고·100%·보장 등)은 광고법 위반이라 피해주세요. 실제 특징을 사실대로 적어주세요.</p>
          </div>
        )}

        {/* 8) 확인 */}
        {step === "review" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">이 정보가 맞나요?</h2>
            <p className="mt-2 text-sm text-neutral-500">맞으면 시작할게요. 틀린 게 있으면 수정할 수 있어요.</p>
            <dl className="mt-5 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
              {([
                ["분야", `${isLocal ? (VLABEL[vertical] ?? vertical) : bType === "online" ? "수익형 블로거" : "취미·기록"}${sub ? ` · ${sub}` : ""}`],
                ["블로그 이름", bizName.trim() || (sub ? defaultBlogName(sub) : "(자동 생성)")],
                ...(isLocal
                  ? [
                      ...(vertical === "academy" ? [["대상", audience.length ? audience.join(", ") : "(미설정)"]] : []),
                      ["상호", bizName.trim() || "(미입력)"],
                      ["주소", [bizAddress, bizDetail].filter(Boolean).join(" ").trim() || "(미입력)"],
                      ["전화", bizPhone.trim() || "(미입력)"],
                      ["영업시간", hoursCount ? `${hoursCount}개 요일 설정` : "(미입력)"],
                      ["강점", bizStrength.trim() || "(미입력)"],
                    ]
                  : []),
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
            <p className="mt-2.5 text-[15px] leading-relaxed text-neutral-600">성공적인 블로그 운영,<br />지금부터 시작이에요.</p>
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
