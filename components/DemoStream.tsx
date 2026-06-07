"use client";

import { useEffect, useState } from "react";
import AteFloLogo from "@/components/AteFloLogo";

// 홈 데모: 우리 실제 생성 로직으로 뽑은 진짜 글(키워드 "강아지 분리불안 해결 방법")을
// 짧게 잘라 정적으로 박은 것. 실제처럼 한 글자씩 타이핑되지만 런타임 API 호출은 0.
const BLOCKS: { tag: "title" | "h3" | "p"; text: string }[] = [
  { tag: "title", text: "강아지 분리불안 해결 방법: 따라 하면 끝나는 단계별 훈련" },
  { tag: "p", text: "주인이 신발만 신어도 짖고, 문이 닫히면 하울링과 배변 실수가 시작된다면 분리불안일 가능성이 큽니다. 핵심은 '혼자 있어도 아무 일 없다'는 경험을 작은 단위로 반복해 쌓는 것입니다." },
  { tag: "h3", text: "1단계: 외출 신호부터 무뎌지게 만들기" },
  { tag: "p", text: "강아지는 열쇠 소리, 외투 걸치기 같은 신호를 외출과 연결해 미리 불안해집니다. 외출 생각이 없을 때 열쇠를 집었다 그냥 내려놓고, 신발을 신고 앉았다 다시 벗으며 그 연결을 끊어 주세요." },
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
        timer = setTimeout(tick, 28);
      } else {
        timer = setTimeout(() => {
          i = 0;
          setN(0);
          timer = setTimeout(tick, 800);
        }, 3200);
      }
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, []);

  let remaining = n;
  const rendered = BLOCKS.map((b, idx) => {
    const shown = Math.max(0, Math.min(b.text.length, remaining));
    remaining -= b.text.length;
    return { idx, tag: b.tag, text: b.text.slice(0, shown), active: shown > 0 && shown < b.text.length, started: shown > 0 };
  }).filter((b) => b.started);

  const cursor = <span className="ml-0.5 inline-block animate-pulse text-neutral-400">▍</span>;

  return (
    <div className="mx-auto w-full max-w-xl text-left">
      <div className="mb-2 text-xs font-medium text-neutral-400">
        지금, 이렇게 써지고 있어요
      </div>
      <div className="h-80 overflow-hidden rounded-xl border border-neutral-200 bg-white/70 p-5 backdrop-blur">
        {rendered.length === 0 && <p className="text-sm text-neutral-300">글을 구상하는 중…</p>}
        {rendered.map((b) => {
          if (b.tag === "title") {
            return (
              <p key={b.idx} className="text-base font-semibold leading-snug text-neutral-900">
                {b.text}
                {b.active && cursor}
              </p>
            );
          }
          if (b.tag === "h3") {
            return (
              <h3 key={b.idx} className="mt-4 text-sm font-semibold text-neutral-900">
                {b.text}
                {b.active && cursor}
              </h3>
            );
          }
          return (
            <p key={b.idx} className="mt-2 text-sm leading-relaxed text-neutral-600">
              {b.text}
              {b.active && cursor}
            </p>
          );
        })}
        {/* 작성되는 텍스트 바로 아래에 로고 — 타이핑 중엔 움직이고, 다 쓰면 멈춤 */}
        <div className="mt-3">
          <AteFloLogo animated={n < TOTAL} size={22} />
        </div>
      </div>
    </div>
  );
}
