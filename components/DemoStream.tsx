"use client";

import { useEffect, useState } from "react";

// 홈 데모: 실제 생성처럼 글이 한 글자씩 써지는 모습 (미리 만든 예시, API 호출 0).
const BLOCKS: { tag: "h3" | "p"; text: string }[] = [
  { tag: "h3", text: "강아지 분리불안, 왜 생길까" },
  { tag: "p", text: "혼자 있는 시간이 길어지면 강아지는 불안을 학습합니다. 짖음, 배변 실수, 가구 물어뜯기가 대표 신호예요." },
  { tag: "h3", text: "오늘부터 할 수 있는 것" },
  { tag: "p", text: "외출 전 과한 인사를 줄이세요. 5분 외출부터 시작해 시간을 천천히 늘리면, 혼자 있는 게 별일 아니라는 걸 배웁니다." },
];
const TOTAL = BLOCKS.reduce((sum, b) => sum + b.text.length, 0);

export default function DemoStream() {
  const [n, setN] = useState(0);

  useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setN(i);
      if (i < TOTAL) {
        timer = setTimeout(tick, 30);
      } else {
        timer = setTimeout(() => {
          i = 0;
          setN(0);
          timer = setTimeout(tick, 700);
        }, 2800);
      }
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, []);

  let remaining = n;
  const rendered = BLOCKS.map((b, idx) => {
    const shown = Math.max(0, Math.min(b.text.length, remaining));
    remaining -= b.text.length;
    const active = shown > 0 && shown < b.text.length;
    return { idx, tag: b.tag, text: b.text.slice(0, shown), active, started: shown > 0 };
  }).filter((b) => b.started);

  return (
    <div className="mx-auto w-full max-w-xl text-left">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-neutral-400">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        실시간으로 이렇게 써집니다
      </div>
      <div className="h-56 overflow-hidden rounded-xl border border-neutral-200 bg-white/70 p-5 backdrop-blur">
        {rendered.length === 0 && <p className="text-sm text-neutral-300">글을 구상하는 중…</p>}
        {rendered.map((b) =>
          b.tag === "h3" ? (
            <h3 key={b.idx} className="mt-3 text-sm font-semibold text-neutral-900 first:mt-0">
              {b.text}
              {b.active && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
            </h3>
          ) : (
            <p key={b.idx} className="mt-1.5 text-sm leading-relaxed text-neutral-600">
              {b.text}
              {b.active && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
            </p>
          ),
        )}
      </div>
    </div>
  );
}
