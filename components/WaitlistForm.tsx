"use client";

import { useState } from "react";

/** 사전 등록 이메일 폼. 등록되면 체크 + 메시지로 전환(톡 등장). */
export default function WaitlistForm({ source = "landing", autoFocus = false }: { source?: string; autoFocus?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setErr("이메일 주소를 다시 확인해 주세요.");
      return;
    }
    setErr(null);
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v, source }),
      });
      if (res.ok) setState("done");
      else {
        const d = await res.json().catch(() => ({}));
        setErr(d.error ?? "등록에 실패했어요. 잠시 후 다시 시도해 주세요.");
        setState("idle");
      }
    } catch {
      setErr("등록에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="ateflo-pop mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-emerald-800">신청 완료!</p>
          <p className="text-xs text-emerald-700">오픈하면 가장 먼저 메일로 알려드릴게요.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md">
      <div className="flex w-full items-center gap-2 rounded-2xl border border-neutral-300 bg-white p-2 shadow-sm transition-all duration-200 focus-within:border-neutral-900 focus-within:ring-4 focus-within:ring-neutral-900/5">
        <input
          type="email"
          autoFocus={autoFocus}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (err) setErr(null); }}
          placeholder="이메일 주소"
          inputMode="email"
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="shrink-0 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition active:scale-95 hover:bg-neutral-700 disabled:opacity-50"
        >
          {state === "loading" ? "신청 중…" : "신청하기"}
        </button>
      </div>
      {err ? (
        <p className="mt-2 pl-2 text-left text-xs text-red-500">{err}</p>
      ) : (
        <p className="mt-2.5 text-center text-xs text-neutral-400">오픈하면 가장 먼저 초대해드릴게요 · 스팸 없어요</p>
      )}
    </form>
  );
}
