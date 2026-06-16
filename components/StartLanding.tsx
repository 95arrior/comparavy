"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Brand from "@/components/Brand";
import SiteFooter from "@/components/SiteFooter";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";

const ACCENT = "#3f91ff";

/* ───────────── 앱 사용 화면(목업) ───────────── */
function Bar({ w, d }: { w: string; d: number }) {
  return <div className="mock-gen-bar h-2.5 rounded-full bg-neutral-200" style={{ width: w, animationDelay: `${d}s` }} />;
}
function Check() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>;
}

// 실제 앱 화면처럼 보이게 — 상태바 + 화면
function AppScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[216px] sm:w-[300px]">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.6rem] bg-[#3f91ff]/14 blur-[55px]" />
      <div className="flex h-[296px] flex-col overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-[0_34px_80px_-26px_rgba(49,130,246,0.5)] sm:h-[428px]">
        <div className="flex items-center justify-between px-5 pt-2.5 text-[10px] font-bold text-neutral-400">
          <span>9:41</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-neutral-300" /><span className="h-1.5 w-1.5 rounded-full bg-neutral-300" /><span className="h-1.5 w-3 rounded-sm bg-neutral-300" /></span>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function SceneOpen() {
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-semibold text-neutral-400">새 블로그</p>
      <div className="mt-2.5 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-200" /><span className="h-2 w-2 rounded-full bg-neutral-200" /><span className="ml-1 text-[12px] text-neutral-400">내블로그.com</span></div>
      </div>
      <button className="mt-3.5 w-full rounded-2xl py-3 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(63,145,255,0.6)]" style={{ background: ACCENT }}>내 블로그 만들기</button>
      <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check /></span>
        <div><p className="text-[13px] font-semibold text-emerald-800">개설 완료!</p><p className="text-[11px] text-emerald-600">워드프레스가 바로 생겼어요</p></div>
      </div>
      <p className="mt-auto text-center text-[11px] text-neutral-400">호스팅·설치는 안 보이게</p>
    </div>
  );
}
function SceneData() {
  const kws = [{ k: "전세 사기 예방법", v: "1.2만", hot: true }, { k: "1억으로 갭투자", v: "8,400" }, { k: "청약 가점 계산", v: "6,100" }];
  const trend = [30, 42, 38, 55, 64, 80];
  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-1.5"><span className="rounded-full bg-[#3f91ff] px-2.5 py-1 text-[11px] font-semibold text-white">부동산</span><p className="text-xs font-semibold text-neutral-400">블로그</p></div>
      <p className="mt-2.5 text-[12px] font-bold text-neutral-700">🔥 지금 뜨는 키워드</p>
      <div className="mt-2 space-y-1.5">
        {kws.map((x) => (
          <div key={x.k} className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-neutral-700">{x.k}{x.hot && " 🔥"}</span>
            <span className="shrink-0 text-[11px] text-neutral-400">월 {x.v}</span>
          </div>
        ))}
      </div>
      <p className="mt-3.5 text-[12px] font-bold text-neutral-700">📈 검색 트렌드</p>
      <div className="mt-2 flex h-12 items-end gap-1.5 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2">
        {trend.map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === trend.length - 1 ? ACCENT : "rgba(63,145,255,0.22)" }} />)}
      </div>
    </div>
  );
}
function SceneWrite() {
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-semibold text-neutral-400">글쓰기</p>
      <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-700">전세 사기 예방법</span>
        <span className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white" style={{ background: ACCENT }}>글 생성</span>
      </div>
      <div className="mt-4 space-y-2.5"><Bar w="100%" d={0.1} /><Bar w="93%" d={0.35} /><Bar w="97%" d={0.6} /><Bar w="70%" d={0.85} /></div>
      <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check /></span>
        <p className="text-[13px] font-semibold text-emerald-800">칼럼급 글이 발행됐어요</p>
      </div>
    </div>
  );
}
function SceneEarn() {
  const bars = [26, 34, 31, 46, 58, 70, 88];
  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between"><p className="text-xs font-semibold text-neutral-400">이번 달</p><p className="text-[11px] font-semibold text-emerald-600">▲ 검색 유입</p></div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-neutral-50 px-3 py-2.5"><p className="text-[10px] text-neutral-400">방문자</p><p className="whitespace-nowrap text-base font-extrabold tracking-tight text-neutral-900">12,480</p></div>
        <div className="rounded-xl bg-[#3f91ff]/10 px-3 py-2.5"><p className="text-[10px] text-[#2f7fe6]">예상 광고수익</p><p className="whitespace-nowrap text-base font-extrabold tracking-tight text-[#2f7fe6]">₩312,000</p></div>
      </div>
      <div className="mt-3 flex h-20 items-end justify-between gap-1.5">
        {bars.map((h, i) => <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === bars.length - 1 ? ACCENT : "rgba(63,145,255,0.22)" }} />)}
      </div>
    </div>
  );
}

const STEPS = [
  { no: "01", tag: "개설", title: <>버튼 한 번에,<br />블로그 개설.</>, feats: ["호스팅·도메인 자동 연결", "워드프레스 설치·설정 끝"], Screen: SceneOpen },
  { no: "02", tag: "데이터", title: <>뭘 쓸지,<br />데이터가 알려줘요.</>, feats: ["지금 뜨는 키워드", "검색 트렌드·시즌까지"], Screen: SceneData },
  { no: "03", tag: "글쓰기", title: <>키워드 하나,<br />칼럼급 글.</>, feats: ["검색 의도에 맞춘 구조", "클릭 한 번이면 발행"], Screen: SceneWrite },
  { no: "04", tag: "수익화", title: <>글이 쌓이고,<br />수익으로.</>, feats: ["검색 유입 분석", "애드센스 수익까지"], Screen: SceneEarn },
];

/* ───────────── 가로 스크롤 여정 (세로 스크롤 → 옆으로 흐름) ───────────── */
function HorizontalJourney() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // 각 패널을 일정 구간 '정중앙에 멈춤(plateau)' → 짧게 슬라이드 → 다음 패널. (toss식 hold-then-slide)
  const x = useTransform(
    scrollYProgress,
    [0, 0.18, 0.27, 0.45, 0.54, 0.72, 0.81, 1],
    ["0vw", "0vw", "-100vw", "-100vw", "-200vw", "-200vw", "-300vw", "-300vw"],
  );
  const barW = useTransform(scrollYProgress, [0, 0.27, 0.54, 0.81, 1], ["25%", "50%", "75%", "100%", "100%"]);

  return (
    <section ref={ref} className="relative bg-white" style={{ height: `${STEPS.length * 100}vh` }}>
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        {/* 고정 헤더 + 진행바 */}
        <div className="mx-auto w-full max-w-3xl px-6 pt-[4.25rem] text-center sm:pt-24">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">고객 여정 · 옆으로 →</p>
          <h2 className="font-pretendard mt-2 text-xl font-extrabold tracking-tight sm:mt-3 sm:text-4xl">버튼 몇 번이면, 여기까지.</h2>
          <div className="mx-auto mt-4 h-1 w-40 overflow-hidden rounded-full bg-neutral-100 sm:mt-5">
            <motion.div className="h-full rounded-full bg-[#3f91ff]" style={{ width: barW }} />
          </div>
        </div>
        {/* 가로로 흐르는 패널들 */}
        <motion.div className="flex flex-1 items-center" style={{ x }}>
          {STEPS.map((s) => (
            <div key={s.no} className="flex h-full w-screen shrink-0 items-center justify-center px-6">
              <div className="mx-auto grid w-full max-w-4xl items-center gap-7 sm:grid-cols-2 sm:gap-12">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-bold tracking-[0.22em] text-[#3f91ff]">STEP {s.no} · {s.tag}</p>
                  <h3 className="font-pretendard mt-2.5 text-[1.55rem] font-extrabold leading-[1.16] tracking-tight sm:mt-3 sm:text-5xl" style={{ wordBreak: "keep-all" }}>{s.title}</h3>
                  <ul className="mt-4 inline-flex flex-col gap-1.5 text-left sm:mt-5 sm:gap-2">
                    {s.feats.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[13px] text-neutral-500 sm:text-sm">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#3f91ff]/15 text-[#2f7fe6]"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-center"><AppScreen><s.Screen /></AppScreen></div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────── 일반 챕터 ───────────── */
function Chapter({ tint = false, children }: { tint?: boolean; children: React.ReactNode }) {
  return (
    <section className={`flex min-h-[90vh] flex-col items-center justify-center px-6 py-20 ${tint ? "bg-[#f3f7ff]" : "bg-white"}`}>
      <div className="mx-auto w-full max-w-3xl text-center">{children}</div>
    </section>
  );
}

const WILLING = [
  { k: "yes", label: "네, 바로 충전할래요" },
  { k: "maybe", label: "무료부터 써볼래요" },
  { k: "pricey", label: "가격이 부담돼요" },
];

/* ───────────── 페이지 ───────────── */
export default function StartLanding() {
  const [willing, setWilling] = useState<string | null>(null);
  const signupRef = useRef<HTMLDivElement>(null);
  const toSignup = () => signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  // 히어로 스크롤 줌/패럴랙스 (toss식 고급 이펙트)
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroScale = useTransform(heroP, [0, 1], [1, 1.18]);
  const heroY = useTransform(heroP, [0, 1], [0, -60]);
  const heroTextY = useTransform(heroP, [0, 1], [0, -120]);
  const heroTextOpacity = useTransform(heroP, [0, 0.6], [1, 0]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200/50 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Brand />
          <button onClick={toSignup} className="rounded-xl bg-[#3f91ff] px-4 py-2 text-sm font-semibold text-white transition active:scale-95 hover:opacity-90">사전신청</button>
        </div>
      </header>

      {/* 0. 오프닝 — 스크롤 줌 히어로 */}
      <section ref={heroRef} className="relative h-[175vh]">
        <div className="hero-aurora sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6">
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <motion.div style={{ y: heroTextY, opacity: heroTextOpacity }}>
              <p className="mono-rise inline-flex items-center gap-1.5 rounded-full border border-[#3f91ff]/20 bg-[#3f91ff]/5 px-3 py-1 text-xs font-semibold text-[#2f7fe6]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3f91ff]" /> 곧 오픈 · 사전신청 받는 중
              </p>
              <h1 className="font-pretendard mono-rise mono-d1 mt-6 text-[2.4rem] font-extrabold leading-[1.12] tracking-tight sm:text-7xl" style={{ wordBreak: "keep-all" }}>
                워드프레스 수익화,<br /><span className="text-[#3f91ff]">이제 막히지 않아요.</span>
              </h1>
              <p className="mono-rise mono-d2 mx-auto mt-7 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-lg" style={{ wordBreak: "keep-all" }}>
                개설부터 글쓰기, 애드센스 승인, 수익화까지 — 한 흐름으로.
              </p>
            </motion.div>
            <motion.div style={{ scale: heroScale, y: heroY }} className="mt-10 origin-top">
              <AppScreen><SceneWrite /></AppScreen>
            </motion.div>
          </div>
          <motion.span style={{ opacity: heroTextOpacity }} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-neutral-300">
            <motion.svg animate={{ y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></motion.svg>
          </motion.span>
        </div>
      </section>

      {/* 1. 공감 */}
      <Chapter tint>
        <Reveal><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">왜 다들 멈출까</p></Reveal>
        <Reveal delay={60}>
          <h2 className="font-pretendard mt-5 text-[2rem] font-extrabold leading-[1.18] tracking-tight sm:text-5xl" style={{ wordBreak: "keep-all" }}>
            막히는 건,<br />의지가 아니라 <span className="text-[#3f91ff]">과정</span>이에요.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <div className="mx-auto mt-9 flex max-w-md flex-wrap justify-center gap-2">
            {["호스팅 뭐 고르지", "워드프레스 설치부터 벽", "애드센스 자꾸 반려", "뭘 써야 검색에 잡혀?"].map((w) => (
              <span key={w} className="rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-[13px] text-neutral-500">{w}</span>
            ))}
          </div>
        </Reveal>
      </Chapter>

      {/* 2. 브릿지 */}
      <Chapter>
        <Reveal>
          <h2 className="font-pretendard text-[2.1rem] font-extrabold leading-[1.16] tracking-tight sm:text-6xl" style={{ wordBreak: "keep-all" }}>
            그래서 AteFlo는,<br />그 과정을 <span className="text-[#3f91ff]">전부 없앴어요.</span>
          </h2>
        </Reveal>
        <Reveal delay={100}><p className="mt-6 text-sm text-neutral-400">아래로 내리면, 실제 앱 화면으로 여정을 보여드릴게요.</p></Reveal>
      </Chapter>

      {/* 3. 가로 스크롤 여정 */}
      <HorizontalJourney />

      {/* 4. 세 가지 약속 */}
      <Chapter tint>
        <Reveal><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">AteFlo가 다른 이유</p></Reveal>
        <Reveal delay={60}><h2 className="font-pretendard mt-5 text-[2rem] font-extrabold tracking-tight sm:text-5xl">쉽게 · 빠르게 · 끝까지</h2></Reveal>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { t: "쉽게", d: "개설·설정은 안 보이게. 버튼만 누르면 돼요." },
            { t: "빠르게", d: "키워드 하나면 칼럼급 글이 1분 만에." },
            { t: "끝까지", d: "애드센스 승인·수익화까지 같이 가요." },
          ].map((p, i) => (
            <Reveal key={p.t} delay={80 + i * 60}>
              <div className="h-full rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-sm">
                <p className="text-lg font-extrabold tracking-tight text-[#2f7fe6]">{p.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Chapter>

      {/* 5. 가격 */}
      <Chapter>
        <Reveal><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">부담 없이</p></Reveal>
        <Reveal delay={60}><h2 className="font-pretendard mt-5 text-[2.1rem] font-extrabold tracking-tight sm:text-6xl">딱 쓴 만큼만.</h2></Reveal>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Reveal delay={80}><div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6"><p className="text-3xl font-extrabold tracking-tight text-neutral-900"><CountUp to={3} />편</p><p className="mt-1 text-sm text-neutral-500">무료로 먼저</p></div></Reveal>
          <Reveal delay={140}><div className="rounded-3xl border-2 border-[#3f91ff]/30 bg-[#3f91ff]/5 p-6"><p className="text-3xl font-extrabold tracking-tight text-[#2f7fe6]">₩<CountUp to={11000} /></p><p className="mt-1 text-sm text-neutral-600">충전 · 글 쓸 때 차감</p></div></Reveal>
          <Reveal delay={200}><div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6"><p className="text-3xl font-extrabold tracking-tight text-neutral-900">0원</p><p className="mt-1 text-sm text-neutral-500">안 쓰면 안 나가요</p></div></Reveal>
        </div>
        <Reveal delay={240}><p className="mt-6 text-xs leading-relaxed text-neutral-400">호스팅·도메인 비용은 별도이고 우리 매출이 아니에요. 글 관련 크레딧만 받아요.</p></Reveal>
      </Chapter>

      {/* 6. 신청 + 충전 의향 */}
      <section ref={signupRef} className="scroll-mt-20 bg-gradient-to-b from-white to-[#eaf2ff]">
        <div className="mx-auto flex min-h-[92vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
          <Reveal><h2 className="font-pretendard text-[2.1rem] font-extrabold leading-tight tracking-tight sm:text-5xl" style={{ wordBreak: "keep-all" }}>가장 먼저 시작하고,<br />보너스 크레딧 받으세요.</h2></Reveal>
          <Reveal delay={80}><p className="mt-4 text-sm text-neutral-500">사전신청자에겐 오픈 시 추가 크레딧을 드려요.</p></Reveal>
          <Reveal delay={140}>
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
