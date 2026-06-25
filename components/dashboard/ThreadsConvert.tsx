"use client";

import { useState } from "react";

// 블로그 글 → 스레드용 변환. 스타일 3종 → 결과 편집·복사·스레드 작성창 열기.
const STYLES: { key: string; label: string; desc: string }[] = [
  { key: "list", label: "3가지로 정리", desc: "핵심을 번호로 짧게" },
  { key: "question", label: "질문 던지기", desc: "댓글이 달리게" },
  { key: "twist", label: "반전 한 줄", desc: "예상을 깨는 첫 줄" },
];

export default function ThreadsConvert({ articleId, onToast }: { articleId: string; onToast: (m: string) => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [activeStyle, setActiveStyle] = useState<string | null>(null);

  async function convert(style: string) {
    if (loading) return;
    setLoading(style);
    try {
      const res = await fetch(`/api/articles/${articleId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style }),
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setText(data.text);
        setActiveStyle(style);
      } else {
        onToast(data.error ?? "변환에 실패했어요.");
      }
    } finally {
      setLoading(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      onToast("스레드용 글을 복사했어요. 스레드에 붙여넣으세요.");
    } catch {
      onToast("복사에 실패했어요. 텍스트를 길게 눌러 직접 복사해 주세요.");
    }
  }

  const len = text.length;
  const over = len > 500;

  return (
    <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black text-white">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12.2 11.1c.05-2.1 1-3.1 2.6-3.1 1 0 1.8.5 2.2 1.5l1.7-.8c-.7-1.6-2.1-2.4-3.9-2.4-2.8 0-4.4 1.8-4.5 5h-1.6v1.7h1.6c.1 3.3 1.7 5.2 4.6 5.2 1.6 0 2.9-.6 3.7-1.9l-1.5-1c-.5.8-1.2 1.2-2.2 1.2-1.6 0-2.5-1-2.6-3.2v-.2h4.7v-1.7h-4.7z" /></svg>
        </span>
        <p className="text-sm font-bold text-neutral-900">스레드에 올리기</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">이 글을 스레드에 올리기 좋게, 짧고 눈에 띄게 바꿔드려요. 원하는 느낌을 골라보세요.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {STYLES.map((s) => (
          <button
            key={s.key}
            onClick={() => convert(s.key)}
            disabled={!!loading}
            title={s.desc}
            className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-60 ${
              activeStyle === s.key ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-700 hover:border-neutral-900"
            }`}
          >
            {loading === s.key ? "만드는 중…" : s.label}
          </button>
        ))}
      </div>

      {text && (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.min(16, Math.max(6, text.split("\n").length + 1))}
            className="w-full resize-y rounded-xl bg-neutral-100 bg-neutral-50 p-3 text-[13.5px] leading-relaxed text-neutral-800 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30 focus:outline-none"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className={`text-xs ${over ? "font-semibold text-red-500" : "text-neutral-400"}`}>{len}/500자{over ? " · 줄여주세요" : ""}</span>
            <div className="flex gap-2">
              <button onClick={copy} className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-700 active:scale-95">복사하기</button>
              <a
                href={`https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-neutral-300 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-900"
              >
                스레드 작성창 열기 →
              </a>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
            사진이나 영상을 1개 넣으면 더 많은 사람한테 보여요 (선택). 스레드에 올릴 때 직접 넣으세요.
          </p>
        </div>
      )}
    </div>
  );
}
