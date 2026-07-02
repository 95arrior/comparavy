"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import AteFloLogo from "@/components/AteFloLogo";
import type { Article } from "./types";

// 완성된 최상위 블록만 추출(닫는 태그가 온 것). 스트리밍 중 미완성 블록은 제외 → 문단 단위로 등장.
const BLOCK_RE = /<(h1|h2|h3|p|ul|ol|blockquote)\b[^>]*>[\s\S]*?<\/\1>/gi;
function completeBlocks(html: string): string[] {
  return html.match(BLOCK_RE) ?? [];
}

export interface GenParams {
  keyword: string;
  angle: string;
  type: string;
  tone: string;
  promo: boolean; // true=홍보용(업장 연결) | false=정보성(순수 정보) — 네이버 수익형 단일 후 기본 false
  userStory?: string; // 직접 쓴 '내 이야기'(있으면 핵심 재료로 우리 품질로 재구성)
}

// "글 생성하기" 직후 전환되는 작성 화면.
// 대기 = '분석 라이브'(엔진이 하는 일 체크리스트) + 스켈레톤. 글 = 문단이 하나씩 부드럽게 페이드업.
export default function WritingView({
  params,
  pro,
  vertical,
  onDone,
  onCredits,
  onExit,
}: {
  params: GenParams;
  pro: boolean;
  vertical?: string;
  onDone: (article: Article) => void;
  /** 생성 완료 시 서버가 알려준 크레딧 잔액 반영 */
  onCredits?: (balance: number) => void;
  onExit: () => void;
}) {
  const [available, setAvailable] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [charCount, setCharCount] = useState(0); // 지금까지 써진 글자수(라이브)
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const titleRef = useRef("");
  const bodyRef = useRef("");
  const availRef = useRef<string[]>([]);
  const doneArtRef = useRef<Article | null>(null);
  const fetchedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const started = available.length > 0;
  const phase = error ? "error" : finished ? "done" : started ? "writing" : "thinking";

  // 분석 체크리스트 — 우리가 실제로 하는 일(해자 반영). 업종·채널·내 이야기로 분기.
  const steps = useMemo(() => {
    const story = Boolean(params.userStory && params.userStory.trim());
    const reg =
      vertical === "medical"
        ? "의료광고 규정 점검"
        : vertical === "professional"
        ? "광고 규정 점검"
        : vertical === "academy"
        ? "과장된 표현 점검"
        : "관련 규정 점검";
    return [
      story ? "내 이야기 꼼꼼히 읽는 중" : "검색 의도 분석 중",
      story ? "핵심 뉘앙스·강조점 파악" : "지금 뜨는 키워드 분석",
      "네이버 상위 글 구조 분석",
      "내 주제·분야 데이터 반영",
      reg,
      "초안 쓰고 다듬는 중",
    ];
  }, [params.userStory, vertical]);

  // 대기 동안 스텝 진행(마지막에서 멈추고 펄스)
  useEffect(() => {
    if (phase !== "thinking") return;
    const id = setInterval(() => setStepIdx((i) => Math.min(i + 1, steps.length - 1)), 1500);
    return () => clearInterval(id);
  }, [phase, steps.length]);

  // 문단 페이드 등장 — 140ms마다 한 블록씩(쏟아짐 방지)
  useEffect(() => {
    revealTimer.current = setInterval(() => {
      setRevealed((r) => (r < availRef.current.length ? r + 1 : r));
    }, 140);
    return () => {
      if (revealTimer.current) clearInterval(revealTimer.current);
    };
  }, []);

  // 서버 완료 + 다 보여줬으면 검토 화면으로
  useEffect(() => {
    const cap = available.length;
    if (doneArtRef.current && cap > 0 && revealed >= cap && !finished) {
      setFinished(true);
      const art = doneArtRef.current;
      doneArtRef.current = null;
      setTimeout(() => onDone(art), 1200);
    }
  }, [revealed, available.length, finished, onDone]);

  // 네트워크 호출 1회
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      run();
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 써지는 동안 끝이 보이게 살짝 따라 내려감
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [revealed]);

  // 백그라운드 갔다 오면 받은 내용 즉시 다 표시(fast-forward)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      setRevealed(availRef.current.length);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  function recompute() {
    const t = titleRef.current ? `<h1>${titleRef.current}</h1>` : "";
    const blocks = completeBlocks(t + bodyRef.current);
    availRef.current = blocks;
    setAvailable(blocks);
    setCharCount(bodyRef.current.replace(/<[^>]+>/g, "").replace(/\s/g, "").length);
  }

  async function run() {
    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "글 생성에 실패했어요.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buf += decoder.decode(chunk.value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          let msg: { type: string; html?: string; title?: string; article?: Article; error?: string; credits?: number };
          try {
            msg = JSON.parse(line);
          } catch {
            continue;
          }
          if (msg.type === "title") {
            titleRef.current = msg.title ?? "";
            recompute();
          } else if (msg.type === "body") {
            bodyRef.current = msg.html ?? "";
            recompute();
          } else if (msg.type === "done" && msg.article) {
            doneArtRef.current = msg.article;
            if (typeof msg.credits === "number") onCredits?.(msg.credits); // 잔액 갱신
            done = true;
          } else if (msg.type === "error") {
            setError(msg.error ?? "글 생성에 실패했어요.");
            done = true;
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("네트워크 오류가 났어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  const blocks = available.slice(0, revealed);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          {phase === "error" ? (
            <button onClick={onExit} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
              <span className="text-base leading-none">←</span> 글 목록으로
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm text-neutral-400">
              <AteFloLogo pro={pro} animated size={16} />
              {phase === "writing" ? <>글을 쓰고 있어요 · <b className="tabular-nums text-neutral-600">{charCount.toLocaleString("ko-KR")}자</b></> : "글을 준비하고 있어요"}
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
            <div className="mt-3">
              <button onClick={onExit} className="rounded-xl border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100">
                돌아가기
              </button>
            </div>
          </div>
        ) : phase === "thinking" ? (
          <AnalysisWaiting steps={steps} stepIdx={stepIdx} pro={pro} />
        ) : (
          <>
            <div className="prose prose-neutral max-w-none">
              {blocks.map((b, i) => (
                <div
                  key={i}
                  className={`ateflo-block-in [&>*]:!my-0 ${b.startsWith("<h2") ? "mt-6 mb-2" : b.startsWith("<h1") ? "mb-3" : "mb-3.5"}`}
                  dangerouslySetInnerHTML={{ __html: b }}
                />
              ))}
            </div>
            {!finished && (
              <div className="ateflo-block-in mt-4 flex items-center gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#1D75F7] [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#1D75F7] [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#1D75F7]" />
              </div>
            )}
          </>
        )}
        <div ref={endRef} className="scroll-mb-40" />
      </div>

      {phase === "done" && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[80] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <span className="ateflo-circle-pop flex h-20 w-20 items-center justify-center rounded-full bg-[#1D75F7] text-white shadow-[0_12px_44px_rgba(29,117,247,0.45)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="ateflo-check-draw" d="M5 13l4 4L19 7" /></svg>
          </span>
          <p className="at-rise mt-5 text-[18px] font-extrabold tracking-tight text-[color:var(--at-grey-900)]" style={{ animationDelay: "0.3s" }}>글이 완성됐어요</p>
          <p className="at-rise mt-1 text-[13px] text-neutral-400" style={{ animationDelay: "0.5s" }}>{charCount.toLocaleString("ko-KR")}자 · 검토 화면으로 갈게요</p>
        </div>
      )}
    </>
  );
}

// 대기 화면 — AI 오브 + 현재 단계 '한 문장 크게'(교체), 지난 단계는 작은 체크로 쌓임
function AnalysisWaiting({ steps, stepIdx }: { steps: string[]; stepIdx: number; pro: boolean }) {
  return (
    <div className="flex min-h-[62vh] flex-col items-center justify-center text-center">
      <div className="at-ai-orb" aria-hidden />
      <div key={stepIdx} className="ateflo-soft-in mt-8 px-4">
        <p className="text-[21px] font-extrabold leading-snug tracking-tight text-[color:var(--at-grey-900)]">{steps[stepIdx]}</p>
      </div>
      {/* 지나온 단계 — 작은 체크 스택(최근 3개만) */}
      <div className="mt-6 space-y-1.5">
        {steps.slice(Math.max(0, stepIdx - 3), stepIdx).map((s) => (
          <p key={s} className="flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-neutral-300">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34c98e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            {s}
          </p>
        ))}
      </div>
    </div>
  );
}
