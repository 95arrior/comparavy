"use client";

// 수익화 여정 — 블로그 연결 → 발행 → 애드센스 도전 → 수익화 준비. "꾸준함 → 수익화" 스토리 시각화.
export default function JourneyRoadmap({
  publishedCount,
  wpConnected,
  onWrite,
  onGoConnect,
}: {
  publishedCount: number;
  wpConnected: boolean;
  onWrite: () => void;
  onGoConnect: () => void;
}) {
  const ms = [
    { label: "블로그 연결", done: wpConnected, hint: "블로그부터 연결해요", go: onGoConnect },
    { label: "첫 발행", done: publishedCount >= 1, hint: "첫 글 올려봐요", go: onWrite },
    { label: "글 15편", done: publishedCount >= 15, hint: `애드센스 신청해봐요 (${Math.min(publishedCount, 15)}/15)`, go: onWrite },
    { label: "수익화 준비", done: publishedCount >= 30, hint: `꾸준히 쌓아요 (${Math.min(publishedCount, 30)}/30)`, go: onWrite },
  ];
  const doneN = ms.filter((m) => m.done).length;
  const pct = (doneN / ms.length) * 100;
  const next = ms.find((m) => !m.done);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-neutral-900">수익화 여정</p>
        <span className="text-xs font-bold text-[#1D75F7]">{doneN}/{ms.length}</span>
      </div>

      {/* 진척바 */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-[#1D75F7] transition-all duration-500" style={{ width: `${pct}%` }} />
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
