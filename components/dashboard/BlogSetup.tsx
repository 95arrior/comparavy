"use client";

import { useState } from "react";
import { TONE_CHOICES, TYPE_CHOICES, PUBLISH_CHOICES, type BlogProfile } from "@/lib/blogProfile";

const BRAND = "#3f91ff";

/**
 * 블로그 설정(온보딩) 폼. 1회 입력 → 저장하면 이후 모든 글이 이 설정(문체·유형)을 따른다.
 * 기존 프로필이 있으면 그 값으로 채워 '수정'으로도 동작.
 */
export default function BlogSetup({
  initial,
  onSaved,
}: {
  initial?: BlogProfile | null;
  onSaved: (p: BlogProfile) => void;
}) {
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [tone, setTone] = useState(initial?.tone ?? "friendly");
  const [articleType, setArticleType] = useState(initial?.article_type ?? "info");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [publishMode, setPublishMode] = useState(initial?.publish_mode ?? "manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial;

  async function save() {
    const t = topic.trim();
    if (!t || saving) {
      if (!t) setError("블로그 주제를 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/blog-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, tone, article_type: articleType, target: target.trim(), publish_mode: publishMode }),
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

  const card = "rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm";
  const labelCls = "text-sm font-semibold text-neutral-800";
  const chip = (on: boolean) =>
    `rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
      on ? "border-[#3f91ff] bg-[#3f91ff]/5 text-[#2f7fe6]" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
    }`;

  return (
    <div className="mx-auto max-w-xl">
      <div className="text-center">
        <h1 className="font-pretendard text-2xl font-bold tracking-tight sm:text-3xl">{isEdit ? "블로그 설정" : "블로그 만들기"}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-500">
          한 번만 정하면, 이후 모든 글이 이 설정대로 써져요.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {/* 주제 */}
        <div className={card}>
          <label className={labelCls}>블로그 주제</label>
          <p className="mt-0.5 text-xs text-neutral-400">어떤 분야의 블로그인가요?</p>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 강아지, 재테크, 다이어트"
            maxLength={60}
            className="mt-3 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-[#3f91ff] focus:ring-2 focus:ring-[#3f91ff]/20"
          />
        </div>

        {/* 문체 */}
        <div className={card}>
          <label className={labelCls}>문체</label>
          <p className="mt-0.5 text-xs text-neutral-400">글의 말투를 정해요.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TONE_CHOICES.map((c) => (
              <button key={c.value} type="button" onClick={() => setTone(c.value)} className={chip(tone === c.value)}>{c.label}</button>
            ))}
          </div>
        </div>

        {/* 유형 */}
        <div className={card}>
          <label className={labelCls}>글 유형</label>
          <p className="mt-0.5 text-xs text-neutral-400">정보 전달인지, 단계별 가이드인지.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TYPE_CHOICES.map((c) => (
              <button key={c.value} type="button" onClick={() => setArticleType(c.value)} className={chip(articleType === c.value)}>{c.label}</button>
            ))}
          </div>
        </div>

        {/* 타겟 독자 */}
        <div className={card}>
          <label className={labelCls}>타겟 독자 <span className="font-normal text-neutral-400">(선택)</span></label>
          <p className="mt-0.5 text-xs text-neutral-400">누가 읽을 글인가요?</p>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="예: 초보 견주"
            maxLength={80}
            className="mt-3 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-[#3f91ff] focus:ring-2 focus:ring-[#3f91ff]/20"
          />
        </div>

        {/* 발행 모드 */}
        <div className={card}>
          <label className={labelCls}>발행 방식</label>
          <p className="mt-0.5 text-xs text-neutral-400">한 번 정하면 매번 안 물어봐요.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {PUBLISH_CHOICES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setPublishMode(c.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  publishMode === c.value ? "border-[#3f91ff] bg-[#3f91ff]/5" : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <p className={`text-sm font-medium ${publishMode === c.value ? "text-[#2f7fe6]" : "text-neutral-800"}`}>{c.label}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{c.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

        <button
          onClick={save}
          disabled={saving || !topic.trim()}
          className="w-full rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: BRAND }}
        >
          {saving ? "저장 중…" : isEdit ? "설정 저장" : "블로그 만들기"}
        </button>
      </div>
    </div>
  );
}
