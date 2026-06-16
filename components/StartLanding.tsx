"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import Brand from "@/components/Brand";
import SiteFooter from "@/components/SiteFooter";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";

const ACCENT = "#3f91ff";

/* ════════════ 1) 히어로 배경: 빛이 퍼지며 물결치는 이펙트 ════════════ */
function AuroraWave() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 900">
        <defs>
          <radialGradient id="aw-blue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6fb0ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6fb0ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="aw-cyan" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9ad0ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#9ad0ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="aw-violet" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#b9c4ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#b9c4ff" stopOpacity="0" />
          </radialGradient>
          {/* 물결: 흐르는 난류로 빛 덩어리를 일렁이게 */}
          <filter id="aw-liquid" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="7" result="n">
              <animate attributeName="baseFrequency" dur="22s" values="0.006 0.009; 0.013 0.006; 0.006 0.009" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="120" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <rect width="1200" height="900" fill="#f7faff" />
        <g filter="url(#aw-liquid)">
          <g>
            <ellipse cx="430" cy="360" rx="320" ry="300" fill="url(#aw-blue)">
              <animate attributeName="cx" dur="16s" values="430;560;430" repeatCount="indefinite" />
              <animate attributeName="cy" dur="19s" values="360;300;360" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="800" cy="420" rx="300" ry="280" fill="url(#aw-cyan)">
              <animate attributeName="cx" dur="21s" values="800;680;800" repeatCount="indefinite" />
              <animate attributeName="cy" dur="17s" values="420;500;420" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="620" cy="240" rx="260" ry="240" fill="url(#aw-violet)">
              <animate attributeName="cy" dur="14s" values="240;360;240" repeatCount="indefinite" />
            </ellipse>
          </g>
        </g>
      </svg>
      {/* 위쪽으로 갈수록 흰색으로 페이드 (콘텐츠 가독성) */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white" />
    </div>
  );
}

// 로드 시 1회: 중앙에서 빛이 퍼지는 리플
function LoadRipple() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, opacity: 0.45 }}
          animate={{ scale: 7, opacity: 0 }}
          transition={{ duration: 2.6, delay: i * 0.4, ease: "easeOut" }}
          className="absolute h-40 w-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(63,145,255,0.35), transparent 70%)" }}
        />
      ))}
    </div>
  );
}

/* ════════════ 2) 선화 캐릭터 (몸=선, 머리=색칠, 얼굴 다양) ════════════ */
type Expr = "smile" | "think" | "wow" | "cheer" | "wink" | "calm";
function Face({ expr }: { expr: Expr }) {
  const s = { stroke: "#fff", strokeWidth: 3, strokeLinecap: "round" as const, fill: "none" };
  switch (expr) {
    case "think":
      return <g {...s}><circle cx="50" cy="40" r="1.6" fill="#fff" stroke="none" /><circle cx="70" cy="40" r="1.6" fill="#fff" stroke="none" /><path d="M50 54 H66" /></g>;
    case "wow":
      return <g {...s}><circle cx="50" cy="39" r="3" fill="#fff" stroke="none" /><circle cx="70" cy="39" r="3" fill="#fff" stroke="none" /><circle cx="60" cy="54" r="5" /></g>;
    case "cheer":
      return <g {...s}><path d="M45 40 q5 -7 10 0" /><path d="M65 40 q5 -7 10 0" /><path d="M48 52 q12 12 24 0" /></g>;
    case "wink":
      return <g {...s}><path d="M46 40 q4 -5 8 0" /><circle cx="70" cy="40" r="2" fill="#fff" stroke="none" /><path d="M50 53 q10 7 20 0" /></g>;
    case "calm":
      return <g {...s}><path d="M46 41 H54" /><path d="M66 41 H74" /><path d="M52 53 q8 4 16 0" /></g>;
    default: // smile
      return <g {...s}><circle cx="50" cy="40" r="2.2" fill="#fff" stroke="none" /><circle cx="70" cy="40" r="2.2" fill="#fff" stroke="none" /><path d="M50 52 q10 9 20 0" /></g>;
  }
}
function Doodle({ expr = "smile", color = ACCENT, pose = "stand", className = "" }: { expr?: Expr; color?: string; pose?: "stand" | "point" | "cheer" | "sit"; className?: string }) {
  const arms =
    pose === "cheer" ? <><path d="M60 96 L38 70" /><path d="M60 96 L82 70" /></>
    : pose === "point" ? <><path d="M60 98 L40 112" /><path d="M60 98 L86 86" /></>
    : pose === "sit" ? <><path d="M60 98 L42 108" /><path d="M60 98 L78 108" /></>
    : <><path d="M60 98 L42 120" /><path d="M60 98 L78 120" /></>;
  const legs =
    pose === "sit" ? <><path d="M60 128 L44 132 L44 150" /><path d="M60 128 L76 132 L76 150" /></>
    : <><path d="M60 128 L48 158" /><path d="M60 128 L72 158" /></>;
  return (
    <svg viewBox="0 0 120 170" className={className} fill="none" aria-hidden="true">
      <g stroke="#2a2f3a" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 66 V128" />
        {arms}
        {legs}
      </g>
      <circle cx="60" cy="42" r="28" fill={color} />
      <Face expr={expr} />
    </svg>
  );
}

/* ════════════ 3) 고품질 목업 (브라우저 윈도우 + 앱 UI) ════════════ */
function NavIcon({ d, on }: { d: string; on?: boolean }) {
  return (
    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${on ? "bg-[#3f91ff]/12 text-[#2f7fe6]" : "text-neutral-300"}`}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  );
}
const NAV = [
  "M9 3h6M10 3v5l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8V3", // 연구소(플라스크)
  "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5", // 글
  "M3 12h18M3 6h18M3 18h18", // 발행
  "M4 17l5-5 3 3 7-8", // 수익
];
function BrowserMock({ activeNav = 0, url = "ateflo.com", children }: { activeNav?: number; url?: string; children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-xl">
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[#3f91ff]/15 blur-[70px]" />
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_40px_90px_-30px_rgba(20,40,80,0.45)]">
        {/* 윈도우 바 */}
        <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/80 px-4 py-3">
          <span className="flex gap-1.5"><span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" /></span>
          <div className="ml-2 flex flex-1 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] text-neutral-400 ring-1 ring-neutral-100">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 11V7a5 5 0 0 1 10 0v4" /><rect x="4" y="11" width="16" height="9" rx="2" /></svg>
            {url}
          </div>
        </div>
        {/* 앱 본문: 좌측 네비 + 콘텐츠 */}
        <div className="flex h-[330px]">
          <div className="flex w-12 flex-col items-center gap-2 border-r border-neutral-100 bg-neutral-50/50 py-3">
            {NAV.map((d, i) => <NavIcon key={i} d={d} on={i === activeNav} />)}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SceneOpen() {
  return (
    <div className="flex h-full flex-col p-6">
      <p className="text-[13px] font-bold text-neutral-800">새 블로그 만들기</p>
      <p className="mt-1 text-[11px] text-neutral-400">분야만 고르면 워드프레스가 자동으로 생겨요</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["부동산", "재테크", "여행", "육아", "건강"].map((c, i) => (
          <span key={c} className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${i === 0 ? "bg-[#3f91ff] text-white" : "border border-neutral-200 text-neutral-500"}`}>{c}</span>
        ))}
      </div>
      <button className="mt-5 w-full rounded-xl py-3 text-[13px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(63,145,255,0.6)]" style={{ background: ACCENT }}>내 블로그 만들기</button>
      <div className="mt-auto flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>
        <div><p className="text-[13px] font-bold text-emerald-800">우리집부동산.com</p><p className="text-[11px] text-emerald-600">개설 완료 · 워드프레스 설치까지 끝</p></div>
      </div>
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
        <div className="mt-2 space-y-1.5">
          {kws.map((x) => (
            <div key={x.k} className="rounded-lg border border-neutral-100 bg-neutral-50/60 px-2.5 py-1.5">
              <p className="truncate text-[11.5px] font-medium text-neutral-700">{x.k}{x.hot && " 🔥"}</p>
              <p className="mt-0.5 text-[10px] text-neutral-400">월 {x.v} · 경쟁 {x.c}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-1/2 flex-col">
        <p className="text-[12px] font-bold text-neutral-800">📈 검색 트렌드</p>
        <div className="mt-2 flex flex-1 items-end gap-1.5 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
          {trend.map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === trend.length - 1 ? ACCENT : "rgba(63,145,255,0.25)" }} />)}
        </div>
        <div className="mt-2 rounded-lg bg-[#3f91ff]/8 px-3 py-2 text-[11px] font-medium text-[#2f7fe6]">상승세 · 지금이 선점 타이밍</div>
      </div>
    </div>
  );
}
function SceneWrite() {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-neutral-700">전세 사기 예방법</span>
        <span className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: ACCENT }}>글 생성</span>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-1/3 rounded bg-neutral-800/80" />
        <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "100%", animationDelay: "0.1s" }} />
        <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "96%", animationDelay: "0.3s" }} />
        <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "92%", animationDelay: "0.5s" }} />
        <div className="mock-gen-bar h-2 w-1/4 rounded bg-neutral-800/80" style={{ animationDelay: "0.6s" }} />
        <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "98%", animationDelay: "0.7s" }} />
        <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "70%", animationDelay: "0.85s" }} />
      </div>
      <div className="mt-auto flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>
        <p className="text-[13px] font-bold text-emerald-800">칼럼급 글이 발행됐어요</p>
      </div>
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
      <div className="mt-3 flex flex-1 items-end gap-1.5 rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">
        {bars.map((h, i) => <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === bars.length - 1 ? ACCENT : "rgba(63,145,255,0.25)" }} />)}
      </div>
      <p className="mt-2 text-[11px] font-medium text-emerald-600">▲ 검색 유입 꾸준히 상승 중</p>
    </div>
  );
}

const STEPS = [
  { no: "01", tag: "개설", expr: "smile" as Expr, title: <>버튼 한 번에,<br />블로그 개설.</>, before: "호스팅·설치 1주일", after: "클릭 한 번", nav: 0, url: "ateflo.com/new", Screen: SceneOpen },
  { no: "02", tag: "데이터", expr: "think" as Expr, title: <>뭘 쓸지,<br />데이터가 알려줘요.</>, before: "감으로 고르기", after: "뜨는 키워드가 눈앞에", nav: 0, url: "ateflo.com/lab", Screen: SceneData },
  { no: "03", tag: "글쓰기", expr: "wink" as Expr, title: <>키워드 하나,<br />칼럼급 글.</>, before: "한 편에 5시간", after: "1분", nav: 1, url: "ateflo.com/write", Screen: SceneWrite },
  { no: "04", tag: "수익화", expr: "cheer" as Expr, title: <>글이 쌓이고,<br />수익으로.</>, before: "검색에 안 잡힘", after: "검색 유입 ↑", nav: 3, url: "ateflo.com/insight", Screen: SceneEarn },
];

function Chapter({ tint = false, children }: { tint?: boolean; children: React.ReactNode }) {
  return (
    <section className={`flex min-h-[88vh] flex-col items-center justify-center px-6 py-20 ${tint ? "bg-[#f3f7ff]" : "bg-white"}`}>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
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

const WILLING = [
  { k: "yes", label: "네, 바로 충전할래요" },
  { k: "maybe", label: "무료부터 써볼래요" },
  { k: "pricey", label: "가격이 부담돼요" },
];

export default function StartLanding() {
  const [willing, setWilling] = useState<string | null>(null);
  const signupRef = useRef<HTMLDivElement>(null);
  const toSignup = () => signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200/40 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Brand />
          <button onClick={toSignup} className="rounded-xl bg-[#3f91ff] px-4 py-2 text-sm font-semibold text-white transition active:scale-95 hover:opacity-90">사전신청</button>
        </div>
      </header>

      {/* 0. 히어로 — 빛 퍼짐 + 물결 */}
      <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 pt-16">
        <AuroraWave />
        <LoadRipple />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <Doodle expr="cheer" pose="cheer" className="mx-auto mb-6 h-24 w-20 drop-shadow-sm" />
          <p className="mono-rise inline-flex items-center gap-1.5 rounded-full border border-[#3f91ff]/20 bg-white/70 px-3 py-1 text-xs font-semibold text-[#2f7fe6] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3f91ff]" /> 곧 오픈 · 사전신청 받는 중
          </p>
          <h1 className="font-pretendard mono-rise mono-d1 mt-6 text-[2.4rem] font-extrabold leading-[1.12] tracking-tight sm:text-7xl" style={{ wordBreak: "keep-all" }}>
            워드프레스 수익화,<br /><span className="text-[#3f91ff]">이제 막히지 않아요.</span>
          </h1>
          <p className="mono-rise mono-d2 mx-auto mt-7 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-lg" style={{ wordBreak: "keep-all" }}>
            개설부터 글쓰기, 애드센스 승인, 수익화까지 — 한 흐름으로.
          </p>
          <div className="mono-rise mono-d4 mt-10">
            <button onClick={toSignup} className="rounded-2xl bg-[#3f91ff] px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_34px_-10px_rgba(63,145,255,0.7)] transition active:scale-95 hover:opacity-90">사전신청하고 보너스 크레딧 받기</button>
            <p className="mt-3 text-xs text-neutral-400">무료 3편으로 시작 · 월 구독 아님</p>
          </div>
        </div>
        <motion.span animate={{ y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-neutral-300">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
        </motion.span>
      </section>

      {/* 1. 공감 */}
      <Chapter tint>
        <div className="text-center">
          <Reveal><Doodle expr="think" pose="point" color="#9aa4b2" className="mx-auto h-24 w-20" /></Reveal>
          <Reveal delay={50}><p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">왜 다들 멈출까</p></Reveal>
          <Reveal delay={90}>
            <h2 className="font-pretendard mt-4 text-[2rem] font-extrabold leading-[1.18] tracking-tight sm:text-5xl" style={{ wordBreak: "keep-all" }}>
              막히는 건,<br />의지가 아니라 <span className="text-[#3f91ff]">과정</span>이에요.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <div className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-2">
              {["호스팅 뭐 고르지", "워드프레스 설치부터 벽", "애드센스 자꾸 반려", "뭘 써야 검색에 잡혀?"].map((w) => (
                <span key={w} className="rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-[13px] text-neutral-500">{w}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </Chapter>

      {/* 2. 브릿지 */}
      <Chapter>
        <div className="text-center">
          <Reveal><h2 className="font-pretendard text-[2.1rem] font-extrabold leading-[1.16] tracking-tight sm:text-6xl" style={{ wordBreak: "keep-all" }}>그래서 AteFlo는,<br />그 과정을 <span className="text-[#3f91ff]">전부 없앴어요.</span></h2></Reveal>
          <Reveal delay={100}><p className="mt-6 text-sm text-neutral-400">개설 → 데이터 → 글 → 수익. 실제 화면으로 보여드릴게요.</p></Reveal>
        </div>
      </Chapter>

      {/* 3. STEP 챕터 (세로, 캐릭터 + 큰 타입 + 고품질 목업) */}
      {STEPS.map((s, i) => (
        <Chapter key={s.no} tint={i % 2 === 1}>
          <div className={`grid items-center gap-10 sm:grid-cols-2 sm:gap-14 ${i % 2 === 1 ? "sm:[&>*:first-child]:order-2" : ""}`}>
            <div className="text-center sm:text-left">
              <Reveal><div className="flex justify-center sm:justify-start"><Doodle expr={s.expr} pose={i % 2 === 1 ? "point" : "stand"} className="h-20 w-16" /></div></Reveal>
              <Reveal delay={60}><p className="mt-3 text-xs font-bold tracking-[0.22em] text-[#3f91ff]">STEP {s.no} · {s.tag}</p></Reveal>
              <Reveal delay={110}><h3 className="font-pretendard mt-3 text-[2rem] font-extrabold leading-[1.14] tracking-tight sm:text-5xl" style={{ wordBreak: "keep-all" }}>{s.title}</h3></Reveal>
              <Reveal delay={160}><div className="mt-6"><BeforeAfter before={s.before} after={s.after} /></div></Reveal>
            </div>
            <Reveal delay={120}><div className="flex justify-center"><BrowserMock activeNav={s.nav} url={s.url}><s.Screen /></BrowserMock></div></Reveal>
          </div>
        </Chapter>
      ))}

      {/* 4. 세 가지 약속 */}
      <Chapter tint>
        <div className="text-center">
          <Reveal><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">AteFlo가 다른 이유</p></Reveal>
          <Reveal delay={60}><h2 className="font-pretendard mt-5 text-[2rem] font-extrabold tracking-tight sm:text-5xl">쉽게 · 빠르게 · 끝까지</h2></Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { t: "쉽게", d: "개설·설정은 안 보이게. 버튼만 누르면 돼요.", e: "calm" as Expr },
              { t: "빠르게", d: "키워드 하나면 칼럼급 글이 1분 만에.", e: "wink" as Expr },
              { t: "끝까지", d: "애드센스 승인·수익화까지 같이 가요.", e: "cheer" as Expr },
            ].map((p, i) => (
              <Reveal key={p.t} delay={80 + i * 60}>
                <div className="h-full rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-sm">
                  <Doodle expr={p.e} pose="stand" className="h-16 w-14" />
                  <p className="mt-2 text-lg font-extrabold tracking-tight text-[#2f7fe6]">{p.t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{p.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Chapter>

      {/* 5. 가격 */}
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

      {/* 6. 신청 */}
      <section ref={signupRef} className="scroll-mt-20 bg-gradient-to-b from-white to-[#eaf2ff]">
        <div className="mx-auto flex min-h-[90vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
          <Reveal><Doodle expr="cheer" pose="cheer" className="h-24 w-20" /></Reveal>
          <Reveal delay={60}><h2 className="font-pretendard mt-4 text-[2.1rem] font-extrabold leading-tight tracking-tight sm:text-5xl" style={{ wordBreak: "keep-all" }}>가장 먼저 시작하고,<br />보너스 크레딧 받으세요.</h2></Reveal>
          <Reveal delay={120}><p className="mt-4 text-sm text-neutral-500">사전신청자에겐 오픈 시 추가 크레딧을 드려요.</p></Reveal>
          <Reveal delay={160}>
            <div className="mt-8 w-full rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-7">
              <p className="text-sm font-semibold text-neutral-700">11,000원 크레딧, 충전해서 쓸 의향이 있나요?</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {WILLING.map((w) => {
                  const on = willing === w.k;
                  return <button key={w.k} onClick={() => setWilling(on ? null : w.k)} className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition active:scale-95 ${on ? "border-[#3f91ff] bg-[#3f91ff] text-white shadow-[0_0_18px_rgba(63,145,255,0.4)]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}>{w.label}</button>;
                })}
              </div>
              <div className="mt-5 border-t border-neutral-100 pt-5">
                <WaitlistForm source="start-lp" extra={{ v: "start-lp", willing: willing ?? "unspecified" }} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
