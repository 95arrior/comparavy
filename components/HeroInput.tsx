"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ARTICLE_TYPES, TONES } from "@/lib/articlePrompt";

// 에디터 툴바와 같은 라인 아이콘(majesticons) 스타일
function Ico({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  howto: <Ico><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 5.5l1 1 2-2M4 11.5l1 1 2-2M4 17.5l1 1 2-2" /></Ico>,
  listicle: <Ico><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1.2" fill="currentColor" /><circle cx="4" cy="12" r="1.2" fill="currentColor" /><circle cx="4" cy="18" r="1.2" fill="currentColor" /></Ico>,
  comparison: <Ico><path d="M12 4v16M4 8h16" /><path d="M7 8l-3 6h6zM17 8l-3 6h6z" /></Ico>,
  trend: <Ico><path d="M4 17l5-5 3 3 7-8" /><path d="M15 7h5v5" /></Ico>,
};
const TONE_ICON: Record<string, React.ReactNode> = {
  friendly: <Ico><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5s1.3 1.5 3.5 1.5 3.5-1.5 3.5-1.5" /><path d="M9 9.5h.01M15 9.5h.01" /></Ico>,
  professional: <Ico><rect x="3" y="8" width="18" height="11" rx="1.5" /><path d="M8 8V6.5A2 2 0 0 1 10 4.5h4a2 2 0 0 1 2 2V8" /></Ico>,
  persuasive: <Ico><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" /><path d="M15 9a4 4 0 0 1 0 6" /></Ico>,
  informative: <Ico><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></Ico>,
};

// 칩에 쓰는 짧은 라벨
const TYPE_SHORT: Record<string, string> = { howto: "하우투", listicle: "리스트", comparison: "비교", trend: "트렌드" };
const TONE_SHORT: Record<string, string> = { friendly: "친근", professional: "전문", persuasive: "설득", informative: "객관" };

// 홈 도구형 입력창. 익명은 가입 게이트(마진·어뷰징 방어), 로그인 상태는 대시보드로.
// 키워드 + 유형/문체를 함께 받아, 대시보드 생성탭을 거치지 않고 바로 작성화면으로 보낸다(뎁스 축소).
export default function HeroInput({ loggedIn }: { loggedIn: boolean }) {
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState(ARTICLE_TYPES[0].key);
  const [tone, setTone] = useState(TONES[0].key);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function go(e: React.FormEvent) {
    e.preventDefault();
    const k = keyword.trim();
    if (!k) {
      setErr(true);
      inputRef.current?.focus();
      return;
    }
    setLoading(true); // 무지개 효과로 "시작됨" 표시 (이동 직전까지)
    // 대시보드가 이걸 읽어 바로 작성화면을 띄운다 (로그인 거쳐도 유지)
    localStorage.setItem("ateflo_gen", JSON.stringify({ keyword: k, type, tone }));
    router.push(loggedIn ? "/dashboard" : "/login");
  }

  const chipCls = (on: boolean) =>
    `flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition ${
      on
        ? "border-neutral-900 bg-neutral-900 font-medium text-white"
        : "border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
    }`;

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
          disabled={loading}
          className={`shrink-0 rounded-full px-6 py-2.5 text-sm font-medium text-white transition ${
            loading ? "ateflo-rainbow" : "bg-neutral-900 hover:bg-neutral-700"
          }`}
        >
          {loading ? "준비하고 있어요…" : "글 생성"}
        </button>
      </form>
      {err && <p className="mt-2 pl-4 text-left text-sm text-red-500">키워드를 먼저 입력해 주세요.</p>}

      {/* 유형 · 문체 — 아이콘 칩 (선택. 안 골라도 기본값으로 생성) */}
      <div className="mt-5 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="w-7 shrink-0 text-xs text-neutral-300">유형</span>
          {ARTICLE_TYPES.map((t) => (
            <button key={t.key} type="button" onClick={() => setType(t.key)} title={t.hint} className={chipCls(type === t.key)}>
              {TYPE_ICON[t.key]}
              {TYPE_SHORT[t.key] ?? t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="w-7 shrink-0 text-xs text-neutral-300">문체</span>
          {TONES.map((t) => (
            <button key={t.key} type="button" onClick={() => setTone(t.key)} title={t.hint} className={chipCls(tone === t.key)}>
              {TONE_ICON[t.key]}
              {TONE_SHORT[t.key] ?? t.label}
            </button>
          ))}
        </div>
        <p className="pt-0.5 text-center text-[11px] text-neutral-400">안 골라도 괜찮아요 · 기본값으로 써드려요</p>
      </div>
    </div>
  );
}
