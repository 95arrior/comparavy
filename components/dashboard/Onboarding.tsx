"use client";

import { useState } from "react";
import HoursEditor from "./HoursEditor";
import { VERTICAL_SUBS } from "@/lib/verticalSubs";
import type { BlogProfile, WeeklyHours } from "@/lib/blogProfile";

// 토스식 온보딩 — 한 화면에 하나씩, 진행 표시, 사람 말투. 업종(vertical)만 고르면 나머지는 백엔드가 채움(Stage 1).
// 편집은 기존 BlogSetup이 담당(분리). 이건 신규(initial=null) 전용.

const VERTS = [
  { v: "medical", label: "병의원", desc: "환자가 찾는 질환·치료 정보", icon: <path d="M12 7v10M7 12h10" /> },
  { v: "academy", label: "학원·교습소", desc: "학부모·학생이 찾는 학습·입시", icon: <><path d="M3 6.5 12 3l9 3.5L12 10 3 6.5z" /><path d="M7 8.5V13c0 1.5 2.2 2.5 5 2.5s5-1 5-2.5V8.5" /></> },
  { v: "professional", label: "법률·세무·노무", desc: "의뢰인이 찾는 절차·비용", icon: <><path d="M12 3v18M5 7h14M7 7l-3 6h6l-3-6zM17 7l-3 6h6l-3-6z" /></> },
  { v: "general", label: "그 외 업종", desc: "가게·서비스 등 무엇이든", icon: <><path d="M4 9h16l-1 11H5L4 9z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></> },
] as const;

// 안심 한 줄(이름 화면 상단에 녹임): "{세부} 블로그, {문구}"
const REASSURE_SHORT: Record<string, string> = {
  medical: "환자분들이 검색하는 글로 써드릴게요",
  academy: "학부모·학생이 검색하는 글로 써드릴게요",
  professional: "의뢰인이 검색하는 글로 써드릴게요",
  general: "손님이 검색할 만한 글로 써드릴게요",
};
const VLABEL: Record<string, string> = Object.fromEntries(VERTS.map((x) => [x.v, x.label]));

export default function Onboarding({ onSaved }: { onSaved: (p: BlogProfile) => void }) {
  const [screen, setScreen] = useState(1);
  const [vertical, setVertical] = useState("");
  const [sub, setSub] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customSub, setCustomSub] = useState("");
  const [blogName, setBlogName] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [hours, setHours] = useState<WeeklyHours>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<BlogProfile | null>(null);

  const inputCls = "w-full rounded-xl border border-neutral-200 px-4 py-3.5 text-base outline-none transition focus:border-[#3f91ff] focus:ring-2 focus:ring-[#3f91ff]/20";
  const primaryBtn = "w-full rounded-xl bg-[#3f91ff] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50";

  function pick(v: string) {
    setVertical(v);
    setSub("");
    setCustomMode(false);
    setCustomSub("");
    setScreen(2);
  }
  function pickSub(s: string) {
    setSub(s);
    setScreen(3);
  }

  // 화면4에서 '계속'·'나중에 할게요' 둘 다 저장(업체정보만 빈 값, vertical·이름은 항상 저장).
  async function save() {
    if (saving || !vertical) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/blog-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical,
          sub_category: sub,
          blog_name: blogName.trim(),
          biz_name: bizName.trim(),
          biz_address: bizAddress.trim(),
          biz_phone: bizPhone.trim(),
          biz_hours_json: hours,
          publish_mode: "manual",
          // topic/tone/article_type 안 보냄 → 라우트가 vertical로 자동 설정(Stage 1)
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "저장하지 못했어요.");
        return;
      }
      setSavedProfile(data.profile as BlogProfile);
      setScreen(5);
    } catch {
      setError("네트워크 오류예요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 pt-8">
      {/* 진행 표시 */}
      <div className="mb-8 flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-1.5 rounded-full transition-all ${n === screen ? "w-5 bg-[#3f91ff]" : n < screen ? "w-1.5 bg-[#3f91ff]/40" : "w-1.5 bg-neutral-200"}`} />
        ))}
      </div>

      {/* 뒤로가기 (2~4) */}
      {screen > 1 && screen < 5 && (
        <button onClick={() => setScreen(screen - 1)} className="mb-3 -ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700">
          <span className="text-base leading-none">←</span> 뒤로
        </button>
      )}

      <div key={screen} className="ateflo-step-in min-h-[300px]">
        {/* 1) 업종 선택 — 누르면 바로 다음 */}
        {screen === 1 && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">어떤 곳을 운영하세요?</h2>
            <p className="mt-2 text-sm text-neutral-500">업종에 맞춰 글을 써드릴게요.</p>
            <div className="mt-6 grid gap-2.5">
              {VERTS.map((x) => (
                <button
                  key={x.v}
                  onClick={() => pick(x.v)}
                  className="flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-[#3f91ff] hover:bg-[#3f91ff]/[0.03] active:scale-[0.99]"
                >
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

        {/* 2) 세부 분류 — 누르면 바로 다음. 목록에 없으면 직접 입력 */}
        {screen === 2 && (
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

        {/* 3) 블로그 이름 (+ 안심 한 줄) */}
        {screen === 3 && (
          <div>
            <p className="mb-4 rounded-xl bg-[#3f91ff]/[0.06] px-3.5 py-2.5 text-[13px] font-medium text-[#2f7fe6]">{sub} 블로그, {REASSURE_SHORT[vertical]}</p>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">블로그 이름을 정해볼까요?</h2>
            <p className="mt-2 text-sm text-neutral-500">나중에 바꿀 수 있어요.</p>
            <input value={blogName} onChange={(e) => setBlogName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setScreen(4); }} placeholder="예: 우리동네치과 건강이야기" maxLength={60} className={`mt-5 ${inputCls}`} autoFocus />
            <button onClick={() => setScreen(4)} className={`mt-8 ${primaryBtn}`}>계속</button>
          </div>
        )}

        {/* 4) 업체 정보 (선택) — 계속/나중에 둘 다 저장 */}
        {screen === 4 && (
          <div>
            <h2 className="font-pretendard text-2xl font-bold tracking-tight">마지막이에요.<br />업체 정보 넣어둘까요?</h2>
            <p className="mt-2 text-sm text-neutral-500">글 맨 아래에 자동으로 들어가요. 지금 안 해도 돼요.</p>
            <input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="상호명 (예: 우리동네치과의원)" maxLength={80} className={`mt-4 ${inputCls}`} />
            <input value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} placeholder="주소 (예: 서울 강남구 …)" maxLength={200} className={`mt-3 ${inputCls}`} />
            <input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="전화번호 (예: 02-000-0000)" maxLength={40} className={`mt-3 ${inputCls}`} />
            <p className="mt-4 text-sm font-medium text-neutral-700">영업시간</p>
            <HoursEditor value={hours} onChange={setHours} />
            {error && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}
            <button onClick={save} disabled={saving} className={`mt-6 ${primaryBtn}`}>{saving ? "저장 중…" : "계속"}</button>
            <button onClick={save} disabled={saving} className="mt-2 w-full py-2 text-sm font-medium text-neutral-400 transition hover:text-neutral-600 disabled:opacity-50">나중에 할게요</button>
          </div>
        )}

        {/* 5) 완료 */}
        {screen === 5 && (
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
