"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import Brand from "@/components/Brand";
import SiteFooter from "@/components/SiteFooter";
import LandingIntro from "@/components/LandingIntro";
import WaitlistForm from "@/components/WaitlistForm";

const ACCENT = "#3f91ff";

/* ───────────── 제품 목업 화면 4종 (폰 안에 들어감) ───────────── */

function Bar({ w, d }: { w: string; d: number }) {
  return <div className="mock-gen-bar h-2.5 rounded-full bg-neutral-200" style={{ width: w, animationDelay: `${d}s` }} />;
}

// 01 개설
function ScreenSetup() {
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-semibold text-neutral-400">새 블로그</p>
      <p className="mt-1 text-[15px] font-bold tracking-tight text-neutral-900">어떤 블로그를 만들까요?</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["강아지", "재테크", "여행", "육아"].map((c, i) => (
          <span key={c} className={`rounded-full px-3 py-1.5 text-xs font-medium ${i === 0 ? "bg-[#3f91ff] text-white" : "bg-neutral-100 text-neutral-500"}`}>{c}</span>
        ))}
      </div>
      <button className="mt-5 w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(63,145,255,0.6)]" style={{ background: ACCENT }}>
        내 블로그 만들기
      </button>
      <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-emerald-800">우리집댕댕이.com</p>
          <p className="text-[11px] text-emerald-600">워드프레스 개설 완료</p>
        </div>
      </div>
      <p className="mt-auto text-center text-[11px] text-neutral-400">호스팅·설치는 안 보이게, 버튼 한 번으로</p>
    </div>
  );
}

// 02 글쓰기
function ScreenWrite() {
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-semibold text-neutral-400">글쓰기</p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-700">강아지 분리불안 해결법 🐶</span>
        <span className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white" style={{ background: ACCENT }}>글 생성</span>
      </div>
      <div className="mt-4 space-y-2.5">
        <Bar w="100%" d={0.1} />
        <Bar w="92%" d={0.35} />
        <Bar w="97%" d={0.6} />
        <Bar w="68%" d={0.85} />
      </div>
      <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </span>
        <p className="text-[13px] font-semibold text-emerald-800">블로그에 발행됐어요</p>
      </div>
      <p className="mt-auto text-center text-[11px] text-neutral-400">키워드 하나 → 사람이 쓴 듯한 SEO 글</p>
    </div>
  );
}

// 03 애드센스 승인
function ScreenApprove() {
  const items = ["글 10편 발행", "필수 페이지(소개·문의)", "사이트맵 제출", "검색 노출 시작"];
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-semibold text-neutral-400">애드센스 승인 준비</p>
      <p className="mt-1 text-[15px] font-bold tracking-tight text-neutral-900">승인 조건, 하나씩 통과</p>
      <ul className="mt-4 space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2.5 rounded-xl border border-neutral-100 bg-neutral-50/70 px-3 py-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <span className="text-[13px] font-medium text-neutral-700">{it}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#3f91ff]/10 py-3 text-sm font-bold text-[#2f7fe6]">
        🎉 애드센스 승인 완료
      </div>
    </div>
  );
}

// 04 수익화
function ScreenEarn() {
  const bars = [28, 36, 33, 48, 60, 72, 88];
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-semibold text-neutral-400">이번 달 광고 수익</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-[28px] font-extrabold tracking-tight text-neutral-900">₩312,000</span>
        <span className="text-xs font-semibold text-emerald-600">▲ 검색 유입</span>
      </p>
      <div className="mt-5 flex h-32 items-end justify-between gap-1.5">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === bars.length - 1 ? ACCENT : "rgba(63,145,255,0.25)" }} />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-neutral-50 px-3.5 py-3 text-[12px]">
        <span className="text-neutral-500">검색 노출</span>
        <span className="font-bold text-neutral-900">매일 ↑</span>
      </div>
      <p className="mt-auto text-center text-[11px] text-neutral-400">유입이 광고 수익이 되는 흐름까지</p>
    </div>
  );
}

const STAGES = [
  { k: "setup", tag: "개설", t: "블로그, 버튼 한 번으로.", d: "호스팅·설치 몰라도 돼요. 내 워드프레스가 생겨요.", Screen: ScreenSetup },
  { k: "write", tag: "글쓰기", t: "키워드만 넣으면, 글 완성.", d: "사람이 쓴 듯한 검색 최적화 글이 바로 발행돼요.", Screen: ScreenWrite },
  { k: "approve", tag: "애드센스", t: "승인까지, 끝까지 안내.", d: "승인 잘 나는 구조로. 막히면 다음 한 걸음을 짚어줘요.", Screen: ScreenApprove },
  { k: "earn", tag: "수익화", t: "검색이, 수익이 되는 순간.", d: "유입이 광고 수익으로 이어지는 흐름까지 한 번에.", Screen: ScreenEarn },
];

/* ───────────── 폰 프레임 ───────────── */
function Phone({ children, glow = true }: { children: React.ReactNode; glow?: boolean }) {
  return (
    <div className="relative mx-auto w-[238px] sm:w-[280px]">
      {glow && <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[#3f91ff]/30 blur-[70px]" />}
      <div className="rounded-[2.4rem] border border-white/12 bg-[#0e1626] p-2.5 shadow-[0_40px_90px_-25px_rgba(63,145,255,0.6)]">
        <div className="relative h-[420px] overflow-hidden rounded-[1.9rem] bg-white sm:h-[480px]">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ───────────── 스크롤 고정 제품 스토리 ───────────── */
function PinnedStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      setActive(Math.min(STAGES.length - 1, Math.max(0, Math.floor(v * STAGES.length))));
    });
    return () => unsub();
  }, [scrollYProgress]);

  const S = STAGES[active];
  const Screen = S.Screen;

  return (
    <section ref={ref} className="relative h-[420vh] bg-[#0b1220]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3f91ff]/12 blur-[140px]" />
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center px-6">
        {/* 단계 레일 — 어떤 흐름인지 한눈에 + 진행 표시 */}
        <div className="mb-8 flex items-center gap-1.5 sm:gap-2.5">
          {STAGES.map((st, i) => (
            <div key={st.k} className="flex items-center gap-1.5 sm:gap-2.5">
              <span className={`text-[11px] font-semibold tracking-tight transition-colors sm:text-xs ${i === active ? "text-white" : "text-white/30"}`}>
                {st.tag}
              </span>
              {i < STAGES.length - 1 && <span className={`h-px w-4 transition-colors sm:w-7 ${i < active ? "bg-[#3f91ff]" : "bg-white/15"}`} />}
            </div>
          ))}
        </div>

        {/* 헤드라인 (크로스페이드) */}
        <div className="mb-8 h-[5.5rem] text-center sm:mb-10 sm:h-[6rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={S.k}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3f91ff]">{`0${active + 1} / 04`}</p>
              <h2 className="font-pretendard mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">{S.t}</h2>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-white/55 sm:text-sm">{S.d}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 제품 화면 (크로스페이드) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={S.k}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Phone><Screen /></Phone>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ───────────── 페이지 ───────────── */
export default function CreditLanding({ introSeen = false }: { introSeen?: boolean }) {
  const [stage, setStage] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white antialiased">
      <LandingIntro skip={introSeen} />

      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0b1220]/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="[&_*]:!text-white"><Brand /></span>
          <button onClick={scrollToForm} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0b1220] transition active:scale-95 hover:bg-white/90">
            사전신청
          </button>
        </div>
      </header>

      {/* 히어로 — 다크 시네마틱 + 떠 있는 제품 */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#3f91ff]/25 blur-[130px]" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-16 text-center sm:pt-20">
          <p className="mono-rise text-xs font-semibold uppercase tracking-[0.2em] text-[#7db8ff]">워드프레스 · 애드센스 수익화</p>
          <h1 className="font-pretendard mono-rise mono-d1 mt-5 text-[2.1rem] font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            블로그로 버는 일,<br /><span className="text-[#3f91ff]">버튼 몇 번이면 돼요.</span>
          </h1>
          <p className="mono-rise mono-d2 mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-white/55 sm:text-base">
            개설 · 글쓰기 · 애드센스 승인 · 수익화까지 —<br />하나의 흐름으로, 처음이라도 끝까지.
          </p>

          <motion.div
            className="mono-rise mono-d3 mt-12"
            animate={{ y: [0, -9, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Phone><ScreenWrite /></Phone>
          </motion.div>

          <div ref={formRef} className="mono-rise mono-d4 mt-12 scroll-mt-24">
            <div className="[&_input]:text-neutral-900">
              <WaitlistForm source="credit-lp" />
            </div>
          </div>
          <p className="mono-rise mono-d5 mt-5 text-xs font-medium text-white/40">
            월 구독 아니에요 · <span className="text-white/70">무료 3편</span>으로 시작 · 안 쓰면 0원
          </p>

          <div className="mono-rise mono-d5 mt-12 flex justify-center">
            <motion.span animate={{ y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} className="text-white/30">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            </motion.span>
          </div>
        </div>
      </section>

      {/* 스크롤 고정 제품 스토리 — 이게 핵심 */}
      <PinnedStory />

      {/* 차별점 한 줄 */}
      <section className="bg-[#0b1220]">
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3f91ff]">왜 다른가</p>
          <h2 className="font-pretendard mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            다른 곳은 다 따로따로.<br />여긴 <span className="text-[#3f91ff]">한 흐름.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/50">
            호스팅 찾고, 테마 고르고, 승인 검색하고, 글은 외주 주고… 그러다 시작도 못 했죠.
            AteFlo는 다음 ‘한 걸음’만 보여줘요.
          </p>
        </div>
      </section>

      {/* 크레딧 안심 */}
      <section className="border-y border-white/8 bg-[#0e1626]">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7db8ff]">부담 없이</p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">매달 빠져나가는 구독료, 없어요.</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
            <b className="text-white">무료 3편</b>으로 충분히 경험하고, 마음에 들면 그때 충전.
            쓴 만큼만 차감, <b className="text-white">안 쓰면 0원.</b>
          </p>
        </div>
      </section>

      {/* 최종 CTA */}
      <section className="relative overflow-hidden bg-[#0b1220]">
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[#3f91ff]/20 blur-[130px]" />
        <div className="relative z-10 mx-auto max-w-xl px-6 py-24 text-center sm:py-28">
          <h2 className="font-pretendard text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            이제, 당신 차례예요.
          </h2>
          <p className="mt-4 text-sm text-white/50">지금 어디쯤이세요? (선택하면 거기서부터 안내해드려요)</p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              { key: "before", label: "아직 시작 전" },
              { key: "opened", label: "개설은 했어요" },
              { key: "writing", label: "글은 쓰는 중" },
              { key: "stuck", label: "승인·수익이 막혀요" },
            ].map((s) => {
              const on = stage === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setStage(on ? null : s.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${
                    on ? "border-[#3f91ff] bg-[#3f91ff] text-white shadow-[0_0_22px_rgba(63,145,255,0.5)]" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            <div className="[&_input]:text-neutral-900">
              <WaitlistForm source="credit-lp-cta" extra={{ v: "credit-lp", stage: stage ?? "unspecified" }} />
            </div>
          </div>
          <p className="mt-5 text-xs text-white/40">오픈 시 가장 먼저 초대 · 초기 신청자 혜택 준비 중</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
