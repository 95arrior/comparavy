"use client";

import { useMemo, useRef, useState } from "react";
import { searchCategories } from "@/lib/categories";

/**
 * 카테고리 통합 자동완성 (한 칸). "재테크 전체 / 재테크 › 주식 …"이 한 목록에 떠 바로 선택.
 * 목록 항목만 선택 가능 → 오타 검색 방지. 선택 시 onSelect({value, category}).
 */
export default function CategoryPicker({
  value,
  onSelect,
  initialLabel,
}: {
  value: string; // 확정된 검색어(세부 또는 대분류). "" = 미확정
  onSelect: (sel: { value: string; category: string }) => void;
  initialLabel?: string;
}) {
  const [query, setQuery] = useState(initialLabel ?? value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => searchCategories(query), [query]);
  const confirmed = value !== "";

  function pick(s: { value: string; category: string; label: string }) {
    setQuery(s.label);
    onSelect({ value: s.value, category: s.category });
    setOpen(false);
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }

  function onChange(v: string) {
    setQuery(v);
    setHighlight(0);
    setOpen(true);
    if (value) onSelect({ value: "", category: "" }); // 편집 시작 = 미확정
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
            else if (e.key === "Enter") { e.preventDefault(); const s = suggestions[highlight]; if (s) pick(s); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="카테고리 검색 (예: 재테크, 주식)"
          maxLength={30}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3.5 pr-10 text-base outline-none transition focus:border-[#1D75F7] focus:ring-2 focus:ring-[#1D75F7]/20"
        />
        {confirmed && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1D75F7]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          {suggestions.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {suggestions.map((s, i) => {
                const isAll = s.value === s.category;
                return (
                  <li key={s.label}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(s)}
                      onMouseEnter={() => setHighlight(i)}
                      className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition ${i === highlight ? "bg-[#1D75F7]/5 text-[#2f7fe6]" : "text-neutral-700 hover:bg-neutral-50"}`}
                    >
                      {isAll ? (
                        <span className="font-semibold">{s.category} <span className="font-normal text-neutral-400">전체</span></span>
                      ) : (
                        <span><span className="text-neutral-400">{s.category} › </span><b className="font-medium">{s.value}</b></span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-neutral-400">목록에 없는 주제예요. 비슷한 걸 골라주세요.</p>
          )}
        </div>
      )}
    </div>
  );
}
