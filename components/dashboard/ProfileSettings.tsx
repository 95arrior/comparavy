"use client";

import { useState } from "react";
import { ONLINE_CATEGORIES } from "@/lib/bloggerTypes";
import type { BlogProfile } from "@/lib/blogProfile";

// 블로그 설정 편집 — 한 화면 설정형(스테퍼 X). 네이버 수익형 단일: 주제·블로그 이름만 고친다.
// 문체/유형은 자동 결정. 저장 시 라우트가 topic·tone을 vertical로 정규화.

export default function ProfileSettings({ profile, onSaved }: { profile: BlogProfile; onSaved: (p: BlogProfile) => void }) {
  const [sub, setSub] = useState(profile.sub_category ?? "");
  const [blogName, setBlogName] = useState(profile.blog_name ?? "");
  const [naverId, setNaverId] = useState((profile as { naver_blog_id?: string | null }).naver_blog_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls = "w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30";

  const isCustomSub = sub.trim() !== "" && !ONLINE_CATEGORIES.includes(sub);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/blog-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: "online", // 수익형 단일 — 레거시 vertical도 저장 시 online으로 통일
          sub_category: sub.trim(),
          blog_name: blogName.trim(),
          naver_blog_id: naverId.trim(), // 어떤 URL 형태든 라우트가 blogId로 파싱
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
    <div className="mt-6 space-y-3.5">
      {/* 주제 */}
      <div className="rounded-2xl at-glass p-5 ">
        <label className="text-[15px] font-bold tracking-tight text-neutral-900">주제</label>
        <p className="mt-1 text-xs text-neutral-400">주제에 맞는 글감·키워드를 추천하는 데 써요</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ONLINE_CATEGORIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSub(s)}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${sub === s ? "bg-[#1D75F7] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          value={isCustomSub ? sub : ""}
          onChange={(e) => setSub(e.target.value)}
          placeholder="목록에 없으면 직접 입력 (예: 캠핑)"
          maxLength={40}
          className={`mt-2 ${inputCls}`}
        />
      </div>

      {/* 블로그 이름 */}
      <div className="rounded-2xl at-glass p-5 ">
        <label className="text-[15px] font-bold tracking-tight text-neutral-900">블로그 이름</label>
        <input value={blogName} onChange={(e) => setBlogName(e.target.value)} placeholder="예: 월급쟁이 재테크 일기" maxLength={60} className={`mt-3 ${inputCls}`} />

        <p className="mt-5 text-[13px] font-bold text-neutral-800">내 네이버 블로그 주소</p>
        <p className="mt-0.5 text-[11.5px] text-neutral-400">발행 확인(자동 검증)과 글쓰기 바로가기에 써요. 주소 전체를 붙여넣어도 돼요.</p>
        <input value={naverId} onChange={(e) => setNaverId(e.target.value)} placeholder="blog.naver.com/아이디 또는 아이디만" maxLength={120} className={`mt-2 ${inputCls}`} />
      </div>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <button onClick={save} disabled={saving} className="w-full rounded-2xl bg-[#1D75F7] py-4 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50">
        {saving ? "저장 중…" : "저장하기"}
      </button>
    </div>
  );
}
