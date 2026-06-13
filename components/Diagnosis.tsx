"use client";

import { useState, useEffect, useRef } from "react";
import { QUESTIONS, computeResult, rangeLabel, type Answers, type DiagnosisResult } from "@/lib/diagnosis";

const ACCENT = "#3182F6";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Phase = "quiz" | "calc" | "result";

// 0→1 easeOut 진행값 (카운트업·막대 공용)
function useProgress(active: boolean, duration = 1100) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!active) { setP(0); return; }
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const k = Math.min(1, (t - start) / duration);
      setP(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, duration]);
  return p;
}

export default function Diagnosis() {
  const [phase, setPhase] = useState<Phase>("quiz");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const q = QUESTIONS[idx];

  function pick(optionId: string) {
    const next: Answers = { ...answers, [q.key]: optionId };
    setAnswers(next);
    if (idx < QUESTIONS.length - 1) {
      setIdx(idx + 1);
    } else {
      setPhase("calc");
      window.setTimeout(() => {
        setResult(computeResult(next));
        setPhase("result");
      }, 1500);
    }
  }

  function restart() {
    setAnswers({});
    setIdx(0);
    setResult(null);
    setPhase("quiz");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div ref={topRef} className="mx-auto w-full max-w-xl scroll-mt-24">
      {phase === "quiz" && <Quiz q={q} idx={idx} selected={answers[q.key]} onPick={pick} onBack={idx > 0 ? () => setIdx(idx - 1) : undefined} />}
      {phase === "calc" && <Calculating />}
      {phase === "result" && result && <Result result={result} answers={answers} onRestart={restart} />}
    </div>
  );
}

/* ---------- 시뮬레이터(문항) ---------- */
function Quiz({
  q,
  idx,
  selected,
  onPick,
  onBack,
}: {
  q: (typeof QUESTIONS)[number];
  idx: number;
  selected?: string;
  onPick: (id: string) => void;
  onBack?: () => void;
}) {
  const total = QUESTIONS.length;
  const cols = q.options.length === 3 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div key={idx} className="ateflo-pop rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      {/* 진행 */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: ACCENT }}>
          {idx + 1} / {total}
        </span>
        {onBack && (
          <button onClick={onBack} className="text-xs font-medium text-neutral-400 transition hover:text-neutral-700">← 이전</button>
        )}
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((idx + 1) / total) * 100}%`, background: ACCENT }} />
      </div>

      <h3 className="mt-6 font-bold tracking-tight text-neutral-900" style={{ fontSize: "clamp(19px, 5vw, 24px)", lineHeight: 1.35, wordBreak: "keep-all" }}>
        {q.title}
      </h3>

      <div className={`mt-6 grid ${cols} gap-2.5`}>
        {q.options.map((o) => {
          const on = selected === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onPick(o.id)}
              className={`flex min-h-[52px] items-center justify-center rounded-2xl border px-4 text-center text-sm font-semibold transition active:scale-[0.97] ${
                on ? "border-transparent text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
              }`}
              style={on ? { background: ACCENT } : undefined}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 계산 중(1.5s) ---------- */
function Calculating() {
  const [flick, setFlick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setFlick(Math.floor(Math.random() * 90) + 10), 80);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="ateflo-pop rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
      <p className="text-sm font-medium text-neutral-500">예상 수익 계산 중…</p>
      <p className="mt-4 font-bold tracking-tight tabular-nums" style={{ fontSize: "clamp(36px, 11vw, 56px)", color: ACCENT, lineHeight: 1 }}>
        월 {flick}만원
      </p>
      <div className="mx-auto mt-6 flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full" style={{ background: ACCENT, animation: `dot-pulse 1.2s ${i * 0.18}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );
}

/* ---------- 결과 ---------- */
function Result({ result, answers, onRestart }: { result: DiagnosisResult; answers: Answers; onRestart: () => void }) {
  const [shown, setShown] = useState(false);
  const p = useProgress(true, 1100);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  const wpLo = Math.round(result.wordpress[0] * p);
  const wpHi = Math.round(result.wordpress[1] * p);
  const maxHi = Math.max(result.wordpress[1], result.naver[1]) || 1;
  const naverW = shown ? (result.naver[1] / maxHi) * 100 : 0;
  const wpW = shown ? (result.wordpress[1] / maxHi) * 100 : 0;

  // 등장 stagger 유틸
  const rise = (delay: number) =>
    ({
      transitionDelay: `${delay}ms`,
      transitionTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    }) as React.CSSProperties;
  const riseCls = `transition-all duration-[400ms] ${shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      {/* 유형 뱃지 */}
      <div className={`text-center ${riseCls}`} style={rise(0)}>
        <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900/5 px-3.5 py-1.5 text-sm font-bold text-neutral-800">
          <span aria-hidden>{result.emoji}</span> {result.name}
        </span>
      </div>

      {/* 카운트업 — 워드프레스로 가능한 월 수익(범위) */}
      <div className={`mt-5 text-center ${riseCls}`} style={rise(80)}>
        <p className="text-sm text-neutral-500">워드프레스로 가능한 월 수익</p>
        <p className="mt-1.5 font-bold tracking-tight tabular-nums" style={{ fontSize: "clamp(34px, 10vw, 52px)", color: ACCENT, lineHeight: 1.05 }}>
          월 {wpLo}~{wpHi}<span style={{ fontSize: "0.5em" }}>만원</span>
        </p>
      </div>

      {/* 네이버 vs 워드프레스 막대 */}
      <div className={`mt-6 space-y-3 ${riseCls}`} style={rise(160)}>
        <BarRow label="네이버" value={rangeLabel(result.naver)} width={naverW} color="#9ca3af" />
        <BarRow label="워드프레스" value={rangeLabel(result.wordpress)} width={wpW} color={ACCENT} emphasize />
      </div>

      {/* 유형 코멘트 */}
      <p className={`mt-5 text-center font-medium text-neutral-700 ${riseCls}`} style={{ ...rise(240), fontSize: "clamp(15px, 4vw, 17px)", wordBreak: "keep-all" }}>
        {result.comment}
      </p>
      <p className={`mt-2 text-center text-xs text-neutral-400 ${riseCls}`} style={rise(280)}>
        {result.disclaimer}
      </p>

      {/* 사전신청 */}
      <div className={`mt-7 border-t border-neutral-100 pt-6 ${riseCls}`} style={rise(360)}>
        <p className="text-center font-bold tracking-tight text-neutral-900" style={{ fontSize: "clamp(16px, 4.4vw, 19px)", lineHeight: 1.4, wordBreak: "keep-all" }}>
          이 수익, 워드프레스로 시작할 수 있어요.
        </p>
        <p className="mt-1.5 text-center text-sm text-neutral-500">오픈하면 가장 먼저 알려드릴게요.</p>
        <div className="mt-4">
          <SignupInline answers={answers} result={result} onRestart={onRestart} />
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, value, width, color, emphasize }: { label: string; value: string; width: number; color: string; emphasize?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={emphasize ? "font-bold text-neutral-900" : "font-medium text-neutral-500"}>{label}</span>
        <span className={`tabular-nums ${emphasize ? "font-bold" : "text-neutral-500"}`} style={emphasize ? { color } : undefined}>
          {value}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color, transition: "width 1s cubic-bezier(0.25, 0.1, 0.25, 1)" }} />
      </div>
    </div>
  );
}

/* ---------- 결과 내 사전신청(기존 /api/waitlist 재사용) ---------- */
function SignupInline({ answers, result, onRestart }: { answers: Answers; result: DiagnosisResult; onRestart: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [already, setAlready] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    const v = email.trim();
    if (!EMAIL_RE.test(v)) {
      setErr("이메일 주소를 다시 확인해 주세요.");
      return;
    }
    setErr(null);
    setState("loading");
    // 광고 채널 추적(?src=) 유지, 없으면 'diagnosis'. 진단응답은 diagnosis 필드로.
    let source = "diagnosis";
    try {
      const src = new URLSearchParams(window.location.search).get("src");
      if (src) source = src.replace(/[^a-zA-Z0-9가-힣_-]/g, "").slice(0, 40) || "diagnosis";
    } catch {
      // 무시
    }
    const diagnosis = { ...answers, type: result.typeId, naver: result.naver, wordpress: result.wordpress };
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v, source, diagnosis }),
      });
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        setAlready(d.already === true);
        setState("done");
      } else {
        const d = await res.json().catch(() => ({}));
        setErr(d.error ?? "등록에 실패했어요. 잠시 후 다시 시도해 주세요.");
        setState("idle");
      }
    } catch {
      setErr("등록에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setState("idle");
    }
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.origin : "https://ateflo.com";
    const text = "내 블로그, 월 얼마까지 가능할까? 30초 진단해봤어요.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "AteFlo 블로그 수익 진단", text, url });
        return;
      }
    } catch {
      return; // 사용자가 공유 취소 — 조용히 종료
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      // 무시
    }
  }

  if (state === "done") {
    return (
      <div className="ateflo-pop">
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">{already ? "이미 신청하셨어요!" : "신청 완료!"}</p>
            <p className="text-xs text-emerald-700">{already ? "오픈하면 잊지 않고 가장 먼저 알려드릴게요." : "오픈하면 가장 먼저 메일로 알려드릴게요."}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4">
          <button onClick={share} className="text-sm font-semibold transition hover:opacity-70" style={{ color: ACCENT }}>
            {shared ? "링크 복사됐어요 ✓" : "친구도 진단해보기 ↗"}
          </button>
          <button onClick={onRestart} className="text-sm font-medium text-neutral-400 transition hover:text-neutral-700">다시 진단</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md">
      <div className="flex w-full items-center gap-2 rounded-2xl border border-neutral-300 bg-white p-2 shadow-sm transition-all duration-200 focus-within:border-neutral-900 focus-within:ring-4 focus-within:ring-neutral-900/5">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (err) setErr(null); }}
          placeholder="이메일 주소"
          inputMode="email"
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50"
          style={{ background: ACCENT }}
        >
          {state === "loading" ? "신청 중…" : "신청하기"}
        </button>
      </div>
      {err ? (
        <p className="mt-2 pl-2 text-left text-xs text-red-500">{err}</p>
      ) : (
        <p className="mt-2.5 text-center text-xs leading-relaxed text-neutral-400">
          사전 신청 무료 · 결제 정보 안 받아요<br />
          신청 시 출시 알림을 위한 <a href="/privacy" target="_blank" className="underline hover:text-neutral-600">개인정보 수집·이용</a>에 동의해요.
        </p>
      )}
    </form>
  );
}
