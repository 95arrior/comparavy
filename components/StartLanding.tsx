"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, type TargetAndTransition } from "framer-motion";
import { ReactLenis } from "lenis/react";
import Brand from "@/components/Brand";
import SiteFooter from "@/components/SiteFooter";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";

const ACCENT = "#3f91ff";

/* ════ 시네마틱 인트로 — 거대한 크롬 팩맨이 어둠 속에서 빛 스윕으로 드러남 ════ */
function PacmanIntro() {
  const [done, setDone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDone(true), 2900); return () => clearTimeout(t); }, []);
  return (
    <AnimatePresence>
      {!done && (
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: "easeInOut" }} className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#050609]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#16203a]/60 blur-[130px]" />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} className="relative">
            <svg viewBox="0 0 200 200" className="aspect-square w-[72vmin] max-w-[560px] drop-shadow-[0_0_70px_rgba(150,175,210,0.22)]">
              <defs>
                <linearGradient id="pac-chrome" gradientUnits="userSpaceOnUse" x1="20" y1="20" x2="180" y2="180">
                  <stop offset="0.28" stopColor="#2a2d35" />
                  <stop offset="0.45" stopColor="#aab0bd" />
                  <stop offset="0.5" stopColor="#f5f8fd" />
                  <stop offset="0.55" stopColor="#aab0bd" />
                  <stop offset="0.72" stopColor="#2a2d35" />
                  <animateTransform attributeName="gradientTransform" type="translate" values="-240 -240; 240 240; -240 -240" dur="3.6s" repeatCount="indefinite" />
                </linearGradient>
              </defs>
              {/* 입 벌린 팩맨(오른쪽) */}
              <path d="M100 100 L186 64 A94 94 0 1 0 186 136 Z" fill="url(#pac-chrome)" />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════ 프리로더 (0→100%) ════ */
function Preloader() {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1300;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setPct(Math.round((1 - Math.pow(1 - p, 2)) * 100));
      if (p < 1) raf = requestAnimationFrame(step);
      else setTimeout(() => setDone(true), 250);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <AnimatePresence>
      {!done && (
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.55, ease: "easeInOut" }} className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="flex justify-center"><Brand /></div>
            <p className="font-pretendard mt-7 text-5xl font-extrabold tracking-tight text-neutral-900 sm:text-6xl">{pct}<span className="text-[#3f91ff]">%</span></p>
            <div className="mx-auto mt-4 h-1 w-48 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-[#3f91ff] transition-[width] duration-100" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════ 히어로 배경: 빛 퍼짐 + 물결(움직임) ════ */
function MovingAurora() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* 물결: 난류로 일렁이는 빛 (SVG) */}
      <svg className="absolute inset-0 h-full w-full opacity-80" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 900">
        <defs>
          <radialGradient id="mw-b" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#6fb0ff" stopOpacity="0.85" /><stop offset="100%" stopColor="#6fb0ff" stopOpacity="0" /></radialGradient>
          <filter id="mw-liquid" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="7" result="n">
              <animate attributeName="baseFrequency" dur="20s" values="0.006 0.009; 0.013 0.006; 0.006 0.009" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="110" />
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <g filter="url(#mw-liquid)">
          <ellipse cx="520" cy="360" rx="340" ry="320" fill="url(#mw-b)" />
        </g>
      </svg>
      {/* 떠다니는 빛 덩어리 (확실히 움직임) */}
      <motion.div animate={{ x: [0, 90, 0], y: [0, -50, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute left-[16%] top-[22%] h-[30rem] w-[30rem] rounded-full bg-[#6fb0ff]/35 blur-[100px]" />
      <motion.div animate={{ x: [0, -80, 0], y: [0, 60, 0] }} transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }} className="absolute right-[12%] top-[30%] h-[28rem] w-[28rem] rounded-full bg-[#9ad0ff]/35 blur-[100px]" />
      <motion.div animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} className="absolute left-1/2 top-[8%] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-[#b9c4ff]/40 blur-[100px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white" />
    </div>
  );
}
function LoadRipple() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} initial={{ scale: 0, opacity: 0.4 }} animate={{ scale: 7, opacity: 0 }} transition={{ duration: 2.6, delay: 1.4 + i * 0.45, ease: "easeOut" }} className="absolute h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(63,145,255,0.35), transparent 70%)" }} />
      ))}
    </div>
  );
}

/* ════ 고품질 목업 (브라우저 윈도우 + 앱 UI) ════ */
// 프레임리스 패널 — 브라우저 창(점·URL·사이드바) 없이 깔끔한 큰 화면 (스텝용)
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-xl">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] bg-[#3f91ff]/18 blur-[80px]" />
      <div className="h-[380px] overflow-hidden rounded-[2rem] border border-neutral-200/70 bg-white shadow-[0_50px_100px_-35px_rgba(20,40,80,0.45)]">
        {children}
      </div>
    </div>
  );
}
function CheckDot() { return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>; }

function SceneOpen() {
  return (
    <div className="flex h-full flex-col p-6">
      <p className="text-[13px] font-bold text-neutral-800">새 블로그 만들기</p>
      <p className="mt-1 text-[11px] text-neutral-400">분야만 고르면 워드프레스가 자동으로 생겨요</p>
      <div className="mt-4 flex flex-wrap gap-1.5">{["부동산", "재테크", "여행", "육아", "건강"].map((c, i) => <span key={c} className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${i === 0 ? "bg-[#3f91ff] text-white" : "border border-neutral-200 text-neutral-500"}`}>{c}</span>)}</div>
      <button className="mt-5 w-full rounded-xl py-3 text-[13px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(63,145,255,0.6)]" style={{ background: ACCENT }}>내 블로그 만들기</button>
      <div className="mt-auto flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5"><CheckDot /><div><p className="text-[13px] font-bold text-emerald-800">우리집부동산.com</p><p className="text-[11px] text-emerald-600">개설 완료 · 워드프레스 설치까지 끝</p></div></div>
    </div>
  );
}
function SceneData() {
  const kws = [{ k: "전세 사기 예방법", v: "12,000", c: "낮음", hot: true }, { k: "1억으로 갭투자", v: "8,400", c: "낮음" }, { k: "청약 가점 계산기", v: "6,100", c: "보통" }, { k: "전입신고 하는 법", v: "5,200", c: "낮음" }];
  const trend = [34, 40, 37, 52, 60, 71, 88];
  return (
    <div className="flex h-full gap-4 p-6">
      <div className="flex w-1/2 flex-col">
        <p className="text-[12px] font-bold text-neutral-800">🔥 지금 뜨는 키워드</p>
        <div className="mt-2 space-y-1.5">{kws.map((x) => <div key={x.k} className="rounded-lg border border-neutral-100 bg-neutral-50/60 px-2.5 py-1.5"><p className="truncate text-[11.5px] font-medium text-neutral-700">{x.k}{x.hot && " 🔥"}</p><p className="mt-0.5 text-[10px] text-neutral-400">월 {x.v} · 경쟁 {x.c}</p></div>)}</div>
      </div>
      <div className="flex w-1/2 flex-col">
        <p className="text-[12px] font-bold text-neutral-800">📈 검색 트렌드</p>
        <div className="mt-2 flex flex-1 items-end gap-1.5 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">{trend.map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === trend.length - 1 ? ACCENT : "rgba(63,145,255,0.25)" }} />)}</div>
        <div className="mt-2 rounded-lg bg-[#3f91ff]/8 px-3 py-2 text-[11px] font-medium text-[#2f7fe6]">상승세 · 지금이 선점 타이밍</div>
      </div>
    </div>
  );
}
function SceneWrite() {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5"><span className="min-w-0 flex-1 truncate text-[12.5px] text-neutral-700">전세 사기 예방법</span><span className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: ACCENT }}>글 생성</span></div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-1/3 rounded bg-neutral-800/80" />
        <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "100%", animationDelay: "0.1s" }} /><div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "96%", animationDelay: "0.3s" }} /><div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "92%", animationDelay: "0.5s" }} />
        <div className="h-2 w-1/4 rounded bg-neutral-800/80" /><div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "98%", animationDelay: "0.7s" }} /><div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "70%", animationDelay: "0.85s" }} />
      </div>
      <div className="mt-auto flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5"><CheckDot /><p className="text-[13px] font-bold text-emerald-800">칼럼급 글이 발행됐어요</p></div>
    </div>
  );
}
function SceneEarn() {
  const bars = [24, 32, 29, 44, 56, 68, 82, 96];
  return (
    <div className="flex h-full flex-col p-6">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-neutral-50 px-3 py-2.5"><p className="text-[10px] text-neutral-400">방문자</p><p className="text-[15px] font-extrabold text-neutral-900">12,480</p></div>
        <div className="rounded-xl bg-neutral-50 px-3 py-2.5"><p className="text-[10px] text-neutral-400">노출</p><p className="text-[15px] font-extrabold text-neutral-900">38만</p></div>
        <div className="rounded-xl bg-[#3f91ff]/10 px-3 py-2.5"><p className="text-[10px] text-[#2f7fe6]">광고수익</p><p className="text-[15px] font-extrabold text-[#2f7fe6]">₩312K</p></div>
      </div>
      <div className="mt-3 flex flex-1 items-end gap-1.5 rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">{bars.map((h, i) => <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === bars.length - 1 ? ACCENT : "rgba(63,145,255,0.25)" }} />)}</div>
      <p className="mt-2 text-[11px] font-medium text-emerald-600">▲ 검색 유입 꾸준히 상승 중</p>
    </div>
  );
}

// 자동재생 데모 — 재테크 입력 → 하위분류 → 부동산 → 키워드 쫙 → 키워드 클릭 → 글 작성·발행 (루프)
function CategoryDemo() {
  const SUBS = ["전체", "주식", "절약", "연금", "대출", "부동산"];
  const KW = [{ k: "전세 사기 예방법", v: "1.2만", c: "낮음", hot: true }, { k: "1억으로 갭투자", v: "8,400", c: "낮음" }, { k: "청약 가점 계산기", v: "6,100", c: "보통" }, { k: "전입신고 하는 법", v: "5,200", c: "낮음" }, { k: "오피스텔 투자 단점", v: "3,900", c: "낮음" }];
  const [phase, setPhase] = useState(0); // 0타이핑 1드롭다운 2선택 3키워드 4클릭 5글작성
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setPhase(0); setTyped("");
      "재테크".split("").forEach((_, i) => t.push(setTimeout(() => setTyped("재테크".slice(0, i + 1)), 350 + i * 190)));
      t.push(setTimeout(() => setPhase(1), 1250));
      t.push(setTimeout(() => setPhase(2), 2450));
      t.push(setTimeout(() => setPhase(3), 3200));
      t.push(setTimeout(() => setPhase(4), 4700));
      t.push(setTimeout(() => setPhase(5), 5600));
      t.push(setTimeout(run, 10500));
    };
    run();
    return () => t.forEach(clearTimeout);
  }, []);
  const bar = phase < 3 ? typed : phase < 5 ? "재테크 › 부동산" : "전세 사기 예방법";
  return (
    <div className="flex h-full flex-col p-6">
      <p className="text-[13px] font-bold text-neutral-800">{phase < 5 ? "어떤 블로그인가요?" : "AI가 글을 쓰고 있어요"}</p>
      <p className="mt-1 text-[11px] text-neutral-400">{phase < 5 ? "분야만 고르면, 키워드가 쫙 펼쳐져요" : "키워드 하나 누르면 칼럼급 글로"}</p>
      <div className="relative mt-3">
        <div className={`flex items-center gap-2 rounded-xl border bg-white px-3.5 py-3 shadow-sm transition ${phase < 3 ? "border-[#3f91ff] ring-2 ring-[#3f91ff]/15" : "border-neutral-200"}`}>
          {phase >= 5 && <span className="shrink-0 rounded-md bg-[#3f91ff]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#2f7fe6]">생성중</span>}
          <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-800">{bar}</span>
          {phase === 0 && <span className="inline-block h-4 w-0.5 animate-pulse bg-neutral-700" />}
        </div>
        <AnimatePresence>
          {(phase === 1 || phase === 2) && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="absolute inset-x-0 top-full z-10 mt-1.5 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_12px_30px_-10px_rgba(20,40,80,0.3)]">
              {SUBS.map((s, i) => (
                <motion.div key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className={`px-3 py-2 text-[12.5px] ${s === "부동산" && phase === 2 ? "bg-[#3f91ff]/10 font-semibold text-[#2f7fe6]" : "text-neutral-600"}`}>
                  {s === "전체" ? <><b className="text-neutral-800">재테크</b> <span className="text-neutral-400">전체</span></> : <>재테크 <span className="text-neutral-300">›</span> {s}</>}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="relative mt-3 min-h-0 flex-1">
        <AnimatePresence mode="wait">
          {phase >= 3 && phase < 5 && (
            <motion.div key="kw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }} className="flex h-full gap-3">
              <div className="flex w-1/2 flex-col">
                <p className="text-[11px] font-bold text-neutral-700">🔥 부동산 키워드</p>
                <div className="mt-1.5 space-y-1.5">
                  {KW.map((r, i) => (
                    <motion.div key={r.k} initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.07, type: "spring", stiffness: 320, damping: 22 }} className={`rounded-lg border px-2 py-1.5 transition ${i === 0 && phase === 4 ? "border-[#3f91ff] bg-[#3f91ff]/8 ring-2 ring-[#3f91ff]/25" : "border-neutral-100 bg-neutral-50/70"}`}>
                      <p className="flex items-center gap-1 truncate text-[11px] font-medium text-neutral-700">{r.k}{r.hot && " 🔥"}{i === 0 && phase === 4 && <span className="ml-auto shrink-0 rounded bg-[#3f91ff] px-1.5 py-0.5 text-[9px] font-bold text-white">글 생성 ›</span>}</p>
                      <p className="text-[9px] text-neutral-400">월 {r.v}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex w-1/2 flex-col">
                <p className="text-[11px] font-bold text-neutral-700">📈 트렌드</p>
                <div className="mt-1.5 flex flex-1 items-end gap-1 rounded-lg border border-neutral-100 bg-neutral-50/70 p-2">
                  {[34, 42, 38, 55, 66, 82].map((h, i) => <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.25 + i * 0.06 }} className="flex-1 rounded-t" style={{ background: i === 5 ? ACCENT : "rgba(63,145,255,0.25)" }} />)}
                </div>
              </div>
            </motion.div>
          )}
          {phase >= 5 && (
            <motion.div key="wr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex h-full flex-col">
              <div className="rounded-xl border border-neutral-200 bg-white p-3">
                <p className="text-[12px] font-extrabold text-neutral-900">전세 사기, 이렇게 100% 막으세요</p>
                <div className="mt-2 space-y-1.5">
                  <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "100%", animationDelay: ".1s" }} />
                  <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "94%", animationDelay: ".3s" }} />
                  <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "97%", animationDelay: ".5s" }} />
                  <div className="mock-gen-bar h-2 w-1/3 rounded bg-neutral-300" style={{ animationDelay: ".6s" }} />
                  <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "90%", animationDelay: ".7s" }} />
                </div>
              </div>
              <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>
                <p className="text-[12px] font-bold text-emerald-800">블로그에 발행 완료</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const STEPS = [
  { no: "01", tag: "개설", title: <>버튼 한 번에,<br />블로그 개설.</>, before: "호스팅·설치 1주일", after: "클릭 한 번", nav: 0, url: "ateflo.com/new", Screen: SceneOpen },
  { no: "02", tag: "데이터", title: <>뭘 쓸지,<br />데이터가 알려줘요.</>, before: "감으로 고르기", after: "뜨는 키워드가 눈앞에", nav: 0, url: "ateflo.com/lab", Screen: CategoryDemo },
  { no: "03", tag: "글쓰기", title: <>키워드 하나,<br />칼럼급 글.</>, before: "한 편에 5시간", after: "1분", nav: 1, url: "ateflo.com/write", Screen: SceneWrite },
  { no: "04", tag: "수익화", title: <>글이 쌓이고,<br />수익으로.</>, before: "검색에 안 잡힘", after: "검색 유입 ↑", nav: 3, url: "ateflo.com/insight", Screen: SceneEarn },
];

// 1섹션 아래 마퀴 = 분야(니치) — '어떤 분야든 된다'
const MARQUEE = [
  { e: "🏠", t: "부동산" }, { e: "💰", t: "재테크" }, { e: "📈", t: "주식" }, { e: "🐶", t: "강아지" },
  { e: "✈️", t: "여행" }, { e: "🍳", t: "요리" }, { e: "👶", t: "육아" }, { e: "💪", t: "운동" },
  { e: "💄", t: "뷰티" }, { e: "💻", t: "IT·테크" }, { e: "🏕️", t: "캠핑" }, { e: "🪴", t: "인테리어" },
  { e: "🎮", t: "게임" }, { e: "📚", t: "자기계발" },
];

function Chapter({ tint = false, children }: { tint?: boolean; children: React.ReactNode }) {
  return <section className={`flex min-h-[88vh] flex-col items-center justify-center px-6 py-20 ${tint ? "bg-[#f3f7ff]" : "bg-white"}`}><div className="mx-auto w-full max-w-5xl">{children}</div></section>;
}
function BeforeAfter({ before, after }: { before: string; after: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-[13px] shadow-sm sm:text-sm">
      <span className="text-neutral-400 line-through decoration-neutral-300">{before}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      <span className="font-bold text-[#2f7fe6]">{after}</span>
    </span>
  );
}

/* 스크롤 패럴랙스로 떠오르는 목업 */
function ParallaxMock({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  return <motion.div ref={ref} style={{ y }} className="flex justify-center">{children}</motion.div>;
}

/* ════ 비비드 오로라 (계속 움직임) ════ */
function VibrantAurora() {
  // 부드럽게: scale 애니 제거(blur 재래스터로 인한 끊김 방지) + 작은 이동범위 + 느린 주기 + GPU 합성
  const blob = (cls: string, anim: TargetAndTransition, dur: number) => (
    <motion.div animate={anim} transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }} style={{ willChange: "transform" }} className={`absolute rounded-full blur-[90px] ${cls}`} />
  );
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#05060c]">
      {blob("left-[14%] bottom-[8%] h-[32rem] w-[32rem] bg-[#10b981]/50", { x: [0, 70, 0], y: [0, -45, 0] }, 22)}
      {blob("right-[10%] bottom-[16%] h-[30rem] w-[30rem] bg-[#22d3ee]/50", { x: [0, -60, 0], y: [0, 40, 0] }, 26)}
      {blob("left-1/2 top-[26%] h-[28rem] w-[28rem] -translate-x-1/2 bg-[#3b82f6]/45", { x: [0, 55, 0], y: [0, -35, 0] }, 20)}
      {blob("right-[26%] top-[14%] h-[26rem] w-[26rem] bg-[#8b5cf6]/40", { x: [0, -50, 0], y: [0, 45, 0] }, 24)}
      {blob("left-[24%] top-[44%] h-[22rem] w-[22rem] bg-[#2dd4bf]/35", { x: [0, 60, 0], y: [0, -30, 0] }, 19)}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#05060c] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-[#05060c]" />
    </div>
  );
}

/* ════ AI 빌더 데모 (다크 글래스 윈도우) ════ */
function ArrowUp() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>; }
function BuilderDemo() {
  const CATS = ["주식", "부동산", "절약", "연금", "대출"];
  const KW = [{ k: "전세 사기 예방법", v: "1.2만", c: "낮음", hot: true }, { k: "1억으로 갭투자", v: "8,400", c: "낮음" }, { k: "청약 가점 계산기", v: "6,100", c: "보통" }, { k: "전입신고 하는 법", v: "5,200", c: "낮음" }, { k: "오피스텔 투자 단점", v: "3,900", c: "낮음" }];
  const [p, setP] = useState(0); // 0타이핑 1리스트 2선택 3생성완료 4데이터 5클릭 6글발행
  const [typed, setTyped] = useState("");
  const [art, setArt] = useState(""); // 실제 글 타이핑
  const BODY = "전세 계약 전, 등기부등본부터 확인하세요. ‘을구’에 근저당이 과도하게 잡혀 있다면 보증금을 떼일 위험이 큽니다. 시세 대비 전세가율이 80%를 넘는 매물이라면 특히 신중해야 해요.\n\n계약할 땐 등기부상 소유자와 임대인이 같은 사람인지, 신탁 등기가 걸려 있진 않은지 꼭 대조하세요. 잔금 치르는 날엔 전입신고와 확정일자를 같은 날 신청해 대항력과 우선변제권을 함께 확보합니다.\n\n여기에 전세보증보험까지 가입하면, 집주인이 보증금을 돌려주지 못해도 보증기관에서 안전하게 돌려받을 수 있어요.";
  // 글 작성 단계(p=6)에서 실제 본문을 한 글자씩 부드럽게 타이핑
  useEffect(() => {
    if (p !== 6) { setArt(""); return; }
    let i = 0;
    const id = setInterval(() => { i += 1; setArt(BODY.slice(0, i)); if (i >= BODY.length) clearInterval(id); }, 26);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);
  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setP(0); setTyped("");
      const q = "재테크 블로그 만들기";
      q.split("").forEach((_, i) => t.push(setTimeout(() => setTyped(q.slice(0, i + 1)), 450 + i * 65)));
      t.push(setTimeout(() => setP(1), 2150));
      t.push(setTimeout(() => setP(2), 3450));
      t.push(setTimeout(() => setP(3), 4250));
      t.push(setTimeout(() => setP(4), 6100));
      t.push(setTimeout(() => setP(5), 7700));
      t.push(setTimeout(() => setP(6), 8600));
      t.push(setTimeout(run, 18500));
    };
    run();
    return () => t.forEach(clearTimeout);
  }, []);
  const group = p <= 2 ? "in" : p === 3 ? "created" : p <= 5 ? "data" : "write";
  return (
    <div className="relative w-full max-w-2xl">
      <div className="pointer-events-none absolute -inset-12 -z-10 rounded-[3.5rem] bg-[#6a4bff]/35 blur-[90px]" />
      <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0c0e16]/85 shadow-[0_50px_130px_-30px_rgba(0,0,0,0.75)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] font-medium text-white/55">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#5a8bff] to-[#a23bff] text-white"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
            ateflo · 미리보기
          </div>
          <span className="text-[11px] text-white/30">Desktop · 1200</span>
        </div>
        <div className="relative h-[400px] p-6">
          <AnimatePresence mode="wait">
            {group === "in" && (
              <motion.div key="in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <p className="text-[12px] font-medium text-white/40">무엇을 만들까요?</p>
                <div className="relative mt-3">
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-[#5a8bff] to-[#a23bff] opacity-70 blur-[5px]" />
                  <div className="relative flex items-center gap-3 rounded-2xl border border-white/15 bg-[#11131d] px-4 py-3.5">
                    <span className="min-w-0 flex-1 text-[14px] text-white">{typed}{p === 0 && <span className="ml-px inline-block h-4 w-0.5 animate-pulse bg-cyan-300 align-middle" />}</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/12 text-white"><ArrowUp /></span>
                  </div>
                </div>
                {p >= 1 && (
                  <div className="mt-3 space-y-1.5">
                    {CATS.map((c, i) => (
                      <motion.div key={c} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className={`relative flex items-center rounded-xl border px-3.5 py-2.5 text-[13px] transition-colors duration-300 ${c === "부동산" && p === 2 ? "border-[#6a8bff] bg-[#6a8bff]/15 text-white" : "border-white/8 bg-white/[0.03] text-white/70"}`}>
                        <span>재테크 <span className="text-white/30">›</span> {c}</span>
                        {c === "부동산" && <span className={`absolute right-3.5 rounded bg-[#5a8bff] px-1.5 py-0.5 text-[10px] font-bold text-white transition-opacity duration-300 ${p === 2 ? "opacity-100" : "opacity-0"}`}>선택 ›</span>}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {group === "created" && (
              <motion.div key="cr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3 }} className="flex h-full flex-col items-center justify-center text-center">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5a8bff] to-[#a23bff] text-white shadow-[0_0_40px_rgba(106,107,255,0.6)]"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></motion.span>
                <p className="mt-5 text-[18px] font-bold text-white">부동산 블로그가 만들어졌습니다!</p>
                <p className="mt-1.5 text-[12px] text-white/45">우리집부동산.com · 워드프레스 개설 완료</p>
                <div className="mt-5 w-full max-w-sm space-y-1.5 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-left">
                  {["홈 · 소개 · 문의 페이지", "검색 최적화 기본 설정", "애드센스 준비 체크리스트"].map((x) => (
                    <p key={x} className="flex items-center gap-2 text-[11.5px] text-white/55"><span className="text-emerald-400">✓</span>{x}</p>
                  ))}
                </div>
              </motion.div>
            )}
            {group === "data" && (
              <motion.div key="dt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold text-white/80">📊 부동산 키워드 분석</p>
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/45">1,240개 분석 완료</span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {([["황금 키워드", "12개", "text-emerald-300"], ["평균 경쟁도", "낮음", "text-cyan-300"], ["예상 월 유입", "8.4K", "text-[#8ab4ff]"]] as const).map(([l, v, c]) => (
                    <div key={l} className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
                      <p className="text-[9px] text-white/40">{l}</p>
                      <p className={`text-[14px] font-extrabold ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 flex gap-2.5">
                  <div className="flex w-3/5 flex-col gap-1">
                    {KW.map((r, i) => (
                      <motion.div key={r.k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className={`relative flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors duration-300 ${i === 0 && p === 5 ? "border-[#6a8bff] bg-[#6a8bff]/15" : "border-white/8 bg-white/[0.03]"}`}>
                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/85">{r.k}{r.hot && " 🔥"}</span>
                        {/* 자리 고정 — 지표↔'글 생성' 크로스페이드(폭 변동 없이) */}
                        <span className={`flex shrink-0 items-center gap-1.5 transition-opacity duration-300 ${i === 0 && p === 5 ? "opacity-0" : "opacity-100"}`}>
                          <span className="text-[9px] text-white/35">월 {r.v}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${r.c === "낮음" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>{r.c}</span>
                        </span>
                        {i === 0 && <span className={`absolute right-2.5 shrink-0 rounded bg-[#5a8bff] px-1.5 py-0.5 text-[9px] font-bold text-white transition-opacity duration-300 ${p === 5 ? "opacity-100" : "opacity-0"}`}>글 생성 ›</span>}
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex w-2/5 flex-col gap-2">
                    <div className="flex flex-1 items-end gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-2">
                      {[34, 42, 38, 55, 66, 82, 95].map((h, i) => <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.25 + i * 0.06 }} className="flex-1 rounded-t" style={{ background: i >= 5 ? "linear-gradient(to top,#22d3ee,#10b981)" : "rgba(120,150,255,0.28)" }} />)}
                    </div>
                    <div className="rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-medium text-emerald-300">🌱 봄 이사철 D-12 · 선점</div>
                    <div className="rounded-lg bg-cyan-400/10 px-2.5 py-1.5 text-[10px] font-medium text-cyan-300">▲ 검색 상승세 +38%</div>
                  </div>
                </div>
              </motion.div>
            )}
            {group === "write" && (
              <motion.div key="wr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative flex h-full flex-col">
                <p className="text-[12px] font-bold text-white/80">{art.length >= BODY.length ? "✅ ‘전세 사기 예방법’ 발행 완료" : "✍️ ‘전세 사기 예방법’ 글 작성 중…"}</p>
                <div className="mt-2.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[13.5px] font-extrabold text-white">전세 사기, 이렇게 막으세요</p>
                  {/* 상단 고정(초반 또렷) + 하단만 페이드 → '아래로 계속 써졌다' 표현 */}
                  <div className="relative mt-2 h-[150px] overflow-hidden" style={{ maskImage: "linear-gradient(to bottom, #000 58%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 58%, transparent)" }}>
                    <p className="whitespace-pre-line text-[11.5px] leading-[1.7] text-white/65">{art}<span className="ml-px inline-block h-3 w-0.5 animate-pulse bg-cyan-300 align-middle" /></p>
                  </div>
                </div>
                {/* 발행 완료 = 뒤 글을 블러로 죽이고 가운데 카드로 시선 집중 */}
                <AnimatePresence>
                  {art.length >= BODY.length && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="absolute inset-0 z-10 flex items-center justify-center" style={{ backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}>
                      <div className="absolute inset-0 bg-[#0a0c14]/60" />
                      <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 280, damping: 20 }} className="relative flex flex-col items-center rounded-2xl border border-emerald-400/25 bg-[#0c1a16]/80 px-7 py-6 text-center shadow-[0_24px_70px_-12px_rgba(16,185,129,0.5)]">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_0_34px_rgba(16,185,129,0.65)]"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>
                        <p className="mt-3 text-[15px] font-bold text-white">워드프레스에 발행됐어요</p>
                        <p className="mt-1 text-[11px] text-white/45">우리집부동산.com/전세-사기-예방법 · 보러가기 ↗</p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const WILLING = [{ k: "yes", label: "네, 바로 충전할래요" }, { k: "maybe", label: "무료부터 써볼래요" }, { k: "pricey", label: "가격이 부담돼요" }];

// 타사 AI — 끝없이 길어지는 대화(찐 채팅 화면, 애니메이션)
// 윈도우 크롬(맥 신호등 + 타이틀)
function WinBar({ title, dark = false }: { title: string; dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 border-b px-3.5 py-2.5 ${dark ? "border-white/8" : "border-neutral-100"}`}>
      <span className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /></span>
      <span className={`mx-auto pr-10 text-[11px] font-medium ${dark ? "text-white/45" : "text-neutral-400"}`}>{title}</span>
    </div>
  );
}

// 타사 AI — 실제 채팅 앱 스크린샷처럼 (사이드바 + 진짜 대화)
function RivalChat() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#e6e8ef] via-[#eef0f5] to-[#f6f7fa] p-3 sm:p-5">
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_30px_70px_-22px_rgba(30,35,50,0.4)]">
        <WinBar title="AI 어시스턴트" />
        <div className="flex h-[300px]">
          <div className="hidden w-[36%] shrink-0 flex-col border-r border-neutral-100 bg-neutral-50/70 p-2.5 sm:flex">
            <div className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-center text-[10px] font-medium text-neutral-500">＋ 새 대화</div>
            <div className="mt-2 space-y-0.5">
              {["전세사기 예방법 블로그", "갭투자 글 초안", "청약 글 다시 써줘", "블로그 제목 30개", "메타설명 작성"].map((t, i) => (
                <div key={t} className={`truncate rounded-md px-2 py-1.5 text-[10.5px] ${i === 0 ? "bg-neutral-200/70 text-neutral-700" : "text-neutral-400"}`}>{t}</div>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-end gap-2 p-3.5">
            <div className="max-w-[88%] self-end rounded-2xl rounded-br-md bg-neutral-900 px-3 py-2 text-[11px] leading-relaxed text-white">전세사기 예방법으로 블로그 SEO 글 써줘</div>
            <div className="max-w-[94%] self-start rounded-2xl rounded-bl-md bg-neutral-100 px-3 py-2.5 text-[11px] leading-relaxed text-neutral-500">전세사기 예방을 위한 SEO 글로 정리했습니다. 핵심 키워드는 ‘전세사기 예방법·전세보증보험·등기부등본 확인’ 중심으로 잡았어요. 도입부와 본문 구조는 아래와 같이…</div>
            <div className="max-w-[88%] self-end rounded-2xl rounded-br-md bg-neutral-900 px-3 py-2 text-[11px] leading-relaxed text-white">도입부 더 길게, 표도 넣어줘</div>
            <div className="flex w-fit items-center gap-1.5 self-start rounded-2xl rounded-bl-md bg-neutral-100 px-3 py-2.5">{[0, 1, 2].map((j) => <span key={j} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${j * 0.15}s` }} />)}</div>
          </div>
        </div>
        <div className="border-t border-neutral-100 px-3.5 py-2 text-[10px] text-neutral-400">답변 복사 후 워드프레스에 직접 붙여넣기…</div>
      </div>
    </div>
  );
}

// AteFlo — 실제 글쓰기 앱 스크린샷처럼 (글 목록 + 진짜 본문 + SEO 상태바)
function AteFloGen() {
  const POSTS: [string, string][] = [["전세 사기 예방법 5가지", "발행"], ["1억으로 시작하는 갭투자", "발행"], ["청약 가점 계산법 총정리", "발행"], ["전입신고·확정일자 받는 법", "초안"], ["오피스텔 투자 체크리스트", "초안"]];
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#c3d2ff] via-[#dce6ff] to-[#cfe0ff] p-3 sm:p-5">
      <div className="overflow-hidden rounded-xl border border-black/10 bg-[#0b0d15] shadow-[0_30px_70px_-22px_rgba(30,50,110,0.55)]">
        <WinBar title="AteFlo — 글쓰기" dark />
        <div className="flex h-[300px]">
          <div className="hidden w-[38%] shrink-0 flex-col border-r border-white/8 p-2.5 sm:flex">
            <p className="px-1.5 text-[9.5px] font-semibold uppercase tracking-wide text-white/30">내 글</p>
            <div className="mt-1.5 space-y-0.5">
              {POSTS.map(([t, s], i) => (
                <div key={t} className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 ${i === 0 ? "bg-white/8" : ""}`}>
                  <span className={`min-w-0 flex-1 truncate text-[10.5px] ${i === 0 ? "text-white" : "text-white/50"}`}>{t}</span>
                  <span className={`shrink-0 text-[8px] font-semibold ${s === "발행" ? "text-emerald-400" : "text-white/30"}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden p-4">
            <p className="text-[9.5px] text-white/30">재테크 › 부동산 · SEO 점수 92</p>
            <p className="mt-1 text-[15px] font-extrabold leading-snug text-white">전세 사기 예방법 5가지</p>
            <div className="mt-2.5 space-y-2 text-[10.5px] leading-relaxed text-white/55">
              <p>전세 계약 전, 등기부등본의 ‘을구’부터 확인하세요. 근저당이 과도하면 보증금을 떼일 위험이 큽니다.</p>
              <p className="font-bold text-[#8ab4ff]">1. 등기부등본 확인하기</p>
              <p>소유자와 임대인이 같은지, 신탁 등기는 없는지 대조합니다.</p>
              <p className="font-bold text-[#8ab4ff]">2. 전입신고·확정일자</p>
              <p>잔금 당일 신청해 대항력과 우선변제권을 함께 확보해요.<span className="ml-px inline-block h-3 w-0.5 animate-pulse bg-[#6a8bff] align-middle" /></p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/8 px-3.5 py-2 text-[9.5px]">
          <span className="text-white/35">키워드·메타설명·검색의도 <span className="text-emerald-400">✓ 자동 최적화</span></span>
          <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">워드프레스 발행됨</span>
        </div>
      </div>
    </div>
  );
}

// 교차 행 — 설명 + 목업을 한 행에. from 방향에서 슬라이드 인.
function FeatureRow({ from, label, title, body, children }: { from: "left" | "right"; label: string; title: React.ReactNode; body: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: from === "left" ? -48 : 48 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`grid items-center gap-8 sm:grid-cols-2 sm:gap-14 ${from === "right" ? "sm:[&>*:first-child]:order-2" : ""}`}
    >
      <div className="text-center sm:text-left">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">{label}</p>
        <h3 className="font-pretendard mt-3 text-[1.6rem] font-extrabold leading-[1.18] tracking-tight sm:text-[2.1rem]" style={{ wordBreak: "keep-all" }}>{title}</h3>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-neutral-500 sm:mx-0 sm:text-[15px]" style={{ wordBreak: "keep-all" }}>{body}</p>
      </div>
      <div>{children}</div>
    </motion.div>
  );
}

export default function StartLanding() {
  const [willing, setWilling] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false); // 헤더: 맨 위=투명, 스크롤 시 흰 바
  const signupRef = useRef<HTMLDivElement>(null);
  const toSignup = () => signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 히어로 패럴랙스
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: hp } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroMockY = useTransform(hp, [0, 1], [0, 80]);
  const heroTextY = useTransform(hp, [0, 1], [0, -60]);
  const heroFade = useTransform(hp, [0, 0.85], [1, 0]);

  return (
    <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>
      <div className="min-h-screen bg-white text-neutral-900 antialiased">
        <header className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${scrolled ? "border-neutral-200/40 bg-white/70 backdrop-blur" : "border-transparent bg-transparent"}`}>
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
            {/* 맨 위(다크 히어로)에선 흰 로고, 스크롤 시 기본(다크) 로고 */}
            <span className={scrolled ? "" : "[&_span]:text-white"}><Brand /></span>
            <button onClick={toSignup} className="rounded-xl bg-[#3f91ff] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95">사전신청</button>
          </div>
        </header>

        {/* 히어로 — 비비드 무빙 오로라 + AI 빌더 데모(다크 글래스) */}
        <section ref={heroRef} className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 text-center">
          <VibrantAurora />
          <motion.div style={{ y: heroTextY, opacity: heroFade, willChange: "transform, opacity" }} className="relative z-10 mx-auto max-w-3xl">
            <p className="mono-rise inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> 곧 오픈 · 사전신청 받는 중</p>
            <h1 className="font-pretendard mono-rise mono-d1 mt-5 text-[2.4rem] font-extrabold leading-[1.1] tracking-tight text-white sm:text-7xl" style={{ wordBreak: "keep-all" }}>수익형 블로그,<br /><span className="bg-gradient-to-r from-cyan-300 to-[#8ab4ff] bg-clip-text text-transparent">가장 쉽게 시작하세요.</span></h1>
            <p className="mono-rise mono-d2 mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/65 sm:text-lg" style={{ wordBreak: "keep-all" }}>분야만 고르면, 키워드부터 글·발행까지 한 번에.</p>
            <div className="mono-rise mono-d4 mt-6"><button onClick={toSignup} className="rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-[#0c0e16] shadow-[0_14px_40px_-10px_rgba(255,255,255,0.4)] transition hover:-translate-y-0.5 active:scale-95">사전신청하고 보너스 크레딧 받기</button><p className="mt-3 text-xs text-white/40">무료 3편으로 시작 · 월 구독 아님</p></div>
          </motion.div>
          <motion.div style={{ y: heroMockY, willChange: "transform" }} className="relative z-10 mt-9 w-full max-w-2xl"><BuilderDemo /></motion.div>
        </section>

        {/* 마퀴 — 분야(니치): 어떤 분야든 된다 (화이트) */}
        <div className="overflow-hidden border-y border-neutral-100 bg-white py-6">
          <p className="mb-4 text-center text-xs font-semibold tracking-wide text-neutral-400">어떤 분야든, 블로그가 돼요</p>
          <motion.div className="flex w-max gap-2.5 whitespace-nowrap" style={{ willChange: "transform" }} animate={{ x: ["0%", "-50%"] }} transition={{ duration: 32, repeat: Infinity, ease: "linear" }}>
            {[...MARQUEE, ...MARQUEE].map((k, i) => <span key={i} className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600"><span>{k.e}</span>{k.t}</span>)}
          </motion.div>
        </div>

        {/* 2섹션 — 'GPT로 쓰면 되지' 부수기 + 글 차별화(목업 비교) · 화이트 */}
        <section className="relative bg-white py-24 sm:py-28">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center">
              <Reveal><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">그냥 AI로 쓰면 되지 않나요?</p></Reveal>
              <Reveal delay={60}><h2 className="font-pretendard mt-4 text-[1.9rem] font-extrabold leading-[1.18] tracking-tight sm:text-5xl" style={{ wordBreak: "keep-all" }}>쓰는 건 누구나.<br /><span className="text-[#3f91ff]">검색에 걸리게 쓰는 건 다릅니다.</span></h2></Reveal>
              <Reveal delay={110}><p className="mx-auto mt-4 max-w-lg text-[14px] leading-relaxed text-neutral-500" style={{ wordBreak: "keep-all" }}>AI한테 시키면 답은 나와요. 그런데 고치고 또 고치고… 복붙해서 발행하는 건 결국 내 몫이죠.</p></Reveal>
            </div>
            {/* 교차 행 — 설명+목업, 좌→우 번갈아 슬라이드 인 */}
            <div className="mt-16 flex flex-col gap-20 sm:mt-20 sm:gap-28">
              <FeatureRow from="left" label="다른 AI로 쓰면" title={<>답은 나와도,<br />끝이 없습니다</>} body="더 길게, 표도 넣고, 자연스럽게… 고치고 또 고쳐요. 복붙해서 발행하는 것도 결국 내 몫이고요.">
                <RivalChat />
              </FeatureRow>
              <FeatureRow from="right" label="AteFlo는" title={<>키워드 선택 한 번,<br />발행까지</>} body="검색 의도에 맞춘 구조로 글을 완성하고, 워드프레스에 바로 발행해요. 프롬프트도, 복붙도 없습니다.">
                <AteFloGen />
              </FeatureRow>
            </div>
            <Reveal delay={120}><p className="mt-20 text-center text-[15px] font-semibold leading-relaxed text-neutral-700" style={{ wordBreak: "keep-all" }}>AI는 답을 쓰고, <span className="text-[#2f7fe6]">AteFlo는 검색에 걸리도록 설계된 글을 발행</span>합니다.</p></Reveal>
          </div>
        </section>

        {/* 공감 */}
        <Chapter tint>
          <div className="text-center">
            <Reveal><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">왜 다들 멈출까</p></Reveal>
            <Reveal delay={70}><h2 className="font-pretendard mt-4 text-[2rem] font-extrabold leading-[1.18] tracking-tight sm:text-5xl" style={{ wordBreak: "keep-all" }}>막히는 건,<br />의지가 아니라 <span className="text-[#3f91ff]">과정</span>이에요.</h2></Reveal>
            <Reveal delay={130}><div className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-2">{["호스팅 뭐 고르지", "워드프레스 설치부터 벽", "애드센스 자꾸 반려", "뭘 써야 검색에 잡혀?"].map((w) => <span key={w} className="rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-[13px] text-neutral-500">{w}</span>)}</div></Reveal>
          </div>
        </Chapter>

        {/* 브릿지 */}
        <Chapter>
          <div className="text-center">
            <Reveal><h2 className="font-pretendard text-[2.1rem] font-extrabold leading-[1.16] tracking-tight sm:text-6xl" style={{ wordBreak: "keep-all" }}>그래서 AteFlo는,<br />그 과정을 <span className="text-[#3f91ff]">전부 없앴어요.</span></h2></Reveal>
            <Reveal delay={100}><p className="mt-6 text-sm text-neutral-400">개설 → 데이터 → 글 → 수익. 실제 화면으로 보여드릴게요.</p></Reveal>
          </div>
        </Chapter>

        {/* STEP 챕터 */}
        {STEPS.map((s, i) => (
          <Chapter key={s.no} tint={i % 2 === 1}>
            <div className={`grid items-center gap-10 sm:grid-cols-2 sm:gap-14 ${i % 2 === 1 ? "sm:[&>*:first-child]:order-2" : ""}`}>
              <div className="text-center sm:text-left">
                <Reveal><p className="text-xs font-bold tracking-[0.22em] text-[#3f91ff]">STEP {s.no} · {s.tag}</p></Reveal>
                <Reveal delay={60}><h3 className="font-pretendard mt-3 text-[2rem] font-extrabold leading-[1.14] tracking-tight sm:text-5xl" style={{ wordBreak: "keep-all" }}>{s.title}</h3></Reveal>
                <Reveal delay={120}><div className="mt-6"><BeforeAfter before={s.before} after={s.after} /></div></Reveal>
              </div>
              <ParallaxMock><Panel><s.Screen /></Panel></ParallaxMock>
            </div>
          </Chapter>
        ))}

        {/* 세 가지 약속 */}
        <Chapter tint>
          <div className="text-center">
            <Reveal><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">AteFlo가 다른 이유</p></Reveal>
            <Reveal delay={60}><h2 className="font-pretendard mt-5 text-[2rem] font-extrabold tracking-tight sm:text-5xl">쉽게 · 빠르게 · 끝까지</h2></Reveal>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[{ t: "쉽게", d: "개설·설정은 안 보이게. 버튼만 누르면 돼요." }, { t: "빠르게", d: "키워드 하나면 칼럼급 글이 1분 만에." }, { t: "끝까지", d: "애드센스 승인·수익화까지 같이 가요." }].map((p, i) => (
                <Reveal key={p.t} delay={80 + i * 60}><div className="h-full rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-sm"><p className="text-lg font-extrabold tracking-tight text-[#2f7fe6]">{p.t}</p><p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{p.d}</p></div></Reveal>
              ))}
            </div>
          </div>
        </Chapter>

        {/* 가격 */}
        <Chapter>
          <div className="text-center">
            <Reveal><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">부담 없이</p></Reveal>
            <Reveal delay={60}><h2 className="font-pretendard mt-5 text-[2.1rem] font-extrabold tracking-tight sm:text-6xl">딱 쓴 만큼만.</h2></Reveal>
            <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
              <Reveal delay={80}><div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6"><p className="text-3xl font-extrabold tracking-tight text-neutral-900"><CountUp to={3} />편</p><p className="mt-1 text-sm text-neutral-500">무료로 먼저</p></div></Reveal>
              <Reveal delay={140}><div className="rounded-3xl border-2 border-[#3f91ff]/30 bg-[#3f91ff]/5 p-6"><p className="text-3xl font-extrabold tracking-tight text-[#2f7fe6]">₩<CountUp to={11000} /></p><p className="mt-1 text-sm text-neutral-600">충전 · 글 쓸 때 차감</p></div></Reveal>
              <Reveal delay={200}><div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6"><p className="text-3xl font-extrabold tracking-tight text-neutral-900">0원</p><p className="mt-1 text-sm text-neutral-500">안 쓰면 안 나가요</p></div></Reveal>
            </div>
            <Reveal delay={240}><p className="mt-6 text-xs leading-relaxed text-neutral-400">호스팅·도메인 비용은 별도이고 우리 매출이 아니에요. 글 관련 크레딧만 받아요.</p></Reveal>
          </div>
        </Chapter>

        {/* 신청 */}
        <section ref={signupRef} className="scroll-mt-20 bg-gradient-to-b from-white to-[#eaf2ff]">
          <div className="mx-auto flex min-h-[90vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
            <Reveal><h2 className="font-pretendard text-[2.1rem] font-extrabold leading-tight tracking-tight sm:text-5xl" style={{ wordBreak: "keep-all" }}>가장 먼저 시작하고,<br />보너스 크레딧 받으세요.</h2></Reveal>
            <Reveal delay={80}><p className="mt-4 text-sm text-neutral-500">사전신청자에겐 오픈 시 추가 크레딧을 드려요.</p></Reveal>
            <Reveal delay={140}>
              <div className="mt-8 w-full rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-7">
                <p className="text-sm font-semibold text-neutral-700">11,000원 크레딧, 충전해서 쓸 의향이 있나요?</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">{WILLING.map((w) => { const on = willing === w.k; return <button key={w.k} onClick={() => setWilling(on ? null : w.k)} className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition active:scale-95 ${on ? "border-[#3f91ff] bg-[#3f91ff] text-white shadow-[0_0_18px_rgba(63,145,255,0.4)]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}>{w.label}</button>; })}</div>
                <div className="mt-5 border-t border-neutral-100 pt-5"><WaitlistForm source="start-lp" extra={{ v: "start-lp", willing: willing ?? "unspecified" }} /></div>
              </div>
            </Reveal>
          </div>
        </section>

        <SiteFooter />
      </div>
    </ReactLenis>
  );
}
