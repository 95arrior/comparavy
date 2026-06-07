"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

// 홈 도구형 입력창. 익명은 가입 게이트(마진·어뷰징 방어), 로그인 상태는 대시보드로.
export default function HeroInput({ loggedIn }: { loggedIn: boolean }) {
  const [keyword, setKeyword] = useState("");
  const [err, setErr] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function go(e: React.FormEvent) {
    e.preventDefault();
    const k = keyword.trim();
    if (!k) {
      // 빈 키워드면 절대 이동하지 않음 — 왜 안 넘어가는지 보이게 안내+포커스
      setErr(true);
      inputRef.current?.focus();
      return;
    }
    // 로그인 거쳐도 키워드가 유지되도록 저장 → 대시보드에서 이어받아 프리필
    localStorage.setItem("ateflo_kw", k);
    router.push(loggedIn ? "/dashboard" : "/login");
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <form
        onSubmit={go}
        className={`flex w-full items-center gap-2 rounded-full border bg-white p-2 shadow-sm transition ${
          err ? "border-red-400 focus-within:border-red-500" : "border-neutral-300 focus-within:border-neutral-900"
        }`}
      >
        <input
          ref={inputRef}
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            if (err) setErr(false);
          }}
          placeholder="예: 강아지 분리불안 해결 방법"
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          글 생성
        </button>
      </form>
      {err && <p className="mt-2 pl-4 text-left text-sm text-red-500">키워드를 먼저 입력해 주세요.</p>}
    </div>
  );
}
