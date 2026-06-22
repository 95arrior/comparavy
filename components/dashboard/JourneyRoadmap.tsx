"use client";

import type { BloggerType } from "@/lib/bloggerTypes";

// 여정 — 유형별로 스토리가 다르다. online=수익화(애드센스) / local=단골·검색노출 / hobby=기록.
type Milestone = { label: string; done: boolean; hint: string; go: () => void };

export default function JourneyRoadmap({
  publishedCount,
  wpConnected,
  onWrite,
  onGoConnect,
  type = "online",
}: {
  publishedCount: number;
  wpConnected: boolean;
  onWrite: () => void;
  onGoConnect: () => void;
  type?: BloggerType;
}) {
  const pub = publishedCount;
  const connect: Milestone = { label: "블로그 연결", done: wpConnected, hint: "블로그부터 연결해요", go: onGoConnect };
  const first: Milestone = { label: "첫 발행", done: pub >= 1, hint: "첫 글 올려봐요", go: onWrite };

  const CFG: Record<BloggerType, { title: string; ms: Milestone[] }> = {
    online: {
      title: "수익화 여정",
      ms: [connect, first,
        { label: "글 15편", done: pub >= 15, hint: `애드센스 신청해봐요 (${Math.min(pub, 15)}/15)`, go: onWrite },
        { label: "수익화 준비", done: pub >= 30, hint: `꾸준히 쌓아 수익화 (${Math.min(pub, 30)}/30)`, go: onWrite },
      ],
    },
    local: {
      title: "단골 만들기 여정",
      ms: [connect, first,
        { label: "글 15편", done: pub >= 15, hint: `검색에 노출되기 시작해요 (${Math.min(pub, 15)}/15)`, go: onWrite },
        { label: "단골 만들기", done: pub >= 30, hint: `동네 손님이 찾아와요 (${Math.min(pub, 30)}/30)`, go: onWrite },
      ],
    },
    hobby: {
      title: "기록 여정",
      ms: [connect,
        { label: "첫 글", done: pub >= 1, hint: "첫 글 올려봐요", go: onWrite },
        { label: "10편", done: pub >= 10, hint: `차곡차곡 쌓여요 (${Math.min(pub, 10)}/10)`, go: onWrite },
        { label: "30편", done: pub >= 30, hint: `어느새 나만의 아카이브 (${Math.min(pub, 30)}/30)`, go: onWrite },
      ],
    },
  };

  const { title, ms } = CFG[type];
  const doneN = ms.filter((m) => m.done).length;
  const pct = (doneN / ms.length) * 100;
  const next = ms.find((m) => !m.done);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-neutral-900">{title}</p>
        <span className="text-xs font-bold text-[#1D75F7]">{doneN}/{ms.length}</span>
      </div>

      {/* 진척바 */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-[#1D75F7] transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>

      {/* 마일스톤 라벨 */}
      <div className="mt-2.5 flex justify-between">
        {ms.map((m) => (
          <span key={m.label} className={`text-[11px] ${m.done ? "font-semibold text-[#1D75F7]" : next === m ? "font-semibold text-neutral-700" : "text-neutral-400"}`}>
            {m.label}
          </span>
        ))}
      </div>

      {next && (
        <button onClick={next.go} className="mt-3.5 w-full rounded-xl bg-[#1D75F7]/[0.06] py-2.5 text-left text-xs text-neutral-600 transition hover:bg-[#1D75F7]/[0.1] active:scale-[0.99]">
          <span className="font-semibold text-[#1D75F7]">다음 </span>{next.hint}
        </button>
      )}
    </div>
  );
}
