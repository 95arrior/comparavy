"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import Brand from "@/components/Brand";
import SiteFooter from "@/components/SiteFooter";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";

const ACCENT = "#3f91ff";

/* ───────────── 미니 제품 화면 (챕터 보조 비주얼) ───────────── */
function Bar({ w, d }: { w: string; d: number }) {
  return <div className="mock-gen-bar h-2.5 rounded-full bg-neutral-200" style={{ width: w, animationDelay: `${d}s` }} />;
}
function Check() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>;
}
function ScreenCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[288px] sm:w-[320px]">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.6rem] bg-[#3f91ff]/12 blur-[55px]" />
      <div className="h-[416px] overflow-hidden rounded-[2rem] border border-neutral-200 bg-neutral-50 shadow-[0_34px_80px_-26px_rgba(49,130,246,0.45)]">
        {children}
      </div>
    </div>
  );
}

function SceneOpen() {
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-semibold text-neutral-400">새 블로그</p>
      <div className="mt-3 rounded-2xl border border-neutral-200 bg-white px-3.5 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-neutral-200" /><span className="h-2 w-2 rounded-full bg-neutral-200" />
          <span className="ml-1 text-[12px] text-neutral-400">내블로그.com</span>
        </div>
      </div>
      <button className="mt-4 w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(63,145,255,0.6)]" style={{ background: ACCENT }}>내 블로그 만들기</button>
      <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3">
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
      <p className="mt-3 text-[12px] font-bold text-neutral-700">🔥 지금 뜨는 키워드</p>
      <div className="mt-2 space-y-1.5">
        {kws.map((x) => (
          <div key={x.k} className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-white px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-neutral-700">{x.k}{x.hot && " 🔥"}</span>
            <span className="shrink-0 text-[11px] text-neutral-400">월 {x.v}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] font-bold text-neutral-700">📈 검색 트렌드</p>
      <div className="mt-2 flex h-14 items-end gap-1.5 rounded-xl border border-neutral-100 bg-white px-3 py-2">
        {trend.map((h, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === trend.length - 1 ? ACCENT : "rgba(63,145,255,0.22)" }} />)}
      </div>
    </div>
  );
}
function SceneWrite() {
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-semibold text-neutral-400">글쓰기</p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-700">전세 사기 예방법</span>
        <span className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white" style={{ background: ACCENT }}>글 생성</span>
      </div>
      <div className="mt-4 space-y-2.5"><Bar w="100%" d={0.1} /><Bar w="93%" d={0.35} /><Bar w="97%" d={0.6} /><Bar w="70%" d={0.85} /></div>
      <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3">
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
      <div className="mt-4 flex h-24 items-end justify-between gap-1.5">
        {bars.map((h, i) => <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === bars.length - 1 ? ACCENT : "rgba(63,145,255,0.22)" }} />)}
      </div>
    </div>
  );
}

/* ───────────── 챕터 빌딩 블록 ───────────── */
function Chapter({ tint = false, children }: { tint?: boolean; children: React.ReactNode }) {
  return (
    <section className={`flex min-h-[92vh] flex-col items-center justify-center px-6 py-20 ${tint ? "bg-[#f3f7ff]" : "bg-white"}`}>
      <div className="mx-auto w-full max-w-3xl text-center">{children}</div>
    </section>
  );
}
function Arrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
function BeforeAfter({ before, after }: { before: string; after: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-[13px] shadow-sm sm:text-sm">
      <span className="text-neutral-400 line-through decoration-neutral-300">{before}</span>
      <Arrow />
      <span className="font-bold text-[#2f7fe6]">{after}</span>
    </span>
  );
}

const STEPS = [
  { no: "01", title: <>블로그 개설,<br />버튼 한 번.</>, before: "호스팅·설치 1주일", after: "클릭 한 번", Screen: SceneOpen, tint: false },
  { no: "02", title: <>뭘 쓸지,<br />데이터가 알려줘요.</>, before: "감으로 고르기", after: "뜨는 키워드가 눈앞에", Screen: SceneData, tint: true },
  { no: "03", title: <>키워드 하나,<br />칼럼급 글.</>, before: "한 편에 5시간", after: "1분", Screen: SceneWrite, tint: false },
  { no: "04", title: <>글이 쌓이고,<br />수익이 따라와요.</>, before: "검색에 안 잡힘", after: "검색 유입 ↑", Screen: SceneEarn, tint: true },
];

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

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-neutral-200/50 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Brand />
          <button onClick={toSignup} className="rounded-xl bg-[#3f91ff] px-4 py-2 text-sm font-semibold text-white transition active:scale-95 hover:opacity-90">사전신청</button>
        </div>
      </header>

      {/* 0. 오프닝 — 큰 선언 한 문장 */}
      <section className="hero-aurora relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-16 text-center">
        <div className="relative z-10 mx-auto max-w-3xl">
          <p className="mono-rise inline-flex items-center gap-1.5 rounded-full border border-[#3f91ff]/20 bg-[#3f91ff]/5 px-3 py-1 text-xs font-semibold text-[#2f7fe6]">
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
          <div className="mono-rise mono-d5 absolute inset-x-0 -bottom-24 flex justify-center sm:-bottom-28">
            <motion.span animate={{ y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} className="text-neutral-300">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            </motion.span>
          </div>
        </div>
      </section>

      {/* 1. 공감 — 멈추는 이유 */}
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
        <Reveal delay={100}><p className="mt-6 text-sm text-neutral-400">개설 → 데이터 → 글 → 수익. 다음 한 걸음만 누르면 돼요.</p></Reveal>
      </Chapter>

      {/* 3. STEP 챕터 — 큰 타입 + before→after + 제품 화면 */}
      {STEPS.map((s) => (
        <Chapter key={s.no} tint={s.tint}>
          <Reveal><p className="text-xs font-bold tracking-[0.25em] text-[#3f91ff]">STEP {s.no}</p></Reveal>
          <Reveal delay={60}>
            <h2 className="font-pretendard mt-4 text-[2.1rem] font-extrabold leading-[1.14] tracking-tight sm:text-6xl" style={{ wordBreak: "keep-all" }}>{s.title}</h2>
          </Reveal>
          <Reveal delay={120}><div className="mt-6"><BeforeAfter before={s.before} after={s.after} /></div></Reveal>
          <Reveal delay={180}><div className="mt-11"><ScreenCard><s.Screen /></ScreenCard></div></Reveal>
        </Chapter>
      ))}

      {/* 4. 세 가지 약속 (toss 3-pillar) */}
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

      {/* 5. 가격 — 큰 숫자 */}
      <Chapter>
        <Reveal><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">부담 없이</p></Reveal>
        <Reveal delay={60}><h2 className="font-pretendard mt-5 text-[2.1rem] font-extrabold tracking-tight sm:text-6xl">딱 쓴 만큼만.</h2></Reveal>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Reveal delay={80}>
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
              <p className="text-3xl font-extrabold tracking-tight text-neutral-900"><CountUp to={3} />편</p>
              <p className="mt-1 text-sm text-neutral-500">무료로 먼저</p>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="rounded-3xl border-2 border-[#3f91ff]/30 bg-[#3f91ff]/5 p-6">
              <p className="text-3xl font-extrabold tracking-tight text-[#2f7fe6]">₩<CountUp to={11000} /></p>
              <p className="mt-1 text-sm text-neutral-600">충전 · 글 쓸 때 차감</p>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
              <p className="text-3xl font-extrabold tracking-tight text-neutral-900">0원</p>
              <p className="mt-1 text-sm text-neutral-500">안 쓰면 안 나가요</p>
            </div>
          </Reveal>
        </div>
        <Reveal delay={240}><p className="mt-6 text-xs leading-relaxed text-neutral-400">호스팅·도메인 비용은 별도이고 우리 매출이 아니에요. 글 관련 크레딧만 받아요.</p></Reveal>
      </Chapter>

      {/* 6. 신청 + 충전 의향 검증 */}
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
                  return (
                    <button key={w.k} onClick={() => setWilling(on ? null : w.k)} className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition active:scale-95 ${on ? "border-[#3f91ff] bg-[#3f91ff] text-white shadow-[0_0_18px_rgba(63,145,255,0.4)]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}>{w.label}</button>
                  );
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
