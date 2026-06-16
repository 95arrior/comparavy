"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ReactLenis } from "lenis/react";
import Brand from "@/components/Brand";
import SiteFooter from "@/components/SiteFooter";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";

const ACCENT = "#3f91ff";

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

// 자동재생 카테고리 검색 데모 — 재테크 입력 → 하위분류 쭈루룩 → 부동산 선택 → 부동산 데이터 뽜바박 (루프)
function CategoryDemo() {
  const SUBS = ["전체", "주식", "절약", "연금", "대출", "부동산"];
  const RESULTS = [{ k: "전세 사기 예방법", v: "1.2만", hot: true }, { k: "1억으로 갭투자", v: "8,400" }, { k: "청약 가점 계산기", v: "6,100" }, { k: "전입신고 하는 법", v: "5,200" }];
  const [phase, setPhase] = useState(0); // 0 타이핑 · 1 드롭다운 · 2 부동산선택 · 3 결과
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setPhase(0); setTyped("");
      "재테크".split("").forEach((_, i) => timers.push(setTimeout(() => setTyped("재테크".slice(0, i + 1)), 350 + i * 190)));
      timers.push(setTimeout(() => setPhase(1), 1250));
      timers.push(setTimeout(() => setPhase(2), 2500));
      timers.push(setTimeout(() => setPhase(3), 3250));
      timers.push(setTimeout(run, 7000));
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="flex h-full flex-col p-6">
      <p className="text-[13px] font-bold text-neutral-800">어떤 블로그인가요?</p>
      <p className="mt-1 text-[11px] text-neutral-400">한 칸에서 분야를 고르면, 데이터가 쫙 펼쳐져요</p>
      <div className="relative mt-3">
        <div className={`flex items-center rounded-xl border bg-white px-3.5 py-3 shadow-sm transition ${phase < 3 ? "border-[#3f91ff] ring-2 ring-[#3f91ff]/15" : "border-neutral-200"}`}>
          <span className="text-[13px] text-neutral-800">{phase < 3 ? typed : "재테크 › 부동산"}</span>
          {phase === 0 && <span className="ml-px inline-block h-4 w-0.5 animate-pulse bg-neutral-700" />}
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
      <div className="mt-3 min-h-0 flex-1">
        <AnimatePresence>
          {phase === 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full gap-3">
              <div className="flex w-1/2 flex-col">
                <p className="text-[11px] font-bold text-neutral-700">🔥 부동산 키워드</p>
                <div className="mt-1.5 space-y-1">
                  {RESULTS.map((r, i) => (
                    <motion.div key={r.k} initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.08, type: "spring", stiffness: 320, damping: 22 }} className="rounded-lg border border-neutral-100 bg-neutral-50/70 px-2 py-1">
                      <p className="truncate text-[11px] font-medium text-neutral-700">{r.k}{r.hot && " 🔥"}</p>
                      <p className="text-[9px] text-neutral-400">월 {r.v}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex w-1/2 flex-col">
                <p className="text-[11px] font-bold text-neutral-700">📈 트렌드</p>
                <div className="mt-1.5 flex flex-1 items-end gap-1 rounded-lg border border-neutral-100 bg-neutral-50/70 p-2">
                  {[34, 42, 38, 55, 66, 82].map((h, i) => <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.3 + i * 0.07 }} className="flex-1 rounded-t" style={{ background: i === 5 ? ACCENT : "rgba(63,145,255,0.25)" }} />)}
                </div>
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

const MARQUEE = ["전세 사기 예방법", "1억으로 갭투자", "강아지 분리불안 해결", "제주 3박4일 코스", "연말정산 환급 받기", "초보 주식 시작법", "다이어트 식단표", "노션 템플릿 추천"];

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

const WILLING = [{ k: "yes", label: "네, 바로 충전할래요" }, { k: "maybe", label: "무료부터 써볼래요" }, { k: "pricey", label: "가격이 부담돼요" }];

export default function StartLanding() {
  const [willing, setWilling] = useState<string | null>(null);
  const signupRef = useRef<HTMLDivElement>(null);
  const toSignup = () => signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  // 히어로 패럴랙스
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: hp } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroMockY = useTransform(hp, [0, 1], [0, 140]);
  const heroTextY = useTransform(hp, [0, 1], [0, -80]);
  const heroFade = useTransform(hp, [0, 0.8], [1, 0]);

  return (
    <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>
      <Preloader />
      <div className="min-h-screen bg-white text-neutral-900 antialiased">
        <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200/40 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
            <Brand />
            <button onClick={toSignup} className="rounded-xl bg-[#3f91ff] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95">사전신청</button>
          </div>
        </header>

        {/* 히어로 */}
        <section ref={heroRef} className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24">
          <MovingAurora />
          <LoadRipple />
          <motion.div style={{ y: heroTextY, opacity: heroFade }} className="relative z-10 mx-auto max-w-3xl text-center">
            <p className="mono-rise inline-flex items-center gap-1.5 rounded-full border border-[#3f91ff]/20 bg-white/70 px-3 py-1 text-xs font-semibold text-[#2f7fe6] backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-[#3f91ff]" /> 곧 오픈 · 사전신청 받는 중</p>
            <h1 className="font-pretendard mono-rise mono-d1 mt-6 text-[2.4rem] font-extrabold leading-[1.12] tracking-tight sm:text-7xl" style={{ wordBreak: "keep-all" }}>분야만 고르면,<br /><span className="text-[#3f91ff]">돈 버는 블로그가 시작돼요.</span></h1>
            <p className="mono-rise mono-d2 mx-auto mt-7 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-lg" style={{ wordBreak: "keep-all" }}>개설부터 글쓰기, 애드센스 승인, 수익화까지 — 한 흐름으로.</p>
            <div className="mono-rise mono-d4 mt-9"><button onClick={toSignup} className="rounded-2xl bg-[#3f91ff] px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_34px_-10px_rgba(63,145,255,0.7)] transition hover:-translate-y-0.5 hover:opacity-90 active:scale-95">사전신청하고 보너스 크레딧 받기</button><p className="mt-3 text-xs text-neutral-400">무료 3편으로 시작 · 월 구독 아님</p></div>
          </motion.div>
          {/* 창 없이 열린 무대 — UI가 배경 위에 그대로 떠 있게 */}
          <motion.div style={{ y: heroMockY }} className="relative z-10 mt-14 h-[460px] w-full max-w-2xl"><CategoryDemo /></motion.div>
        </section>

        {/* 키워드 마퀴 */}
        <div className="overflow-hidden border-y border-neutral-100 bg-white py-5">
          <motion.div className="flex w-max gap-3 whitespace-nowrap" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }}>
            {[...MARQUEE, ...MARQUEE].map((k, i) => <span key={i} className="rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-500">{k}</span>)}
          </motion.div>
        </div>

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
