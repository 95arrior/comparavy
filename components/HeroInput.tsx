"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 홈 도구형 입력창. 익명은 가입 게이트(마진·어뷰징 방어), 로그인 상태는 대시보드로.
export default function HeroInput({ loggedIn }: { loggedIn: boolean }) {
  const [keyword, setKeyword] = useState("");
  const router = useRouter();

  function go(e: React.FormEvent) {
    e.preventDefault();
    const k = keyword.trim();
    if (loggedIn) {
      router.push(k ? `/dashboard?k=${encodeURIComponent(k)}` : "/dashboard");
    } else {
      router.push("/login");
    }
  }

  return (
    <form
      onSubmit={go}
      className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-neutral-300 bg-white p-2 shadow-sm transition focus-within:border-neutral-900"
    >
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
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
  );
}
