"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ARTICLE_TYPES, TONES } from "@/lib/articlePrompt";
import type { GenParams } from "./dashboard/WritingView";

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
export default function HeroInput({ loggedIn, onStart, pro = false }: { loggedIn: boolean; onStart?: (p: GenParams) => void; pro?: boolean }) {
  const [keyword, setKeyword] = useState("");
  // 기본 미선택("") — 안 고르면 최적값(howto/friendly)으로 생성. 선택한 칩 다시 누르면 해제(토글).
  const [type, setType] = useState("");
  const [tone, setTone] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // 글감 추천
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideaLoading, setIdeaLoading] = useState(false);

  async function fetchIdeas() {
    const tp = topic.trim();
    if (!tp || ideaLoading) return;
    setIdeaLoading(true);
    try {
      const res = await fetch("/api/keyword-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: tp }),
      });
      const data = await res.json();
      setIdeas(Array.isArray(data.ideas) ? data.ideas : []);
    } catch {
      setIdeas([]);
    } finally {
      setIdeaLoading(false);
    }
  }

  function go(e: React.FormEvent) {
    e.preventDefault();
    const k = keyword.trim();
    // 글자(한글/영문)가 2개 미만이면 무의미 입력(숫자·특수문자·빈칸)으로 보고 차단 — 헛 생성 방지
    // 완성된 한글 음절(가–힣)·영문자만 '글자'로 인정 → ‘ㅁㅇ·ㅋㅋ·ㅠㅠ’ 같은 자모/무의미 입력 차단
    const letters = (k.match(/[가-힣a-zA-Z]/g) ?? []).length;
    if (letters < 2) {
      setErr(true);
      inputRef.current?.focus();
      return;
    }
    setLoading(true); // 무지개 효과로 "시작됨" 표시 (Enter·클릭 동일)
    // 안 고르면 최적 기본값으로 (미선택 허용)
    const t = type || "howto";
    const tn = tone || "friendly";
    // 작업공간 안(로그인)에서는 페이지 이동 없이 바로 작성화면으로 — 무지개 잠깐 보여준 뒤
    if (onStart) {
      setTimeout(() => onStart({ keyword: k, angle: "", type: t, tone: tn }), 650);
      return;
    }
    // 대시보드가 이걸 읽어 바로 작성화면을 띄운다 (로그인 거쳐도 유지)
    localStorage.setItem("ateflo_gen", JSON.stringify({ keyword: k, type: t, tone: tn }));
    // 무지개가 잠깐 요동치는 걸 보여준 뒤 이동 (즉시 이동하면 버튼이 사라진 것처럼 보임)
    setTimeout(() => router.push(loggedIn ? "/dashboard" : "/login"), 650);
  }

  const chipCls = (on: boolean) =>
    `flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-90 sm:text-sm ${
      on
        ? "bg-neutral-900 text-white shadow-sm ateflo-pop"
        : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
    }`;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div>
        <form
          onSubmit={go}
          className={`relative flex w-full items-center gap-2 rounded-2xl bg-white p-2 shadow-sm transition ${
            err ? "border border-red-400 focus-within:border-red-500" : pro ? "ateflo-rainbow-spin" : "border border-neutral-300 focus-within:border-neutral-900"
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
          className={`shrink-0 rounded-xl px-6 py-2.5 text-sm font-medium text-white transition active:scale-95 ${
            loading ? "ateflo-rainbow" : "bg-neutral-900 hover:bg-neutral-700"
          }`}
        >
          {loading ? "준비하고 있어요…" : "글 생성"}
        </button>
        </form>
      </div>
      {err && <p className="mt-2 pl-4 text-left text-sm text-red-500">검색할 만한 키워드를 입력해 주세요 (예: 강아지 분리불안).</p>}

      {/* 유형 · 문체 — 아이콘 칩 (선택. 안 골라도 기본값으로 생성) */}
      <div className="mt-4">
        <p className="mb-2 text-center text-xs text-neutral-300">유형·문체</p>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {ARTICLE_TYPES.map((t) => (
              <button key={t.key} type="button" onClick={() => setType(type === t.key ? "" : t.key)} title={t.hint} className={chipCls(type === t.key)}>
                {TYPE_ICON[t.key]}
                <span>{TYPE_SHORT[t.key] ?? t.label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {TONES.map((t) => (
              <button key={t.key} type="button" onClick={() => setTone(tone === t.key ? "" : t.key)} title={t.hint} className={chipCls(tone === t.key)}>
                {TONE_ICON[t.key]}
                <span>{TONE_SHORT[t.key] ?? t.label}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="pt-2 text-center text-[11px] text-neutral-400">안 골라도 알아서 최적으로 써드려요</p>
      </div>

      {/* 글감 추천 — 로그인(작업공간)에서만. 뭘 쓸지 모를 때 분야 넣으면 키워드 추천 */}
      {loggedIn && (
        <div className="mt-5">
          {!ideaOpen ? (
            <button
              type="button"
              onClick={() => setIdeaOpen(true)}
              className="mx-auto flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 py-1.5 text-xs font-medium text-neutral-500 transition active:scale-95 hover:border-neutral-400 hover:text-neutral-800"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.7 10.7c.5.4.7.9.7 1.3v.5h6v-.5c0-.4.2-.9.7-1.3A6 6 0 0 0 12 3Z" /></svg>
              뭘 쓸지 모르겠어요? 글감 추천받기
            </button>
          ) : (
            <div className="ateflo-fade-in rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">글감 추천</p>
                <button type="button" onClick={() => setIdeaOpen(false)} className="text-xs text-neutral-400 transition hover:text-neutral-700">닫기</button>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); fetchIdeas(); } }}
                  placeholder="어떤 분야예요? (예: 강아지, 재테크, 다이어트)"
                  className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-neutral-900"
                />
                <button
                  type="button"
                  onClick={fetchIdeas}
                  disabled={!topic.trim() || ideaLoading}
                  className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-95 hover:bg-neutral-700 disabled:opacity-40"
                >
                  {ideaLoading ? "추천 중…" : "추천받기"}
                </button>
              </div>

              {ideas.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-neutral-400">마음에 드는 글감을 누르면 위 칸에 채워져요</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ideas.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => {
                          setKeyword(idea);
                          if (err) setErr(false);
                          inputRef.current?.focus();
                          inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
                        }}
                        className="ateflo-chip-in rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-700 transition active:scale-95 hover:border-neutral-900 hover:bg-white"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
