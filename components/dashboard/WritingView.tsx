"use client";

import { useState, useRef, useEffect } from "react";
import AteFloLogo from "@/components/AteFloLogo";
import type { Article } from "./types";

// HTML을 태그/문자 단위로 쪼갠다(타이핑 시 태그가 잘리지 않게)
function tokenize(html: string): string[] {
  return html.match(/<[^>]*>|[^<]/g) ?? [];
}

// 티저(잠금 미리보기)는 본문 ~3줄만 쓰고 블러로 넘어간다
const TEASER_BODY_CHARS = 130;

// 제목 쓰고 본문 시작 전 대기 구간 안내 (순환)
const WAIT_MSGS = ["거의 다 준비됐어요…", "조금만 기다려주세요!", "곧 본문이 시작돼요"];

export interface GenParams {
  keyword: string;
  angle: string;
  type: string;
  tone: string;
}

// "글 생성하기" 직후 전환되는 전체 페이지 작성 화면. 편집화면과 같은 레이아웃에서
// 제목(H1) → 본문이 사람이 치듯 타이핑되고, 끝나면 편집 화면으로 자연스럽게 넘긴다.
export default function WritingView({
  params,
  pro,
  isTeaser,
  onDone,
  onExit,
}: {
  params: GenParams;
  pro: boolean;
  isTeaser: boolean;
  onDone: (article: Article) => void;
  onExit: () => void;
}) {
  const [preview, setPreview] = useState("");
  const [finished, setFinished] = useState(false); // 타이핑 완료(편집 전환 직전)
  const [bodyStarted, setBodyStarted] = useState(false);
  const [waitTick, setWaitTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const targetRef = useRef("");
  const titleRef = useRef("");
  const bodyRef = useRef("");
  const bodyStartedRef = useRef(false);
  const doneArtRef = useRef<Article | null>(null);
  const shownRef = useRef(0);
  const visibleRef = useRef(0); // 지금까지 보여준 '글자' 수(태그 제외)
  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchedRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const phase = error
    ? "error"
    : finished
    ? "done"
    : !preview
    ? "thinking"
    : !bodyStarted
    ? "waiting"
    : "writing";

  useEffect(() => {
    startReveal(); // 타자기 루프 (StrictMode 재마운트 시 재시작됨)
    if (!fetchedRef.current) {
      fetchedRef.current = true; // 네트워크 호출은 1회만 (= 1글 1콜 유지)
      run();
    }
    return () => stopReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 대기 구간 동안 안내 문구 순환
  useEffect(() => {
    if (phase !== "waiting") return;
    const id = setInterval(() => setWaitTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, [phase]);

  // 써내려갈 때 끝(작성 표시)이 보이게 살짝 따라 내려간다
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [preview]);

  function stopReveal() {
    if (revealRef.current) {
      clearInterval(revealRef.current);
      revealRef.current = null;
    }
  }
  function composeTarget() {
    const t = titleRef.current ? `<h1>${titleRef.current}</h1>` : "";
    targetRef.current = t + bodyRef.current;
  }
  function startReveal() {
    stopReveal();
    revealRef.current = setInterval(() => {
      const tokens = tokenize(targetRef.current);
      // 티저는 제목 + 본문 ~3줄까지만 타이핑하고 멈춘다
      const capReached = isTeaser && visibleRef.current >= titleRef.current.length + TEASER_BODY_CHARS;
      if (shownRef.current < tokens.length && !capReached) {
        // 사람이 타이핑하듯 한 틱에 글자 2개만. 태그(<...>)는 즉시 통과.
        let typed = 0;
        while (shownRef.current < tokens.length && typed < 2) {
          const tok = tokens[shownRef.current];
          shownRef.current += 1;
          if (!tok.startsWith("<")) {
            typed += 1;
            visibleRef.current += 1;
          }
        }
        setPreview(tokens.slice(0, shownRef.current).join(""));
      } else if (doneArtRef.current && (shownRef.current >= tokens.length || capReached)) {
        // 비티저=다 따라잡은 뒤 / 티저=3줄 + 서버 완료 → 편집(또는 잠금 블러) 화면으로
        const art = doneArtRef.current;
        doneArtRef.current = null;
        stopReveal();
        setFinished(true);
        setTimeout(() => onDone(art), 1400);
      }
    }, 32);
  }

  async function run() {
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      // 사전 검사 실패(429/403 등)는 일반 JSON 으로 옴
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        stopReveal();
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
          let msg: { type: string; html?: string; title?: string; article?: Article; error?: string };
          try {
            msg = JSON.parse(line);
          } catch {
            continue;
          }
          if (msg.type === "title") {
            titleRef.current = msg.title ?? "";
            composeTarget();
          } else if (msg.type === "body") {
            bodyRef.current = msg.html ?? "";
            composeTarget();
            if (!bodyStartedRef.current && (msg.html ?? "").trim()) {
              bodyStartedRef.current = true;
              setBodyStarted(true);
            }
          } else if (msg.type === "done" && msg.article) {
            doneArtRef.current = msg.article; // 타이핑이 다 따라잡으면(또는 티저 3줄) 전환
            done = true;
          } else if (msg.type === "error") {
            stopReveal();
            setError(msg.error ?? "글 생성에 실패했어요.");
            done = true;
          }
        }
      }
    } catch {
      stopReveal();
      setError("네트워크 오류가 났어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  const indicatorText =
    phase === "writing"
      ? "글을 쓰고 있어요…"
      : phase === "waiting"
      ? WAIT_MSGS[waitTick % WAIT_MSGS.length]
      : "글을 구상하고 있어요…";

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <button onClick={onExit} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
            <span className="text-base leading-none">←</span> 글 목록으로
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
            <div className="mt-3">
              <button onClick={onExit} className="rounded-full border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100">
                돌아가기
              </button>
            </div>
          </div>
        ) : (
          <>
            {preview && (
              <>
                <div className="prose prose-neutral max-w-none" dangerouslySetInnerHTML={{ __html: preview }} />
                {phase === "writing" && <span className="ml-0.5 inline-block animate-pulse text-neutral-500">▍</span>}
              </>
            )}
            {phase !== "done" && (
              <div className="mt-5 flex items-center gap-2 text-sm text-neutral-400">
                <AteFloLogo pro={pro} animated size={18} />
                <span>{indicatorText}</span>
              </div>
            )}
          </>
        )}
        <div ref={endRef} className="scroll-mb-40" />
      </div>

      {phase === "done" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-10 py-7 shadow-xl">
            <AteFloLogo pro={pro} animated size={30} />
            <p className="text-sm font-medium text-neutral-800">워드프레스 형식으로 정리하고 있어요…</p>
            <p className="text-xs text-neutral-400">제목·소제목·메타 정보를 다듬는 중</p>
          </div>
        </div>
      )}
    </>
  );
}
