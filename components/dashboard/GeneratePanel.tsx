"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ARTICLE_TYPES, TONES } from "@/lib/articlePrompt";
import type { GenParams } from "./WritingView";
import type { Article } from "./types";

export default function GeneratePanel({
  remaining,
  onStart,
  pro,
  lockedTeaser,
  onOpenLocked,
}: {
  remaining: number;
  onStart: (params: GenParams) => void;
  pro: boolean;
  lockedTeaser: Article | null;
  onOpenLocked: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [angle, setAngle] = useState("");
  const [type, setType] = useState(ARTICLE_TYPES[0].key);
  const [tone, setTone] = useState(TONES[0].key);
  const [error, setError] = useState<string | null>(null);
  const [showOpts, setShowOpts] = useState(false);

  // 메인에서 입력한 키워드를 이어받아 프리필 (login 거쳐도 유지)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const kw = localStorage.getItem("ateflo_kw");
    if (kw) {
      setKeyword(kw);
      localStorage.removeItem("ateflo_kw");
    }
  }, []);

  const outOfQuota = remaining <= 0;
  const hasTeaser = !!lockedTeaser;
  const teaserMode = !pro && outOfQuota && !hasTeaser; // 아직 미리보기 안 만든 무료 한도소진 → 1편 허용
  const blocked = !pro && outOfQuota && hasTeaser; // 이미 미리보기 있음 → 추가 생성 차단, 결제 유도

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!keyword.trim()) {
      setError("키워드를 입력해 주세요.");
      return;
    }
    // 실제 생성·타이핑은 전체 페이지 작성 화면(WritingView)에서 진행
    onStart({ keyword: keyword.trim(), angle, type, tone });
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">새 글 생성</h2>
      <p className="mt-1 text-sm text-neutral-500">
        키워드를 입력하면 한국어 SEO 글을 만듭니다. 이번 달 남은 횟수: {Math.max(0, remaining)}편
      </p>

      {blocked && lockedTeaser && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-900">무료 미리보기를 만들었어요 🔒</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-800">
            끝까지 보고 발행하려면 프로로 업그레이드하세요. 추가 글 생성도 프로에서 열려요.
          </p>
          <p className="mt-3 truncate text-sm font-medium text-neutral-900">“{lockedTeaser.title}”</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={onOpenLocked}
              className="rounded-full border border-amber-300 bg-white px-4 py-1.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
            >
              미리보기 글 보기
            </button>
            <Link
              href="/pricing"
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              프로로 업그레이드
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium">키워드 *</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 강아지 분리불안 해결 방법"
            className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowOpts((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
        >
          <span className="text-base leading-none">{showOpts ? "▾" : "▸"}</span>
          글 유형 · 문체 · 내 관점 {showOpts ? "접기" : "설정"}
        </button>

        {showOpts && (
          <>
        <div>
          <label className="block text-sm font-medium">관점 / 각도 (선택)</label>
          <textarea
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            rows={2}
            placeholder="예: 직접 키워본 경험을 바탕으로 한 현실적인 조언 (길게 써도 됩니다)"
            className="mt-2 w-full resize-y rounded-xl border border-neutral-300 px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-neutral-900"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">글 유형</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
            >
              {ARTICLE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-neutral-400">
              {ARTICLE_TYPES.find((t) => t.key === type)?.hint}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">문체</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
            >
              {TONES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-neutral-400">
              {TONES.find((t) => t.key === tone)?.hint}
            </p>
          </div>
        </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={outOfQuota && !teaserMode}
          className="w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {blocked
            ? "프로로 업그레이드하면 계속 쓸 수 있어요"
            : outOfQuota && !teaserMode
            ? "이번 달 한도를 다 썼어요"
            : "글 생성하기"}
        </button>
      </form>
    </div>
  );
}
