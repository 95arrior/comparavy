"use client";

import { useState } from "react";
import HoursEditor from "./HoursEditor";
import AddressSearch from "./AddressSearch";
import { VERTICAL_SUBS } from "@/lib/verticalSubs";
import { ACADEMY_AUDIENCES, AUDIENCE_ALL } from "@/lib/audience";
import { formatKoreanPhone } from "@/lib/businessBox";
import type { BlogProfile, WeeklyHours } from "@/lib/blogProfile";

// 토스식 온보딩 — 한 화면 = 한 질문. 옆으로 쓱 전환 + 핵심칸 자동 포커스. 인증 대신 '확인' 화면으로 오타 방지.
// 편집은 ProfileSettings가 담당(분리). 이건 신규(initial=null) 전용.

const VERTS = [
  { v: "medical", label: "병의원", desc: "환자가 찾는 질환·치료 정보", icon: <path d="M12 7v10M7 12h10" /> },
  { v: "academy", label: "학원·교습소", desc: "학부모·학생이 찾는 학습·입시", icon: <><path d="M3 6.5 12 3l9 3.5L12 10 3 6.5z" /><path d="M7 8.5V13c0 1.5 2.2 2.5 5 2.5s5-1 5-2.5V8.5" /></> },
  { v: "professional", label: "법률·세무·노무", desc: "의뢰인이 찾는 절차·비용", icon: <><path d="M12 3v18M5 7h14M7 7l-3 6h6l-3-6zM17 7l-3 6h6l-3-6z" /></> },
  { v: "general", label: "그 외 업종", desc: "가게·서비스 등 무엇이든", icon: <><path d="M4 9h16l-1 11H5L4 9z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></> },
] as const;

const REASSURE_SHORT: Record<string, string> = {
  medical: "환자분들이 검색하는 글로 써드릴게요",
  academy: "학부모·학생이 검색하는 글로 써드릴게요",
  professional: "의뢰인이 검색하는 글로 써드릴게요",
  general: "손님이 검색할 만한 글로 써드릴게요",
};
const VLABEL: Record<string, string> = Object.fromEntries(VERTS.map((x) => [x.v, x.label]));

type Step = "vertical" | "sub" | "blogName" | "audience" | "biz" | "hours" | "strength" | "review" | "done";

export default function Onboarding({ onSaved }: { onSaved: (p: BlogProfile) => void }) {
  const [step, setStep] = useState<Step>("vertical");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [vertical, setVertical] = useState("");
  const [sub, setSub] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customSub, setCustomSub] = useState("");
  const [blogName, setBlogName] = useState("");
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

  const toggleAud = (v: string) =>
    setAudience((prev) =>
      v === AUDIENCE_ALL
        ? (prev.includes(AUDIENCE_ALL) ? [] : [AUDIENCE_ALL])
        : (() => { const n = prev.filter((x) => x !== AUDIENCE_ALL); return n.includes(v) ? n.filter((x) => x !== v) : [...n, v]; })());

  const inputCls = "w-full rounded-xl border border-neutral-200 px-4 py-3.5 text-base outline-none transition focus:border-[#3f91ff] focus:ring-2 focus:ring-[#3f91ff]/20";
  const primaryBtn = "w-full rounded-xl bg-[#3f91ff] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50";
  const skipBtn = "mt-2 w-full py-2 text-sm font-medium text-neutral-400 transition hover:text-neutral-600 disabled:opacity-50";

  // 화면 순서 — audience는 academy만. done 제외하고 진행 점 표시.
  const order: Step[] = ["vertical", "sub", "blogName", ...(vertical === "academy" ? (["audience"] as Step[]) : []), "biz", "hours", "strength", "review", "done"];
  const idx = order.indexOf(step);
  const goNext = () => { setDir("fwd"); setStep(order[Math.min(idx + 1, order.length - 1)]); };
  const goBack = () => { setDir("back"); setStep(order[Math.max(idx - 1, 0)]); };

  function pick(v: string) {
    setVertical(v); setSub(""); setCustomMode(false); setCustomSub("");
    setDir("fwd"); setStep("sub");
  }
  function pickSub(s: string) { setSub(s); setDir("fwd"); setStep("blogName"); }

  async function save() {
    if (saving || !vertical) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/blog-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical, sub_category: sub, blog_name: blogName.trim(),
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

  return (
    <div className="mx-auto max-w-md px-6 pt-8">
      {/* 진행 점 */}
      {step !== "done" && (
        <div className="mb-8 flex items-center justify-center gap-1.5">
          {dots.map((s) => (
            <span key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-5 bg-[#3f91ff]" : dots.indexOf(s) < dots.indexOf(step) ? "w-1.5 bg-[#3f91ff]/40" : "w-1.5 bg-neutral-200"}`} />
          ))}
        </div>
      )}

      {/* 뒤로가기 (첫 화면·완료 제외) */}
      {step !== "vertical" && step !== "done" && (
        <button onClick={goBack} className="mb-3 -ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700">
          <span className="text-base leading-none">←</span> 뒤로
        </button>
      )}

      <div key={step} className={`min-h-[300px] ${dir === "back" ? "ateflo-slide-back" : "ateflo-slide-fwd"}`}>
        {/* 1) 업종 */}
        {step === "vertical" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">어떤 곳을 운영하세요?</h2>
            <p className="mt-2 text-sm text-neutral-500">업종에 맞춰 글을 써드릴게요.</p>
            <div className="mt-6 grid gap-2.5">
              {VERTS.map((x) => (
                <button key={x.v} onClick={() => pick(x.v)} className="flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-[#3f91ff] hover:bg-[#3f91ff]/[0.03] active:scale-[0.99]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3f91ff]/10 text-[#3f91ff]">
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
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">{VLABEL[vertical]} 중<br />어떤 분야세요?</h2>
            <p className="mt-2 text-sm text-neutral-500">분야에 딱 맞는 키워드로 써드릴게요.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(VERTICAL_SUBS[vertical] ?? []).map((s) => (
                <button key={s} onClick={() => pickSub(s)} className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-[#3f91ff] hover:bg-[#3f91ff]/[0.03] active:scale-95">{s}</button>
              ))}
            </div>
            {!customMode ? (
              <button onClick={() => setCustomMode(true)} className="mt-4 text-sm font-medium text-[#3f91ff] transition hover:underline">＋ 직접 입력하기</button>
            ) : (
              <div className="mt-4">
                <input value={customSub} onChange={(e) => setCustomSub(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && customSub.trim()) pickSub(customSub.trim()); }} placeholder="예: 통증의학과" maxLength={40} className={inputCls} autoFocus />
                <button onClick={() => customSub.trim() && pickSub(customSub.trim())} disabled={!customSub.trim()} className={`mt-3 ${primaryBtn}`}>계속</button>
              </div>
            )}
          </div>
        )}

        {/* 3) 블로그 이름 */}
        {step === "blogName" && (
          <div>
            <p className="mb-4 rounded-xl bg-[#3f91ff]/[0.06] px-3.5 py-2.5 text-[13px] font-medium text-[#2f7fe6]">{sub} 블로그, {REASSURE_SHORT[vertical]}</p>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">블로그 이름을 정해볼까요?</h2>
            <p className="mt-2 text-sm text-neutral-500">나중에 바꿀 수 있어요.</p>
            <input value={blogName} onChange={(e) => setBlogName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") goNext(); }} placeholder="예: 우리동네치과 건강이야기" maxLength={60} className={`mt-5 ${inputCls}`} autoFocus />
            <button onClick={goNext} className={`mt-8 ${primaryBtn}`}>계속</button>
          </div>
        )}

        {/* 4) 대상 (academy만) */}
        {step === "audience" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">누구를 주로<br />가르치세요?</h2>
            <p className="mt-2 text-sm text-neutral-500">고른 대상이 검색할 만한 글감만 추천해 드려요. (여러 개 선택 가능)</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {ACADEMY_AUDIENCES.map((a) => (
                <button key={a.value} type="button" onClick={() => toggleAud(a.value)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${audience.includes(a.value) ? "border-[#3f91ff] bg-[#3f91ff]/10 font-semibold text-[#3f91ff]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}>
                  {a.label}
                </button>
              ))}
            </div>
            <button onClick={goNext} className={`mt-8 ${primaryBtn}`}>계속</button>
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
            <input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} onBlur={() => setBizPhone(formatKoreanPhone(bizPhone))} placeholder="전화번호 (예: 010-1234-5678)" maxLength={40} className={`mt-3 ${inputCls}`} />
            <p className="mt-2 text-xs text-neutral-500">휴대폰·매장 어떤 번호든 괜찮아요. 입력하면 자동으로 정리해 드려요.</p>
            <button onClick={goNext} className={`mt-7 ${primaryBtn}`}>계속</button>
          </div>
        )}

        {/* 6) 영업시간 (스킵 가능) */}
        {step === "hours" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">영업시간을<br />알려주세요</h2>
            <p className="mt-2 text-sm text-neutral-500">요일별로 설정하면 글에 깔끔하게 정리돼요.</p>
            <div className="mt-5"><HoursEditor value={hours} onChange={setHours} /></div>
            <button onClick={goNext} className={`mt-6 ${primaryBtn}`}>계속</button>
            <button onClick={goNext} className={skipBtn}>나중에 할게요</button>
          </div>
        )}

        {/* 7) 강점 (스킵 가능) */}
        {step === "strength" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">어떤 점이<br />강점이세요?</h2>
            <p className="mt-2 text-sm text-neutral-500">글 마무리에 자연스럽게 녹여 드려요.</p>
            <input value={bizStrength} onChange={(e) => setBizStrength(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") goNext(); }} placeholder="예: 입시 영어 전문, 원장 직강, 주말 진료" maxLength={200} className={`mt-5 ${inputCls}`} autoFocus />
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">과장 표현(1위·최고·100%·보장 등)은 광고법 위반이라 피해주세요. 실제 특징을 사실대로 적어주세요.</p>
            <button onClick={goNext} className={`mt-7 ${primaryBtn}`}>계속</button>
            <button onClick={goNext} className={skipBtn}>나중에 할게요</button>
          </div>
        )}

        {/* 8) 확인 */}
        {step === "review" && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">이 정보가 맞나요?</h2>
            <p className="mt-2 text-sm text-neutral-500">맞으면 시작할게요. 틀린 게 있으면 수정할 수 있어요.</p>
            <dl className="mt-5 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
              {[
                ["업종", `${VLABEL[vertical] ?? vertical}${sub ? ` · ${sub}` : ""}`],
                ["블로그 이름", blogName.trim() || "(자동 생성)"],
                ...(vertical === "academy" ? [["대상", audience.length ? audience.join(", ") : "(미설정)"] as [string, string]] : []),
                ["상호", bizName.trim() || "(미입력)"],
                ["주소", [bizAddress, bizDetail].filter(Boolean).join(" ").trim() || "(미입력)"],
                ["전화", bizPhone.trim() || "(미입력)"],
                ["영업시간", hoursCount ? `${hoursCount}개 요일 설정` : "(미입력)"],
                ["강점", bizStrength.trim() || "(미입력)"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 px-4 py-3">
                  <dt className="w-16 shrink-0 text-[13px] font-medium text-neutral-400">{k}</dt>
                  <dd className="min-w-0 flex-1 break-words text-[14px] font-medium text-neutral-800">{v}</dd>
                </div>
              ))}
            </dl>
            {error && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}
            <button onClick={save} disabled={saving} className={`mt-6 ${primaryBtn}`}>{saving ? "저장 중…" : "맞아요, 시작할게요"}</button>
            <button onClick={goBack} disabled={saving} className={skipBtn}>수정할게요</button>
          </div>
        )}

        {/* 완료 */}
        {step === "done" && (
          <div className="flex flex-col items-center pt-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.4)]">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <h2 className="font-pretendard mt-5 text-2xl font-bold tracking-tight">준비 끝!</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">이제 키워드 하나만 고르면<br />첫 글이 나와요.</p>
            <button onClick={() => savedProfile && onSaved(savedProfile)} className={`mt-8 ${primaryBtn}`}>첫 글 쓰러 가기</button>
          </div>
        )}
      </div>
    </div>
  );
}
