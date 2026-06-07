"use client";

import { useState, useRef, useEffect } from "react";
import { ARTICLE_TYPES, TONES } from "@/lib/articlePrompt";
import AteFloLogo from "@/components/AteFloLogo";
import type { Article } from "./types";

export default function GeneratePanel({
  remaining,
  onGenerated,
  pro,
}: {
  remaining: number;
  onGenerated: (article: Article) => void;
  pro: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const [angle, setAngle] = useState("");
  const [type, setType] = useState(ARTICLE_TYPES[0].key);
  const [tone, setTone] = useState(TONES[0].key);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showOpts, setShowOpts] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // 작성 중엔 항상 맨 아래(쓰이는 끝)가 보이도록 자동 스크롤
  useEffect(() => {
    const el = previewRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [preview]);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!keyword.trim()) {
      setError("키워드를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setPreview("");
    // 생성 화면으로 포커스(스크롤)
    setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, angle, type, tone }),
      });

      // 사전 검사 실패(429/403 등)는 일반 JSON 으로 옴
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "글 생성에 실패했습니다.");
        setPreview(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buf += decoder.decode(chunk.value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          let msg: { type: string; html?: string; article?: Article; error?: string };
          try {
            msg = JSON.parse(line);
          } catch {
            continue;
          }
          if (msg.type === "body") {
            setPreview(msg.html ?? "");
          } else if (msg.type === "done" && msg.article) {
            onGenerated(msg.article);
            setKeyword("");
            setAngle("");
            setPreview(null);
            done = true;
          } else if (msg.type === "error") {
            setError(msg.error ?? "글 생성에 실패했습니다.");
            setPreview(null);
            done = true;
          }
        }
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">새 글 생성</h2>
      <p className="mt-1 text-sm text-neutral-500">
        키워드를 입력하면 한국어 SEO 글을 만듭니다. 이번 달 남은 횟수: {Math.max(0, remaining)}편
      </p>

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
          disabled={loading || outOfQuota}
          className="w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {outOfQuota ? "이번 달 한도 소진" : loading ? "글을 쓰는 중…" : "글 생성하기"}
        </button>
      </form>

      {/* 실시간 생성 미리보기 — 고정 높이 스크롤로 layout shift 방지 */}
      {preview !== null && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-medium text-neutral-500">실시간 미리보기</div>
          <div ref={previewRef} className="h-80 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            {preview ? (
              <div
                className="prose prose-sm prose-neutral max-w-none"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            ) : (
              <p className="text-sm text-neutral-400">글을 구상하는 중…</p>
            )}
            {/* 로고 — 구상 중·작성 중엔 움직이고, 완료되면 멈춤 */}
            <div className="mt-3">
              <AteFloLogo pro={pro} animated={loading} size={22} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
