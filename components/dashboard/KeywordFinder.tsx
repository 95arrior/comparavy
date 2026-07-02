"use client";

import { useEffect, useState } from "react";
import type { KeywordResult, KeywordStatus } from "./types";

const BRAND = "#1D75F7";

// 검색은 단일 POST(네이버→AI→재검증)라 단계 이벤트가 없어, 로딩 동안 안내 메시지를 순환시킨다(멈춘 듯 안 보이게).
const STAGES = ["네이버 연관어 분석 중…", "AI로 검색 의도 재구성 중…", "황금 키워드 선별 중…"];

function compLabel(compIdx: string): string {
  if (compIdx === "낮음") return "경쟁 낮음";
  if (compIdx === "중간") return "경쟁 보통";
  return compIdx;
}

/**
 * 황금 키워드 발굴 (controlled). 검색 state는 부모(DashboardClient)가 보유 →
 * 탭 이동/새로고침에도 결과 유지. 여기선 표시 + 선택→큐 담기 + 단계 로딩/에러/빈결과 처리.
 */
export default function KeywordFinder({
  blogName,
  topic,
  onTopicChange,
  status,
  results,
  error,
  searchedTopic,
  onSearch,
  onCancel,
  onQueue,
  welcomeTopic,
  onDismissWelcome,
}: {
  blogName?: string | null;
  topic: string;
  onTopicChange: (t: string) => void;
  status: KeywordStatus;
  results: KeywordResult[] | null;
  error: string | null;
  searchedTopic: string | null;
  onSearch: (topic: string) => void;
  onCancel: () => void;
  onQueue: (keywords: string[]) => Promise<boolean>;
  welcomeTopic?: string | null;
  onDismissWelcome?: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [queuing, setQueuing] = useState(false);
  const [stage, setStage] = useState(0);

  const loading = status === "loading";

  // 로딩 동안 단계 메시지 순환
  useEffect(() => {
    if (!loading) { setStage(0); return; }
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1800);
    return () => clearInterval(t);
  }, [loading]);

  // 결과가 바뀌면(새 검색) 선택 초기화
  useEffect(() => { setSelected(new Set()); }, [searchedTopic]);

  function toggle(keyword: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  }

  async function queue() {
    if (selected.size === 0 || queuing) return;
    setQueuing(true);
    try {
      const ordered = (results ?? []).map((k) => k.keyword).filter((k) => selected.has(k));
      const ok = await onQueue(ordered);
      if (ok) setSelected(new Set());
    } finally {
      setQueuing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-24">
      {/* 온보딩 직후 환영 배너 */}
      {welcomeTopic && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#1D75F7]/30 bg-[#1D75F7]/5 px-5 py-4">
          <span className="text-lg">🎉</span>
          <p className="min-w-0 flex-1 text-sm font-medium text-neutral-800">
            <b className="text-[#2f7fe6]">{welcomeTopic}</b> 연구소가 만들어졌어요! 황금 키워드를 찾아볼까요?
          </p>
          {onDismissWelcome && (
            <button onClick={onDismissWelcome} aria-label="닫기" className="shrink-0 text-neutral-400 transition hover:text-neutral-700">✕</button>
          )}
        </div>
      )}

      <div className="text-center">
        {blogName && (
          <p className="mb-1 text-xs font-semibold tracking-tight text-[#1D75F7]">📓 {blogName} 연구소</p>
        )}
        <h1 className="font-pretendard text-2xl font-bold tracking-tight sm:text-3xl">키워드 발굴</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-500">
          검색은 되는데 경쟁은 낮은 ‘황금 키워드’를 찾고,
          <br className="hidden sm:block" /> 마음에 드는 걸 골라 발행 큐에 담아요.
        </p>
      </div>

      {/* 입력 */}
      <div className="mt-8 flex gap-2">
        <input
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !loading) onSearch(topic); }}
          placeholder="주제 키워드 (예: 강아지, 재테크, 캠핑)"
          maxLength={60}
          disabled={loading}
          className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-[#1D75F7] focus:ring-2 focus:ring-[#1D75F7]/20 disabled:opacity-60"
        />
        <button
          onClick={() => onSearch(topic)}
          disabled={loading || !topic.trim()}
          className="shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: BRAND }}
        >
          {loading ? "찾는 중…" : "황금 키워드 찾기"}
        </button>
      </div>

      {/* 로딩 — 단계 메시지 순환 + 취소 */}
      {loading && (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#1D75F7]/30 border-t-[#1D75F7]" />
          <p className="text-sm font-medium text-neutral-600">{STAGES[stage]}</p>
          <p className="text-xs text-neutral-400">몇 초 걸려요. 다른 탭으로 이동해도 계속 진행돼요.</p>
          <button onClick={onCancel} className="mt-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700">취소</button>
        </div>
      )}

      {/* 에러 — 다시 시도 */}
      {status === "error" && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <p>{error ?? "검색에 실패했어요."}</p>
          <button
            onClick={() => onSearch(searchedTopic || topic)}
            className="mt-3 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 빈 결과 */}
      {status === "done" && results && results.length === 0 && (
        <div className="mt-10 text-center text-sm text-neutral-500">
          ‘{searchedTopic}’로는 조건에 맞는 키워드를 못 찾았어요.<br />조금 더 넓은 주제로 다시 시도해 보세요.
        </div>
      )}

      {/* 결과 리스트 (클릭=선택) */}
      {status === "done" && results && results.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 px-1 text-xs font-medium text-neutral-400">
            ‘{searchedTopic}’ 추천 {results.length}개 · 좋은 순 · 담을 키워드를 누르세요
          </p>
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl at-glass ">
            {results.map((k) => {
              const on = selected.has(k.keyword);
              return (
                <li key={k.keyword}>
                  <button
                    onClick={() => toggle(k.keyword)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${on ? "bg-[#1D75F7]/5" : "hover:bg-neutral-50"}`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${on ? "border-[#1D75F7] bg-[#1D75F7] text-white" : "border-neutral-300 text-transparent"}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">{k.keyword}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        월 {k.estimated ? "~" : ""}{k.monthlyMobileQcCnt.toLocaleString("ko-KR")}회 검색 (모바일)
                        {k.estimated && <span className="text-neutral-300"> · 추정</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${k.compIdx === "낮음" ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-500"}`}>
                        {compLabel(k.compIdx)}
                      </span>
                      {k.highVolume && <span className="text-[11px] text-amber-500">검색량 많음 · 경쟁 주의</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 하단 액션바 */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="text-sm text-neutral-600"><b className="text-neutral-900">{selected.size}개</b> 선택됨</p>
            <button onClick={queue} disabled={queuing} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50" style={{ backgroundColor: BRAND }}>
              {queuing ? "담는 중…" : "발행 큐에 담기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
