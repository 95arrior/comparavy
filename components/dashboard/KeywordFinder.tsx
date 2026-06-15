"use client";

import { useState } from "react";

// API 응답 형태 (서버 lib/goldenKeyword.ts의 GoldenKeyword와 동일 — 서버 모듈을 클라에 import하지 않으려 별도 선언)
interface GoldenKeyword {
  keyword: string;
  monthlyMobileQcCnt: number;
  compIdx: string; // 낮음 / 중간
  highVolume: boolean;
}

const BRAND = "#3f91ff";

function compLabel(compIdx: string): string {
  if (compIdx === "낮음") return "경쟁 낮음";
  if (compIdx === "중간") return "경쟁 보통";
  return compIdx;
}

/**
 * 황금 키워드 발굴 (1단계 — 추천까지만).
 * 주제 입력 → /api/keywords/discover → "검색은 되는데 경쟁 낮은" 키워드 상위 30개를 좋은 순으로 보여준다.
 * (점수·등급 배지는 노출하지 않고 정렬 순서로만. 글 생성 연결은 2단계.)
 */
export default function KeywordFinder() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GoldenKeyword[] | null>(null);

  async function run() {
    const t = topic.trim();
    if (!t || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/keywords/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setResults(Array.isArray(data.keywords) ? data.keywords : []);
    } catch {
      setError("네트워크 오류예요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <h1 className="font-pretendard text-2xl font-bold tracking-tight sm:text-3xl">키워드 발굴</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-500">
          주제만 넣으면, 검색은 되는데 경쟁은 낮은
          <br className="hidden sm:block" /> ‘황금 키워드’를 좋은 순서로 찾아드려요.
        </p>
      </div>

      {/* 입력 */}
      <div className="mt-8 flex gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run(); }}
          placeholder="주제 키워드 (예: 강아지, 재테크, 캠핑)"
          maxLength={60}
          disabled={loading}
          className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-[#3f91ff] focus:ring-2 focus:ring-[#3f91ff]/20 disabled:opacity-60"
        />
        <button
          onClick={run}
          disabled={loading || !topic.trim()}
          className="shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: BRAND }}
        >
          {loading ? "찾는 중…" : "황금 키워드 찾기"}
        </button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#3f91ff]/30 border-t-[#3f91ff]" />
          <p className="text-sm text-neutral-500">네이버 검색 데이터를 분석하고 있어요…</p>
        </div>
      )}

      {/* 오류 */}
      {error && !loading && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      )}

      {/* 결과 없음 */}
      {results && results.length === 0 && !loading && (
        <div className="mt-10 text-center text-sm text-neutral-500">
          조건에 맞는 키워드를 못 찾았어요. 조금 더 넓은 주제로 다시 시도해 보세요.
        </div>
      )}

      {/* 결과 리스트 */}
      {results && results.length > 0 && !loading && (
        <div className="mt-8">
          <p className="mb-3 px-1 text-xs font-medium text-neutral-400">추천 키워드 {results.length}개 · 좋은 순</p>
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
            {results.map((k, i) => (
              <li key={k.keyword} className="flex items-center gap-3 px-4 py-3.5">
                <span className="w-5 shrink-0 text-center text-sm font-semibold text-neutral-300">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{k.keyword}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">월 {k.monthlyMobileQcCnt.toLocaleString("ko-KR")}회 검색 (모바일)</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      k.compIdx === "낮음" ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {compLabel(k.compIdx)}
                  </span>
                  {k.highVolume && <span className="text-[11px] text-amber-500">검색량 많음 · 경쟁 주의</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
