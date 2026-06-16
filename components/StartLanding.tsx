"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import Brand from "@/components/Brand";
import SiteFooter from "@/components/SiteFooter";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";

const ACCENT = "#3f91ff";

/* ───────────── 제품 목업 화면 (밝은 톤) ───────────── */

function Bar({ w, d }: { w: string; d: number }) {
  return <div className="mock-gen-bar h-2.5 rounded-full bg-neutral-200" style={{ width: w, animationDelay: `${d}s` }} />;
}
function Check({ size = 7 }: { size?: number }) {
  return <svg width={size * 2} height={size * 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>;
}

// 01 개설
function SceneOpen() {
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-semibold text-neutral-400">새 블로그</p>
      <p className="mt-1 text-[15px] font-bold tracking-tight text-neutral-900">블로그를 만들어 볼까요?</p>
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white px-3.5 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-neutral-200" />
          <span className="h-2 w-2 rounded-full bg-neutral-200" />
          <span className="ml-1 text-[12px] text-neutral-400">내블로그.com</span>
        </div>
      </div>
      <button className="mt-4 w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(63,145,255,0.6)]" style={{ background: ACCENT }}>
        내 블로그 만들기
      </button>
      <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check /></span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-emerald-800">개설 완료!</p>
          <p className="text-[11px] text-emerald-600">워드프레스가 바로 생겼어요</p>
        </div>
      </div>
      <p className="mt-auto text-center text-[11px] text-neutral-400">호스팅·설치는 안 보이게, 버튼 한 번으로</p>
    </div>
  );
}

// 02 카테고리 → 데이터
function SceneData() {
  const kws = [
    { k: "전세 사기 예방법", v: "1.2만", hot: true },
    { k: "1억으로 갭투자", v: "8,400" },
    { k: "청약 가점 계산", v: "6,100" },
  ];
  const trend = [30, 42, 38, 55, 64, 80];
  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-[#3f91ff] px-2.5 py-1 text-[11px] font-semibold text-white">부동산</span>
        <p className="text-xs font-semibold text-neutral-400">블로그</p>
      </div>
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
      <div className="mt-2 flex h-16 items-end gap-1.5 rounded-xl border border-neutral-100 bg-white px-3 py-2">
        {trend.map((h, i) => (
          <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === trend.length - 1 ? ACCENT : "rgba(63,145,255,0.22)" }} />
        ))}
      </div>
      <p className="mt-auto text-center text-[11px] text-neutral-400">카테고리만 고르면, 데이터가 쫙</p>
    </div>
  );
}

// 03 키워드 → 글
function SceneWrite() {
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-semibold text-neutral-400">글쓰기</p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-700">전세 사기 예방법</span>
        <span className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white" style={{ background: ACCENT }}>글 생성</span>
      </div>
      <div className="mt-4 space-y-2.5">
        <Bar w="100%" d={0.1} /><Bar w="93%" d={0.35} /><Bar w="97%" d={0.6} /><Bar w="70%" d={0.85} />
      </div>
      <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check /></span>
        <p className="text-[13px] font-semibold text-emerald-800">칼럼급 글이 발행됐어요</p>
      </div>
      <p className="mt-auto text-center text-[11px] text-neutral-400">키워드 하나 → 검색에 강한 글, 자동으로</p>
    </div>
  );
}

// 04 수익
function SceneEarn() {
  const bars = [26, 34, 31, 46, 58, 70, 88];
  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-400">이번 달</p>
        <p className="text-[11px] font-semibold text-emerald-600">▲ 검색 유입</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
          <p className="text-[10px] text-neutral-400">방문자</p>
          <p className="whitespace-nowrap text-base font-extrabold tracking-tight text-neutral-900">12,480</p>
        </div>
        <div className="rounded-xl bg-[#3f91ff]/10 px-3 py-2.5">
          <p className="text-[10px] text-[#2f7fe6]">예상 광고수익</p>
          <p className="whitespace-nowrap text-base font-extrabold tracking-tight text-[#2f7fe6]">₩312,000</p>
        </div>
      </div>
      <div className="mt-4 flex h-28 items-end justify-between gap-1.5">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === bars.length - 1 ? ACCENT : "rgba(63,145,255,0.22)" }} />
        ))}
      </div>
      <p className="mt-auto text-center text-[11px] text-neutral-400">글이 쌓이고, 검색이 수익이 돼요</p>
    </div>
  );
}

const SCENES = [
  { k: "open", tag: "개설", t: "버튼 몇 번이면, 블로그 완성.", d: "호스팅·설치 몰라도 돼요. 워드프레스가 바로 생겨요.", Screen: SceneOpen },
  { k: "data", tag: "데이터", t: "카테고리만 고르면, 데이터가 쫙.", d: "고른 분야의 뜨는 키워드·트렌드가 한눈에 펼쳐져요.", Screen: SceneData },
  { k: "write", tag: "글쓰기", t: "키워드 하나, 칼럼급 글.", d: "검색에 강한 글이 자동으로 써지고 발행돼요.", Screen: SceneWrite },
  { k: "earn", tag: "수익", t: "글이 쌓이고, 수익으로.", d: "검색 유입이 광고 수익으로 이어지는 흐름까지.", Screen: SceneEarn },
];

/* ───────────── 폰 프레임 (밝은 톤) ───────────── */
function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[236px] sm:w-[278px]">
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[#3f91ff]/15 blur-[55px]" />
      <div className="rounded-[2.4rem] border border-neutral-200 bg-white p-2.5 shadow-[0_34px_80px_-26px_rgba(49,130,246,0.45)]">
        <div className="relative h-[416px] overflow-hidden rounded-[1.9rem] bg-neutral-50 sm:h-[476px]">{children}</div>
      </div>
    </div>
  );
}

/* ───────────── 스크롤 고정 여정 스토리 ───────────── */
function Story() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      setActive(Math.min(SCENES.length - 1, Math.max(0, Math.floor(v * SCENES.length))));
    });
    return () => unsub();
  }, [scrollYProgress]);

  const S = SCENES[active];
  const Screen = S.Screen;

  return (
    <section ref={ref} className="relative h-[420vh] bg-gradient-to-b from-[#f0f6ff] to-white">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center px-6">
        {/* 단계 레일 */}
        <div className="mb-7 flex items-center gap-1.5 sm:gap-2.5">
          {SCENES.map((st, i) => (
            <div key={st.k} className="flex items-center gap-1.5 sm:gap-2.5">
              <span className={`text-[11px] font-bold tracking-tight transition-colors sm:text-xs ${i === active ? "text-[#2f7fe6]" : "text-neutral-300"}`}>{st.tag}</span>
              {i < SCENES.length - 1 && <span className={`h-px w-4 transition-colors sm:w-7 ${i < active ? "bg-[#3f91ff]" : "bg-neutral-200"}`} />}
            </div>
          ))}
        </div>

        {/* 헤드라인 */}
        <div className="mb-7 h-[5.5rem] text-center sm:mb-9 sm:h-[6rem]">
          <AnimatePresence mode="wait">
            <motion.div key={S.k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">{`0${active + 1} / 04`}</p>
              <h2 className="font-pretendard mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">{S.t}</h2>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-neutral-500 sm:text-sm">{S.d}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 제품 화면 */}
        <AnimatePresence mode="wait">
          <motion.div key={S.k} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.98 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <Phone><Screen /></Phone>
          </motion.div>
        </AnimatePresence>
      </div>
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

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand />
          <button onClick={toSignup} className="rounded-xl bg-[#3f91ff] px-4 py-2 text-sm font-semibold text-white transition active:scale-95 hover:opacity-90">사전신청</button>
        </div>
      </header>

      {/* 히어로 */}
      <section className="hero-aurora relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-16 text-center sm:pt-20">
          <p className="mono-rise inline-flex items-center gap-1.5 rounded-full border border-[#3f91ff]/20 bg-[#3f91ff]/5 px-3 py-1 text-xs font-semibold text-[#2f7fe6]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3f91ff]" /> 곧 오픈 · 사전신청 받는 중
          </p>
          <h1 className="font-pretendard mono-rise mono-d1 mt-5 text-[1.95rem] font-extrabold leading-[1.18] tracking-tight sm:text-[3.4rem]" style={{ wordBreak: "keep-all" }}>
            워드프레스 블로그,<br />시작이 어려웠죠?<br /><span className="text-[#3f91ff]">이제 버튼 몇 번이면 됩니다.</span>
          </h1>
          <p className="mono-rise mono-d2 mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base" style={{ wordBreak: "keep-all" }}>
            개설부터 글쓰기, 애드센스 수익화까지 — 막히는 데 없이 한 흐름으로.
          </p>
          <div className="mono-rise mono-d3 mt-9">
            <button onClick={toSignup} className="rounded-2xl bg-[#3f91ff] px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_34px_-10px_rgba(63,145,255,0.7)] transition active:scale-95 hover:opacity-90">
              사전신청하고 보너스 크레딧 받기
            </button>
            <p className="mt-3 text-xs text-neutral-400">무료 3편으로 시작 · 월 구독 아님</p>
          </div>
          <motion.div className="mono-rise mono-d4 mt-12" animate={{ y: [0, -9, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
            <Phone><SceneWrite /></Phone>
          </motion.div>
          <div className="mono-rise mono-d5 mt-10 flex justify-center">
            <motion.span animate={{ y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} className="text-neutral-300">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            </motion.span>
          </div>
        </div>
      </section>

      {/* 스크롤 여정 */}
      <Story />

      {/* 가격 — 밝고 명확 */}
      <section className="bg-white">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center sm:py-24">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3f91ff]">부담 없이</p>
            <h2 className="font-pretendard mt-4 text-2xl font-extrabold tracking-tight sm:text-4xl">딱 쓴 만큼만, 크레딧.</h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
                <p className="text-3xl font-extrabold tracking-tight text-neutral-900"><CountUp to={3} />편</p>
                <p className="mt-1 text-sm text-neutral-500">무료로 먼저</p>
              </div>
              <div className="rounded-3xl border-2 border-[#3f91ff]/30 bg-[#3f91ff]/5 p-6">
                <p className="text-3xl font-extrabold tracking-tight text-[#2f7fe6]">₩<CountUp to={11000} /></p>
                <p className="mt-1 text-sm text-neutral-600">크레딧 충전 · 글 쓸 때 차감</p>
              </div>
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
                <p className="text-3xl font-extrabold tracking-tight text-neutral-900">0원</p>
                <p className="mt-1 text-sm text-neutral-500">안 쓰면 안 나가요</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-6 text-xs leading-relaxed text-neutral-400">호스팅·도메인 비용은 별도이고, 우리 매출이 아니에요. 글 관련 크레딧만 받아요.</p>
          </Reveal>
        </div>
      </section>

      {/* 신청 + 충전 의향 검증 */}
      <section ref={signupRef} className="scroll-mt-20 border-t border-neutral-200/70 bg-gradient-to-b from-white to-[#f0f6ff]">
        <div className="mx-auto max-w-xl px-6 py-20 text-center sm:py-24">
          <h2 className="font-pretendard text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">가장 먼저 시작하고,<br />보너스 크레딧 받으세요.</h2>
          <p className="mt-4 text-sm text-neutral-500">사전신청자에겐 오픈 시 추가 크레딧을 드려요.</p>

          {/* 충전 의향 미니 설문 */}
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="text-sm font-semibold text-neutral-700">11,000원 크레딧, 충전해서 쓸 의향이 있나요?</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {WILLING.map((w) => {
                const on = willing === w.k;
                return (
                  <button key={w.k} onClick={() => setWilling(on ? null : w.k)} className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition active:scale-95 ${on ? "border-[#3f91ff] bg-[#3f91ff] text-white shadow-[0_0_18px_rgba(63,145,255,0.4)]" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"}`}>
                    {w.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 border-t border-neutral-100 pt-5">
              <WaitlistForm source="start-lp" extra={{ v: "start-lp", willing: willing ?? "unspecified" }} />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
