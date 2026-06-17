"use client";

import { useState } from "react";
import HoursEditor from "./HoursEditor";
import { VERTICAL_SUBS } from "@/lib/verticalSubs";
import type { BlogProfile, WeeklyHours } from "@/lib/blogProfile";

// 블로그 설정 편집 — 한 화면 설정형(스테퍼 X). 업종·이름·업체정보(영업시간)만 바로 고친다.
// 카테고리/문체/유형은 제거(vertical이 자동 결정). 저장 시 라우트가 topic=업종라벨·tone=업종기본톤으로 정규화.

const VERTS = [
  { v: "medical", label: "병의원" },
  { v: "academy", label: "학원·교습소" },
  { v: "professional", label: "법률·세무·노무" },
  { v: "general", label: "그 외 업종" },
];

export default function ProfileSettings({ profile, onSaved }: { profile: BlogProfile; onSaved: (p: BlogProfile) => void }) {
  // 기존 vertical이 b2b(또는 미지정)면 '그 외(general)'로 표시 — 저장하면 general로 통일
  const [vertical, setVertical] = useState(() => {
    const v = profile.vertical;
    return v && ["medical", "academy", "professional", "general"].includes(v) ? v : "general";
  });
  const [sub, setSub] = useState(profile.sub_category ?? "");
  const [blogName, setBlogName] = useState(profile.blog_name ?? "");
  const [bizName, setBizName] = useState(profile.biz_name ?? "");
  const [bizAddress, setBizAddress] = useState(profile.biz_address ?? "");
  const [bizPhone, setBizPhone] = useState(profile.biz_phone ?? "");
  const [hours, setHours] = useState<WeeklyHours>(profile.biz_hours_json ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls = "w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-[#3f91ff] focus:ring-2 focus:ring-[#3f91ff]/20";

  // 업종 바꾸면 세부가 새 업종 목록에 없을 때 초기화(직접입력 값 포함)
  function chooseVertical(v: string) {
    setVertical(v);
    if (sub && !(VERTICAL_SUBS[v] ?? []).includes(sub)) setSub("");
  }
  const subOptions = VERTICAL_SUBS[vertical] ?? [];
  const isCustomSub = sub.trim() !== "" && !subOptions.includes(sub);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/blog-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical,
          sub_category: sub.trim(),
          blog_name: blogName.trim(),
          biz_name: bizName.trim(),
          biz_address: bizAddress.trim(),
          biz_phone: bizPhone.trim(),
          biz_hours_json: hours,
          publish_mode: profile.publish_mode ?? "manual",
          // topic/tone/article_type 안 보냄 → 라우트가 vertical로 자동 설정(정규화)
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "저장하지 못했어요.");
        return;
      }
      onSaved(data.profile as BlogProfile);
    } catch {
      setError("네트워크 오류예요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* 업종 */}
      <div>
        <label className="text-sm font-bold tracking-tight">업종</label>
        <p className="mt-1 text-xs text-neutral-500">업종에 맞춰 글의 톤·구조가 자동으로 정해져요.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {VERTS.map((x) => (
            <button
              key={x.v}
              type="button"
              onClick={() => chooseVertical(x.v)}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${vertical === x.v ? "border-[#3f91ff] bg-[#3f91ff]/5 text-[#2f7fe6]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {/* 세부 분류 */}
      <div>
        <label className="text-sm font-bold tracking-tight">세부 분류</label>
        <p className="mt-1 text-xs text-neutral-500">분야에 맞는 키워드를 추천하는 데 써요.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {subOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSub(s)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${sub === s ? "border-[#3f91ff] bg-[#3f91ff]/5 text-[#2f7fe6]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          value={isCustomSub ? sub : ""}
          onChange={(e) => setSub(e.target.value)}
          placeholder="목록에 없으면 직접 입력 (예: 통증의학과)"
          maxLength={40}
          className={`mt-2 ${inputCls}`}
        />
      </div>

      {/* 블로그 이름 */}
      <div>
        <label className="text-sm font-bold tracking-tight">블로그 이름</label>
        <input value={blogName} onChange={(e) => setBlogName(e.target.value)} placeholder="예: 우리동네치과 건강이야기" maxLength={60} className={`mt-3 ${inputCls}`} />
      </div>

      {/* 업체 정보 */}
      <div>
        <label className="text-sm font-bold tracking-tight">업체 정보 <span className="text-xs font-normal text-neutral-400">(선택)</span></label>
        <p className="mt-1 text-xs text-neutral-500">입력하면 글 맨 아래에 자동으로 들어가요.</p>
        <input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="상호명 (예: 우리동네치과의원)" maxLength={80} className={`mt-3 ${inputCls}`} />
        <input value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} placeholder="주소 (예: 서울 강남구 …)" maxLength={200} className={`mt-2 ${inputCls}`} />
        <input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="전화번호 (예: 02-000-0000)" maxLength={40} className={`mt-2 ${inputCls}`} />
        <p className="mt-4 text-sm font-medium text-neutral-700">영업시간</p>
        <HoursEditor value={hours} onChange={setHours} />
      </div>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <button onClick={save} disabled={saving} className="w-full rounded-xl bg-[#3f91ff] py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50">
        {saving ? "저장 중…" : "저장"}
      </button>
    </div>
  );
}
