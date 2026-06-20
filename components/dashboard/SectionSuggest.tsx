"use client";

import { useState } from "react";

// 편집화면 '섹션 추가 추천' — 체류시간↑ 섹션을 한 번에 글 맨 아래에 붙인다.
// 모듈 독립: articleId + onInsert(에디터 append) + onToast 만 받음 → 편집화면 개편 시 위치만 이동.
const SECTIONS: { type: string; label: string; desc: string }[] = [
  { type: "price", label: "가격 설명", desc: "가격이 왜 다른지 · 견적 비교할 때 볼 것" },
  { type: "checklist", label: "확인할 점", desc: "고를 때 꼭 봐야 할 것" },
  { type: "compare", label: "고르는 법", desc: "어떻게 고르면 좋을지" },
];

export default function SectionSuggest({
  articleId,
  onInsert,
  onToast,
}: {
  articleId: string;
  onInsert: (html: string) => void;
  onToast: (msg: string) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function add(type: string, label: string) {
    if (loading) return;
    setLoading(type);
    try {
      const res = await fetch(`/api/articles/${articleId}/section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok && data.html) {
        onInsert(data.html);
        setAdded((s) => new Set(s).add(type));
        onToast(`‘${label}’ 섹션을 글 맨 아래에 추가했어요.`);
      } else {
        onToast(data.error ?? "섹션 추가에 실패했어요.");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[#1D75F7]/20 bg-[#1D75F7]/[0.03] p-4">
      <p className="text-sm font-bold text-neutral-900">이런 내용을 더하면 손님이 더 오래 봐요</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
        손님이 끝까지 읽도록, 글 맨 아래에 한 번에 넣어드려요. 없는 후기·가격은 지어내지 않아요.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SECTIONS.map((s) => {
          const isAdded = added.has(s.type);
          const isLoading = loading === s.type;
          return (
            <button
              key={s.type}
              onClick={() => add(s.type, s.label)}
              disabled={!!loading || isAdded}
              title={s.desc}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-60 ${
                isAdded
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                  : "border-[#1D75F7]/40 bg-white text-[#1D75F7] hover:bg-[#1D75F7]/5"
              }`}
            >
              {isLoading ? "만드는 중…" : isAdded ? `✓ ${s.label}` : `＋ ${s.label}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
