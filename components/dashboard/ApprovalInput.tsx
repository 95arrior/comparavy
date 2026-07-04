"use client";

import { useEffect, useState } from "react";

// ★애드포스트 승인 결과 입력 — 승인/보류/거절. 거절은 흔한 일 톤(범위 표현, 보장 없음).
//  승인 → ateflo_adpost_approved=1 (체크인 수익칸·사다리 쇼핑커넥트의 열쇠). Stage 5에서 blog_profiles로 서버 이관 예정.
const REASONS = [
  { key: "posts", label: "포스팅 수 부족", next: "매일 1편 페이스로 7일 더 쌓은 뒤 재신청해 보세요. 재신청으로 승인받는 경우가 많아요." },
  { key: "period", label: "운영 기간", next: "블로그를 시작한 지 얼마 안 됐다면 시간이 답이에요. 7일 뒤 글이 더 쌓인 상태로 재신청해 보세요." },
  { key: "quality", label: "품질·기타", next: "최근 글 몇 편을 열어 도입이 검색 의도에 답하는지 확인해 보세요. 글을 다듬고 7일 뒤 재신청하면 돼요." },
];

export default function ApprovalInput({ onChanged }: { onChanged?: () => void }) {
  const [state, setState] = useState<"idle" | "approved" | "rejected" | "hold">("idle");
  const [reason, setReason] = useState<string | null>(null);
  const [retryDday, setRetryDday] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("ateflo_adpost_approved") === "1") { setState("approved"); return; }
      const until = Number(localStorage.getItem("ateflo_adpost_retry_until") ?? 0);
      if (until > Date.now()) { setState("rejected"); setReason(localStorage.getItem("ateflo_adpost_reject_reason")); setRetryDday(Math.ceil((until - Date.now()) / 86400000)); }
    } catch { /* ignore */ }
  }, []);

  function setApproved() {
    try { localStorage.setItem("ateflo_adpost_approved", "1"); localStorage.removeItem("ateflo_adpost_retry_until"); } catch { /* ignore */ }
    setState("approved"); onChanged?.();
  }
  function setRejected(r: string) {
    try {
      localStorage.setItem("ateflo_adpost_retry_until", String(Date.now() + 7 * 86400000)); // D-7 재신청 미니 코스
      localStorage.setItem("ateflo_adpost_reject_reason", r);
    } catch { /* ignore */ }
    setReason(r); setRetryDday(7); setState("rejected"); onChanged?.();
  }

  if (state === "approved") {
    return (
      <div className="rounded-2xl at-glass p-5">
        <p className="text-[14px] font-bold text-emerald-600">애드포스트 승인 완료</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">수익 체크인이 열렸어요. 아침 체크인에서 어제 수익을 기록할 수 있어요.</p>
      </div>
    );
  }
  if (state === "rejected" && reason === null && retryDday === null) {
    return (
      <div className="rounded-2xl at-glass p-5">
        <p className="text-[14px] font-bold text-neutral-900">거절 사유가 무엇이었나요?</p>
        <p className="mt-0.5 text-[12px] text-neutral-400">사유에 맞춰 다음 행동을 알려드려요. 거절은 흔한 과정이에요.</p>
        <div className="mt-3 space-y-2">
          {REASONS.map((r) => (
            <button key={r.key} onClick={() => setRejected(r.key)} className="at-press w-full rounded-xl bg-neutral-100 py-2.5 text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-200">{r.label}</button>
          ))}
        </div>
        <button onClick={() => setState("idle")} className="mt-2 w-full py-2 text-center text-[12.5px] font-medium text-neutral-400">뒤로</button>
      </div>
    );
  }
  if (state === "rejected") {
    const r = REASONS.find((x) => x.key === reason);
    return (
      <div className="rounded-2xl at-glass p-5">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold text-neutral-900">재신청 코스</p>
          <span className="rounded-full bg-[#1D75F7]/10 px-2.5 py-0.5 text-[12px] font-bold text-[#1D75F7]">D-{retryDday ?? 7}</span>
        </div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-600">{r?.next ?? "글을 더 쌓은 뒤 재신청해 보세요. 재신청으로 승인받는 경우가 많아요."}</p>
        <p className="mt-1 text-[12px] text-neutral-400">그때까지 매일 발행 페이스를 유지하면 준비 끝이에요.</p>
        <button onClick={setApproved} className="at-press mt-3 w-full rounded-xl bg-neutral-100 py-2.5 text-[13px] font-bold text-neutral-600 transition hover:bg-neutral-200">그 사이 승인됐어요</button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl at-glass p-5">
      <p className="text-[14px] font-bold text-neutral-900">애드포스트 신청 결과가 나왔나요?</p>
      <p className="mt-0.5 text-[12px] text-neutral-400">결과를 알려주시면 다음 단계를 준비해 드려요.</p>
      <div className="mt-3 flex gap-2">
        <button onClick={setApproved} className="at-press flex-1 rounded-xl tk-grad-cta py-2.5 text-[13px] font-bold text-white transition hover:opacity-90">승인</button>
        <button onClick={() => setState("hold")} className="at-press flex-1 rounded-xl bg-neutral-100 py-2.5 text-[13px] font-bold text-neutral-600 transition hover:bg-neutral-200">보류·심사 중</button>
        <button onClick={() => { setState("rejected"); setReason(null); setRetryDday(null); }} className="at-press flex-1 rounded-xl bg-neutral-100 py-2.5 text-[13px] font-bold text-neutral-600 transition hover:bg-neutral-200">거절</button>
      </div>
      {state === "hold" && <p className="mt-2 text-[12px] leading-relaxed text-neutral-400">심사는 보통 며칠 걸려요. 결과가 오면 다시 알려주세요 — 그동안 평소처럼 발행을 이어가면 돼요.</p>}
    </div>
  );
}
