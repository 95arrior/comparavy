"use client";

import { useLayoutEffect, useRef, useState } from "react";

export interface SegOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * 2개 이상 옵션을 가진 세그먼트 토글. 선택을 바꾸면 검은 '썸'이 해당 버튼 위치로
 * 부드럽게 미끄러진다(버튼 폭이 달라도 실제 위치를 측정해 정확히 이동).
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [thumb, setThumb] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const el = refs.current[value];
    if (el) setThumb({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    // 리사이즈 시 위치 재측정
    const onResize = () => {
      const e = refs.current[value];
      if (e) setThumb({ left: e.offsetLeft, top: e.offsetTop, width: e.offsetWidth, height: e.offsetHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [value, options]);

  return (
    <div className="relative inline-flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-white p-1">
      {thumb && (
        <div
          className="pointer-events-none absolute rounded-lg bg-neutral-900 transition-all duration-300 ease-out"
          style={{ left: thumb.left, top: thumb.top, width: thumb.width, height: thumb.height }}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[o.value] = el; }}
            onClick={() => onChange(o.value)}
            className={`relative z-10 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ${
              active ? "text-white" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {o.label}
            {o.count !== undefined && o.count > 0 && (
              <span className={active ? "ml-1 text-white/60" : "ml-1 text-neutral-400"}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
