"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";
import GlassIcon from "@/components/GlassIcon";
import SiteFooter from "@/components/SiteFooter";
import { CREDIT_PACKS } from "@/lib/creditPacks";

// ★네이버 수익화 랜딩 v2 — '섹션 나열'이 아니라 '제품이 화면 안에서 산다'.
//  히어로: 아이폰 목업 안에서 실제 앱이 구동(링이 차오르고 글감이 갱신됨).
//  스크롤 스토리: 폰 고정 + 스크롤로 장면 전환(글감 → 집필 → 발행) — 토스 문법.
//  데모: 자동 시연 + 이미지 생성 연출. 메이트: 수치 카운트업.
//  정직 원칙: 가짜 카운터·수익 보장 금지. 시한·선점·공식 수치는 사실만.

const BLUE = "#1D75F7";

/* ═══════════ 데모 데이터 ═══════════ */
const DEMO_TOPICS = [
  {
    key: "youth",
    badge: "경쟁 낮음",
    vol: "월 12,400회",
    title: "청년도약계좌, 지금 갈아타도 될까? 조건별 정리",
    excerpt: [
      "<h2>결론부터, 이런 분은 갈아타는 게 유리해요</h2>",
      "<p>월 70만원까지 넣을 여력이 있고, 앞으로 5년 유지가 가능하다면 갈아타는 쪽이 이자가 더 커요. 반대로 2년 안에 목돈 쓸 일이 있다면 지금 계좌를 유지하는 게 낫습니다.</p>",
      "<p>서민금융진흥원 기준으로 정부기여금은 소득 구간별로 달라지는데, <b style=\"background-color:#fff3a8\">총급여 4,800만원 이하라면 월 최대 3만 3천원</b>까지 받을 수 있어요.</p>",
      "<h2>갈아타기 전 확인할 3가지</h2>",
      "<p>첫째, 중도해지 이율이에요. 저는 처음에 이걸 놓쳐서 셈을 다시 했는데…</p>",
    ].join(""),
  },
  {
    key: "pet",
    badge: "경쟁 낮음",
    vol: "월 8,900회",
    title: "강아지 슬개골 탈구 초기 증상, 병원 가기 전 체크리스트",
    excerpt: [
      "<h2>이 증상이면 초기일 가능성이 높아요</h2>",
      "<p>걷다가 한쪽 뒷다리를 살짝 들고 뛰는 '스킵 보행'이 가장 흔한 신호예요. <b style=\"background-color:#fff3a8\">1~2기엔 통증이 거의 없다는 게 함정</b>입니다.</p>",
      "<h2>병원 가기 전, 집에서 확인할 것</h2>",
      "<p>미끄러운 바닥부터 점검하세요. 저희 집은 매트를 깔고 나서…</p>",
    ].join(""),
  },
  {
    key: "trip",
    badge: "경쟁 낮음",
    vol: "월 15,200회",
    title: "후쿠오카 3박4일 경비 총정리, 실제로 쓴 금액 기준",
    excerpt: [
      "<h2>결론: 2인 기준 실비 118만원이면 여유 있게</h2>",
      "<p>항공+숙소+식비+교통을 다 합친 금액이에요. <b style=\"background-color:#fff3a8\">항공권만 30만원 이상 벌어질 수 있으니</b> 시기부터 정하는 게 순서입니다.</p>",
      "<h2>항목별로 쪼개면 이렇게</h2>",
      "<p>숙소는 하카타역 근처 기준 1박 9~13만원 선인데…</p>",
    ].join(""),
  },
];

/* ═══════════ 유틸 훅 ═══════════ */
function useTypewriter(html: string, active: boolean) {
  const [n, setN] = useState(0);
  const total = html.replace(/<[^>]+>/g, "").length;
  useEffect(() => {
    setN(0);
    if (!active) return;
    const id = setInterval(() => {
      setN((cur) => (cur >= total ? (clearInterval(id), cur) : cur + Math.max(1, Math.ceil((total - cur) / 260))));
    }, 24);
    return () => clearInterval(id);
  }, [html, active, total]);
  let out = "", count = 0, i = 0;
  const stack: string[] = [];
  while (i < html.length && count < n) {
    if (html[i] === "<") {
      const end = html.indexOf(">", i);
      if (end === -1) break;
      const tag = html.slice(i, end + 1);
      const m = /^<\/?([a-z0-9]+)/i.exec(tag);
      if (m) {
        if (tag[1] === "/") { const at = stack.lastIndexOf(m[1]); if (at !== -1) stack.splice(at, 1); }
        else if (!tag.endsWith("/>")) stack.push(m[1]);
      }
      out += tag; i = end + 1;
    } else { out += html[i]; i++; count++; }
  }
  for (let j = stack.length - 1; j >= 0; j--) out += `</${stack[j]}>`;
  return { shown: out, done: n >= total, progress: total ? n / total : 0 };
}

function Rise({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); ob.disconnect(); } }, { threshold: 0.18 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(22px)", transition: `opacity 0.7s var(--at-ease) ${delay}ms, transform 0.7s var(--at-ease) ${delay}ms` }}>
      {children}
    </div>
  );
}

/** 카운트업 — 보이면 0→목표 */
function CountUp({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      ob.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    ob.observe(el);
    return () => ob.disconnect();
  }, [to, duration]);
  return <span ref={ref} className="tabular-nums">{v.toLocaleString("ko-KR")}{suffix}</span>;
}

/* ═══════════ 아이폰 목업 + 미니 앱 ═══════════ */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[290px] shrink-0 sm:w-[310px]">
      <div className="rounded-[46px] bg-neutral-900 p-[10px] shadow-[0_34px_80px_-24px_rgba(20,40,90,0.5)]">
        <div className="relative overflow-hidden rounded-[38px] bg-[#eef1f6]" style={{ aspectRatio: "9/19" }}>
          {/* 노치 */}
          <div className="absolute left-1/2 top-2.5 z-20 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-neutral-900" />
          <div className="at-app-bg absolute inset-0 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** 미니 코스 링 — 루프 애니메이션(차오르고 잠시 쉬고 반복) */
function MiniRing({ day = 7 }: { day?: number }) {
  const R = 44, C = 2 * Math.PI * R;
  const target = day / 20;
  const [p, setP] = useState(0);
  useEffect(() => {
    let alive = true;
    const loop = () => {
      if (!alive) return;
      setP(0);
      setTimeout(() => alive && setP(target), 350);
      setTimeout(() => alive && loop(), 5200);
    };
    loop();
    return () => { alive = false; };
  }, [target]);
  return (
    <div className="relative mx-auto h-[124px] w-[124px]">
      <svg width="124" height="124" viewBox="0 0 124 124" className="-rotate-90">
        <defs>
          <linearGradient id="miniGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1D75F7" /><stop offset="100%" stopColor="#38cdf8" />
          </linearGradient>
        </defs>
        <circle cx="62" cy="62" r={R} fill="none" stroke="rgba(120,140,175,0.18)" strokeWidth="9" />
        <circle cx="62" cy="62" r={R} fill="none" stroke="url(#miniGrad)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - p)} style={{ transition: "stroke-dashoffset 1.6s var(--at-ease)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] font-extrabold tracking-tight text-neutral-900">D-{day}</span>
        <span className="text-[10px] font-semibold text-neutral-400">{Math.round(target * 100)}%</span>
      </div>
    </div>
  );
}

const MINI_TOPICS = [
  "청년도약계좌 갈아타기, 조건별 정리",
  "숨은 정부지원금, 이번 달 신청 가능한 것",
  "예적금 금리 비교, 지금 갈아탈 은행",
];

/** 폰 화면: 홈 장면 */
function ScreenHome() {
  const [ti, setTi] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTi((t) => (t + 1) % MINI_TOPICS.length), 2800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex h-full flex-col px-4 pt-12">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wide text-neutral-400">대한민국에서 살아남기</p>
        <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm ring-1 ring-black/[0.05]">
          <GlassIcon name="credit" tint="blue" size={11} />
          <span className="text-[10px] font-bold text-neutral-800">580</span>
        </span>
      </div>
      <div className="mt-3"><MiniRing /></div>
      <p className="mt-1 text-center text-[10px] font-semibold text-neutral-500">승인 준비 코스 진행 중</p>
      <div className="mt-3 rounded-2xl bg-white/80 p-3.5 shadow-sm ring-1 ring-black/[0.04] backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-neutral-400">오늘의 글</span>
          <span className="rounded bg-amber-50 px-1 py-0.5 text-[8px] font-bold text-amber-600">🔥 오늘 이슈</span>
        </div>
        <p key={ti} className="ateflo-soft-in mt-1.5 text-[12px] font-bold leading-snug text-neutral-900">{MINI_TOPICS[ti]}</p>
        <div className="mt-2.5 rounded-lg bg-[#1D75F7] py-2 text-center text-[10.5px] font-bold text-white">이 글 쓰기</div>
      </div>
      <div className="mt-auto mb-3 flex items-center justify-around rounded-2xl bg-white/80 px-2 py-2 shadow-sm ring-1 ring-black/[0.04] backdrop-blur">
        {(["nav-home", "nav-articles", "nav-performance", "nav-more"] as const).map((n, i) => (
          <GlassIcon key={n} name={n} tint={i === 0 ? "blue" : "grey"} size={17} />
        ))}
      </div>
    </div>
  );
}

/** 폰 화면: 집필 장면 */
function ScreenWriting({ active }: { active: boolean }) {
  const { shown } = useTypewriter(DEMO_TOPICS[0].excerpt, active);
  return (
    <div className="flex h-full flex-col px-4 pt-12">
      <p className="text-[9px] font-semibold text-neutral-400">쓰는 중 · <b className="text-neutral-600">1,247자</b></p>
      <p className="mt-2 text-[13px] font-extrabold leading-snug text-neutral-900">{DEMO_TOPICS[0].title}</p>
      <div className="mt-2 min-h-0 flex-1 overflow-hidden">
        <div className="[&_h2]:mt-2 [&_h2]:text-[11px] [&_h2]:font-bold [&_p]:mt-1.5 [&_p]:text-[10px] [&_p]:leading-relaxed [&_p]:text-neutral-600" dangerouslySetInnerHTML={{ __html: shown }} />
        <span className="at-caret" style={{ height: "0.9em" }} />
      </div>
      <div className="mb-4 flex justify-center">
        <span className="rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-bold text-neutral-500 shadow ring-1 ring-black/[0.04]">이미지도 만들어 넣는 중이에요 🎨</span>
      </div>
    </div>
  );
}

/** 폰 화면: 발행 완료 장면 */
function ScreenDone() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="ateflo-circle-pop flex h-14 w-14 items-center justify-center rounded-full bg-[#1D75F7] text-white shadow-[0_10px_30px_rgba(29,117,247,0.45)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
      </span>
      <p className="mt-4 text-[15px] font-extrabold text-neutral-900">발행 완료</p>
      <p className="mt-1 text-[10.5px] leading-relaxed text-neutral-500">복사 → 네이버에 붙여넣기<br />1분이면 끝나요</p>
      <div className="mt-4 w-full rounded-xl bg-white/80 p-3 text-left shadow-sm ring-1 ring-black/[0.04]">
        <p className="text-[9px] font-bold text-neutral-400">내 글</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="truncate text-[10px] font-bold text-neutral-800">청년도약계좌 갈아타기…</span>
          <span className="ml-auto shrink-0 text-[8.5px] font-bold text-emerald-600">검색 노출 중</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ 스크롤 스토리 — 폰 고정 + 장면 전환 ═══════════ */
const SCENES = [
  { k: "topic", label: "01 · 글감", title: "뭘 쓸지, 데이터가 정해줘요", body: "네이버 검색량과 실제 경쟁(발행 글 수)으로 고른 '이길 수 있는 글감'이 매일 도착해요. 오늘 뜨는 이슈까지." },
  { k: "write", label: "02 · 집필", title: "눈앞에서 글이 완성돼요", body: "네이버 로직(C-Rank·D.I.A.) 규격으로, 계정마다 다른 문체로. 원하면 이미지 3장도 같이 만들어져요." },
  { k: "done", label: "03 · 발행", title: "붙여넣으면 끝, 계정은 안전", body: "자동 발행은 계정을 위험하게 해요. 마지막 붙여넣기만 남기는 게 우리 방식 — 발행 후 검색 반영까지 확인해 드려요." },
];

function StickyStory() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const passed = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? passed / total : 0;
      setScene(Math.min(SCENES.length - 1, Math.floor(p * SCENES.length)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div ref={wrapRef} className="relative" style={{ height: "260vh" }}>
      <div className="sticky top-0 flex min-h-screen items-center">
        <div className="mx-auto grid w-full max-w-4xl items-center gap-10 px-5 sm:grid-cols-2">
          {/* 텍스트 */}
          <div className="order-2 sm:order-1">
            {SCENES.map((s, i) => (
              <div key={s.k} className="transition-all duration-500" style={{ opacity: scene === i ? 1 : 0.18, transform: scene === i ? "none" : "scale(0.985)" }}>
                <p className="mt-6 text-[12px] font-bold tracking-widest" style={{ color: BLUE }}>{s.label}</p>
                <h3 className="mt-1 text-[24px] font-extrabold leading-snug tracking-tight sm:text-[28px]">{s.title}</h3>
                <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-neutral-500">{s.body}</p>
              </div>
            ))}
          </div>
          {/* 폰 */}
          <div className="order-1 sm:order-2">
            <PhoneFrame>
              {scene === 0 && <ScreenHome />}
              {scene === 1 && <ScreenWriting active />}
              {scene === 2 && <ScreenDone />}
            </PhoneFrame>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ 헤더 ═══════════ */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "at-glass-strong !rounded-none !border-x-0 !border-t-0" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <a href="/" aria-label="에이트플로"><Brand size={24} /></a>
        <Link href="/login" className="at-press rounded-xl bg-[#1D75F7] px-4 py-2 text-[13.5px] font-bold text-white transition hover:opacity-90">
          시작하기
        </Link>
      </div>
    </header>
  );
}

/* ═══════════ 라이브 데모 (자동 재생 + 이미지 연출) ═══════════ */
function LiveDemo() {
  const [sel, setSel] = useState(0);
  const [run, setRun] = useState(false);
  const autoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = autoRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(true); ob.disconnect(); } }, { threshold: 0.4 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  const topic = DEMO_TOPICS[sel];
  const { shown, done, progress } = useTypewriter(topic.excerpt, run);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (run && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [shown, run]);
  const imgPhase = !run ? 0 : progress < 0.35 ? 0 : progress < 0.95 ? 1 : 2; // 0=대기 1=생성중 2=완성

  return (
    <div ref={autoRef} className="mx-auto max-w-3xl">
      <div className="grid gap-2.5 sm:grid-cols-3">
        {DEMO_TOPICS.map((t, i) => (
          <button
            key={t.key}
            onClick={() => { setSel(i); setRun(false); requestAnimationFrame(() => setTimeout(() => setRun(true), 60)); }}
            className={`at-press rounded-2xl p-4 text-left transition ${sel === i && run ? "at-glass-strong ring-2 ring-[#1D75F7]" : "at-glass hover:ring-1 hover:ring-[#1D75F7]/40"}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-600">{t.badge}</span>
              <span className="text-[11px] font-medium text-neutral-400">{t.vol} 검색</span>
            </div>
            <p className="mt-1.5 text-[13px] font-bold leading-snug text-neutral-900">{t.title}</p>
            <p className="mt-2 text-[12px] font-bold" style={{ color: BLUE }}>{sel === i && run ? (done ? "완성 ✓" : "쓰는 중…") : "이 글감으로 →"}</p>
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_210px]">
        {/* 원고 */}
        <div className={`relative overflow-hidden rounded-2xl transition-all duration-500 ${run ? "at-glass-strong" : "at-glass"}`}>
          {!run ? (
            <div className="flex h-[320px] flex-col items-center justify-center px-6 text-center">
              <span className="at-ai-orb" style={{ width: 52, height: 52 }} />
              <p className="mt-5 text-[14px] font-bold text-neutral-700">잠시 후 여기서 글이 써져요</p>
            </div>
          ) : (
            <>
              <div ref={boxRef} className="h-[320px] overflow-y-auto p-5" style={{ scrollBehavior: "smooth" }}>
                <p className="text-[16px] font-extrabold leading-snug tracking-tight text-neutral-900">{topic.title}</p>
                <div className="prose prose-sm prose-neutral mt-3 max-w-none [&_h2]:mt-4 [&_h2]:text-[14px] [&_h2]:font-bold [&_p]:my-2 [&_p]:text-[13px] [&_p]:leading-relaxed" dangerouslySetInnerHTML={{ __html: shown }} />
                {!done && <span className="at-caret" />}
                {done && (
                  <div className="at-pop mt-4 rounded-xl bg-[#1D75F7]/[0.06] p-4 text-center">
                    <p className="text-[13px] font-bold" style={{ color: BLUE }}>이런 글이 매일 준비돼요</p>
                    <Link href="/login" className="at-press mt-2.5 inline-block rounded-xl bg-[#1D75F7] px-6 py-2.5 text-[13px] font-bold text-white transition hover:opacity-90">내 주제로 시작하기</Link>
                  </div>
                )}
              </div>
              <div className="absolute inset-x-0 top-0 h-0.5 bg-neutral-200/50">
                <div className="h-full transition-all duration-200" style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, ${BLUE}, #38cdf8)` }} />
              </div>
            </>
          )}
        </div>

        {/* 이미지 생성 연출 */}
        <div className="hidden flex-col gap-3 sm:flex">
          <div className={`relative flex-1 overflow-hidden rounded-2xl ${imgPhase === 1 ? "at-ai-swap at-glass" : "at-glass"}`}>
            {imgPhase < 2 ? (
              <div className="flex h-full min-h-[150px] flex-col items-center justify-center px-4 text-center">
                <p className="text-[11.5px] font-bold text-neutral-500">{imgPhase === 1 ? "대표 이미지 만드는 중 🎨" : "이미지"}</p>
                {imgPhase === 1 && <div className="ateflo-skel mt-3 h-16 w-full rounded-lg" />}
              </div>
            ) : (
              <div className="at-pop flex h-full min-h-[150px] flex-col">
                <div className="min-h-0 flex-1" style={{ background: "radial-gradient(120px 90px at 30% 35%, #ffd08a 0%, transparent 70%), radial-gradient(150px 110px at 75% 60%, #8ec5ff 0%, transparent 70%), radial-gradient(120px 100px at 50% 90%, #b79cff 0%, transparent 65%), linear-gradient(135deg, #eaf2ff, #f6efff)" }} />
                <p className="px-3 py-2 text-[10.5px] font-bold text-neutral-500">대표 이미지 완성 ✓ <span className="font-medium text-neutral-400">무자막 일러스트</span></p>
              </div>
            )}
          </div>
          <div className="rounded-2xl at-glass p-3.5">
            <p className="text-[10.5px] font-bold text-neutral-400">함께 생성</p>
            <p className="mt-0.5 text-[11.5px] font-semibold leading-relaxed text-neutral-600">글 쓰는 동안 이미지 3장이 같이 만들어져요</p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-neutral-400">실제 에이트플로가 쓴 글의 발췌예요 · 형광펜·소제목까지 네이버 규격</p>
    </div>
  );
}

/* ═══════════ 메인 ═══════════ */
export default function NaverLanding() {
  return (
    <div className="at-app-bg min-h-screen overflow-x-clip text-neutral-900 antialiased">
      <Header />

      {/* ═══ 히어로 — 카피 × 살아있는 폰 ═══ */}
      <section className="mx-auto grid max-w-5xl items-center gap-12 px-5 pb-16 pt-28 sm:grid-cols-[1.1fr_0.9fr] sm:pb-24 sm:pt-36">
        <div>
          <Rise>
            <p className="inline-flex items-center gap-1.5 rounded-full at-glass px-3.5 py-1.5 text-[12px] font-bold text-neutral-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 네이버 블로그 수익화 코스
            </p>
          </Rise>
          <Rise delay={90}>
            <h1 className="mt-5 text-[38px] font-extrabold leading-[1.12] tracking-tight sm:text-[54px]">
              매일 글 하나면,
              <br />
              <span style={{ background: `linear-gradient(90deg, ${BLUE}, #38cdf8)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                네이버가 수익이 돼요
              </span>
            </h1>
          </Rise>
          <Rise delay={180}>
            <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-neutral-500">
              뭘 쓸지 고민하지 마세요. 검색되는 글감부터 완성 글, 이미지까지 매일 준비돼요. 붙여넣으면 발행 끝.
            </p>
          </Rise>
          <Rise delay={260}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/login" className="at-press rounded-2xl bg-[#1D75F7] px-8 py-4 text-[16px] font-bold text-white shadow-[0_14px_34px_-12px_rgba(29,117,247,0.55)] transition hover:opacity-90">
                1,900원으로 시작하기
              </Link>
              <span className="text-[12px] leading-snug text-neutral-400">트라이얼 글 3편<br />자동결제 아님</span>
            </div>
          </Rise>
        </div>
        <Rise delay={200}>
          <PhoneFrame><ScreenHome /></PhoneFrame>
        </Rise>
      </section>

      {/* ═══ 스크롤 스토리 ═══ */}
      <StickyStory />

      {/* ═══ 라이브 데모 ═══ */}
      <section className="mx-auto max-w-4xl px-5 pb-24 pt-8">
        <Rise>
          <p className="text-center text-[12px] font-bold tracking-widest" style={{ color: BLUE }}>LIVE DEMO</p>
          <h2 className="mt-2 text-center text-[26px] font-extrabold tracking-tight sm:text-[32px]">말보다 증거, 직접 보세요</h2>
        </Rise>
        <Rise delay={100} className="mt-8"><LiveDemo /></Rise>
      </section>

      {/* ═══ 메이트 FOMO — 수치 카운트업 ═══ */}
      <section className="mx-auto max-w-4xl px-5 pb-24">
        <Rise>
          <div className="overflow-hidden rounded-3xl at-glass-strong">
            <div className="px-6 pt-10 text-center sm:px-12">
              <p className="text-[12px] font-bold tracking-widest text-amber-500">2026 공식 · 네이버 메이트</p>
              <h2 className="mt-2 text-[26px] font-extrabold leading-snug tracking-tight sm:text-[32px]">
                네이버가 블로거에게
                <br />직접 돈을 주기 시작했어요
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-neutral-500">
                AI 브리핑에 인용되는 글을 쓰면 매달 선정해 지원금을 줘요. <b className="text-neutral-700">베타는 2026년 12월까지</b> — 먼저 쌓은 블로그가 유리한 게임이에요.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-3 divide-x divide-neutral-200/60 border-t border-neutral-200/60">
              {[
                { v: 30, s: "만원", l: "선정 시 매달" },
                { v: 300, s: "만원", l: "스페셜 100명" },
                { v: 1000, s: "만원", l: "스페셜 10명" },
              ].map((x) => (
                <div key={x.l} className="px-2 py-7 text-center">
                  <p className="text-[26px] font-extrabold tracking-tight sm:text-[34px]" style={{ color: BLUE }}>
                    <CountUp to={x.v} suffix={x.s} />
                  </p>
                  <p className="mt-1 text-[11.5px] font-semibold text-neutral-400">{x.l}</p>
                </div>
              ))}
            </div>
          </div>
        </Rise>
        <Rise delay={140}>
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-center text-[12.5px] leading-relaxed text-amber-800">
            좋은 글감은 <b>선점 게임</b> — 그 검색어의 첫 완결 글이 검색을 가져가요. 오늘 쓴 글이 내일의 자리예요.
          </p>
        </Rise>
      </section>

      {/* ═══ 신뢰 — 정직한 차별점 ═══ */}
      <section className="mx-auto max-w-3xl px-5 pb-24">
        <Rise><h2 className="text-center text-[26px] font-extrabold tracking-tight sm:text-[32px]">그럴듯한 약속 대신, 구조</h2></Rise>
        <div className="mt-8 space-y-3">
          {[
            { t: "실데이터로 고르는 글감", s: "감이 아니라 네이버 검색량과 실제 발행 글 수(경쟁)로 골라요. 발행 후엔 검색에 잡혔는지도 자동 확인해 드려요." },
            { t: "네이버 공식 가이드 기반 글", s: "C-Rank·D.I.A.와 2026 AI 브리핑 가이드(경험·출처·완결) 규격. 계정마다 문체가 달라 같은 글이 없어요." },
            { t: "계정이 안 죽는 방식", s: "자동 발행 프로그램은 이용약관 위반으로 계정을 위험하게 해요. 우리는 복사·붙여넣기 방식만 써요." },
            { t: "방문자·수익을 보장하지 않아요", s: "노출은 네이버가 정해요. 우리가 하는 건 확률을 높이는 준비 — 그래서 더 믿을 수 있어요." },
          ].map((x, i) => (
            <Rise key={x.t} delay={i * 80}>
              <div className="rounded-2xl at-glass p-5">
                <p className="flex items-center gap-2 text-[15px] font-extrabold text-neutral-900">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  {x.t}
                </p>
                <p className="mt-1.5 pl-6 text-[13.5px] leading-relaxed text-neutral-500">{x.s}</p>
              </div>
            </Rise>
          ))}
        </div>
      </section>

      {/* ═══ 가격 ═══ */}
      <section className="mx-auto max-w-2xl px-5 pb-24">
        <Rise>
          <h2 className="text-center text-[26px] font-extrabold tracking-tight sm:text-[32px]">커피 반 잔으로 시작</h2>
          <p className="mt-2 text-center text-[13.5px] text-neutral-500">구독 아님 · 1회 결제 · 크레딧은 유효기간 없이 계정에</p>
        </Rise>
        <div className="mt-8 space-y-2.5">
          {CREDIT_PACKS.map((p, i) => (
            <Rise key={p.key} delay={i * 60}>
              <Link href="/login" className={`at-press relative flex items-center gap-4 rounded-2xl p-5 transition ${p.highlight ? "at-glass-strong ring-2 ring-[#1D75F7]" : "at-glass hover:ring-1 hover:ring-[#1D75F7]/40"}`}>
                {p.highlight && <span className="absolute -top-2.5 left-5 rounded-full bg-[#1D75F7] px-2.5 py-0.5 text-[11px] font-bold text-white">가장 많이 선택</span>}
                <GlassIcon name="credit" tint={p.highlight ? "blue" : "grey"} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold text-neutral-900">{p.name} <span className="font-bold text-neutral-400">· {p.credits.toLocaleString("ko-KR")}크레딧</span></p>
                  <p className="mt-0.5 truncate text-[12px] text-neutral-500">{p.desc}</p>
                </div>
                <p className="shrink-0 text-[16px] font-extrabold text-neutral-900">{p.price.toLocaleString("ko-KR")}원</p>
              </Link>
            </Rise>
          ))}
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="mx-auto max-w-2xl px-5 pb-24">
        <Rise><h2 className="text-center text-[26px] font-extrabold tracking-tight sm:text-[32px]">솔직하게 답할게요</h2></Rise>
        <div className="mt-8 space-y-2.5">
          {[
            { q: "AI가 쓴 글, 네이버가 싫어하지 않나요?", a: "네이버 공식 답변: \"AI 도구 사용 자체는 패널티가 아니에요.\" 걸러지는 건 무분별한 복제 글이에요. 에이트플로는 계정마다 문체가 다르고, 경험·출처·완결 같은 공식 기준에 맞춰 써요. 마지막에 내 경험 한 줄을 얹으면 가장 좋아요." },
            { q: "언제부터 수익이 나요?", a: "보장 못 해요 — 그게 정직한 답이에요. 통상 흐름은 발행 후 2일 안에 검색 반영, 1~2주부터 노출, 승인 신청은 글이 쌓인 뒤예요. 이 과정 전체를 코스로 안내하고, 검색 반영 여부를 자동으로 확인해 드려요." },
            { q: "자동으로 발행해 주나요?", a: "아니요, 일부러 안 해요. 자동 발행 프로그램은 네이버 약관 위반이라 계정 제한 사유가 돼요. 붙여넣기 한 번은 남겨서 계정을 지키는 게 우리 방식이에요." },
            { q: "블로그가 없어도 되나요?", a: "네. 온보딩에서 개설부터 검색 설정까지 순서대로 같이 해요. 이미 있다면 주소만 연결하면 돼요." },
          ].map((f, i) => (
            <Rise key={f.q} delay={i * 60}>
              <details className="group rounded-2xl at-glass p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14.5px] font-bold text-neutral-900">
                  {f.q}
                  <span className="shrink-0 text-neutral-300 transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <p className="mt-3 text-[13.5px] leading-relaxed text-neutral-500">{f.a}</p>
              </details>
            </Rise>
          ))}
        </div>
      </section>

      {/* ═══ 파이널 훅 ═══ */}
      <section className="mx-auto max-w-3xl px-5 pb-24 text-center">
        <Rise>
          <div className="rounded-3xl at-glass-strong px-6 py-14 sm:px-12">
            <h2 className="text-[28px] font-extrabold leading-snug tracking-tight sm:text-[36px]">
              1년 뒤에도 <span style={{ color: BLUE }}>"해볼걸"</span> 하고
              <br />있을 순 없잖아요
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-[14px] leading-relaxed text-neutral-500">
              블로그는 복리예요. 오늘 쓴 글이 계속 검색되고, 계속 일해요.
              <br />시작이 늦어질수록 복리도 늦게 시작돼요.
            </p>
            <Link href="/login" className="at-press mt-8 inline-block rounded-2xl bg-[#1D75F7] px-10 py-4 text-[16px] font-bold text-white shadow-[0_14px_34px_-12px_rgba(29,117,247,0.55)] transition hover:opacity-90">
              오늘 첫 글 쓰기 (D-1)
            </Link>
            <p className="mt-3 text-[12px] text-neutral-400">1,900원 트라이얼 · 자동결제 아님 · 7일 환불</p>
          </div>
        </Rise>
      </section>

      <SiteFooter />
    </div>
  );
}
