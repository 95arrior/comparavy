"use client";

import { useMemo, useRef, useState } from "react";
import { searchCategories } from "@/lib/categories";

/**
 * 카테고리 자동완성 (controlled). 목록 항목만 선택 가능 → 오타로 인한 엉뚱한 검색 방지.
 * value = 확정된 선택값(없으면 ""). onSelect로 부모에 전달. 타이핑 중엔 미확정("")으로 비워 유효성 게이트.
 */
export default function CategoryPicker({
  value,
  onSelect,
  autoFocus,
}: {
  value: string;
  onSelect: (v: string) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => searchCategories(query), [query]);
  const confirmed = value !== "" && query.trim() === value;

  function pick(v: string) {
    setQuery(v);
    onSelect(v);
    setOpen(false);
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }

  function onChange(v: string) {
    setQuery(v);
    setHighlight(0);
    setOpen(true);
    if (value) onSelect(""); // 편집 시작 = 미확정으로 (유효 선택 전까지 다음 불가)
  }

  return (
    <div className="relative mt-4">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); const s = suggestions[highlight]; if (s) pick(s.value); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="카테고리 검색 (예: 재테크, 강아지)"
          maxLength={30}
          autoFocus={autoFocus}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3.5 pr-10 text-base outline-none transition focus:border-[#3f91ff] focus:ring-2 focus:ring-[#3f91ff]/20"
        />
        {confirmed && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#3f91ff]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          {suggestions.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {suggestions.map((s, i) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // blur보다 먼저 실행되게
                    onClick={() => pick(s.value)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition ${i === highlight ? "bg-[#3f91ff]/5 text-[#2f7fe6]" : "text-neutral-700 hover:bg-neutral-50"}`}
                  >
                    {s.parent ? (
                      <span><span className="text-neutral-400">{s.parent} › </span><b className="font-medium">{s.value}</b></span>
                    ) : (
                      <span className="font-medium">{s.value}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-neutral-400">목록에 없는 주제예요. 비슷한 걸 골라주세요.</p>
          )}
        </div>
      )}
    </div>
  );
}
