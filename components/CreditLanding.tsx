"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Brand from "@/components/Brand";
import SiteFooter from "@/components/SiteFooter";
import LandingIntro from "@/components/LandingIntro";
import WaitlistForm from "@/components/WaitlistForm";

const ACCENT = "#3f91ff";

// 초보가 멈추는 지점(공감) — 짧은 독백
const WALLS = [
  { icon: "🌐", q: "“호스팅·도메인, 뭘 골라야 하지?”" },
  { icon: "🧩", q: "“워드프레스 설치부터 막혀요.”" },
  { icon: "🚫", q: "“애드센스가 자꾸 반려돼요.”" },
  { icon: "✍️", q: "“뭘 써야 검색에 잡히죠?”" },
];

// 끊김 없는 한 줄기 흐름 — 시네마틱 타임라인
const JOURNEY = [
  { n: "01", icon: "🏗", t: "블로그 개설", d: "버튼 한 번으로 내 워드프레스가 생겨요. 호스팅·설정은 안 보이게." },
  { n: "02", icon: "✍️", t: "글쓰기", d: "키워드만 넣으면, 사람이 쓴 듯한 검색 최적화 글이 완성돼요." },
  { n: "03", icon: "✅", t: "애드센스 승인", d: "승인이 잘 나는 구조로. 막히면 다음 한 걸음을 짚어줘요." },
  { n: "04", icon: "💰", t: "수익화", d: "검색 유입 → 광고 수익까지, 중간에 끊기지 않게 끝까지." },
];

// 마지막 CTA — 현재 단계 선택(인터랙티브 + 검증 인사이트)
const STAGES = [
  { key: "before", label: "아직 시작 전", line: "좋아요. 빈손에서, 개설부터 같이 시작해요." },
  { key: "opened", label: "개설은 했어요", line: "다음은 ‘승인 잘 나는 글’이에요. 거기부터 같이." },
  { key: "writing", label: "글은 쓰는 중", line: "글까지 쓰고 계시는군요. 승인·수익화로 밀어드릴게요." },
  { key: "stuck", label: "승인·수익이 막혀요", line: "거기서 많이들 멈춰요. 그 지점을 같이 뚫어요." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3f91ff]">{children}</p>;
}

/** 시네마틱 여정 타임라인 — 스크롤에 따라 선이 그려지고 노드가 켜진다. */
function Journey() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.55"] });
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="relative mx-auto max-w-xl">
      {/* 연결선(배경 + 채워지는 그라데이션) */}
      <div className="absolute bottom-3 left-[21px] top-3 w-0.5 bg-white/10" />
      <motion.div
        style={{ scaleY: fill, transformOrigin: "top" }}
        className="absolute bottom-3 left-[21px] top-3 w-0.5 bg-gradient-to-b from-[#3f91ff] via-[#5aa0ff] to-[#9cc4ff]"
      />
      <ul className="space-y-7">
        {JOURNEY.map((s, i) => (
          <motion.li
            key={s.n}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-12%" }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="relative pl-16"
          >
            <span className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#3f91ff]/15 text-lg shadow-[0_0_24px_rgba(63,145,255,0.35)] backdrop-blur">
              {s.icon}
            </span>
            <p className="text-[11px] font-bold tracking-widest text-[#7db8ff]">{s.n}</p>
            <h3 className="mt-0.5 text-lg font-bold tracking-tight text-white">{s.t}</h3>
            <p className="mt-1 text-sm leading-relaxed text-white/55">{s.d}</p>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export default function CreditLanding({ introSeen = false }: { introSeen?: boolean }) {
  const [stage, setStage] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const selected = STAGES.find((s) => s.key === stage) ?? null;

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <LandingIntro skip={introSeen} />

      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand />
          <button
            onClick={scrollToForm}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition active:scale-95 hover:bg-neutral-700"
          >
            사전신청
          </button>
        </div>
      </header>

      {/* 히어로 */}
      <section className="hero-aurora relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-20 text-center sm:pt-28">
          <div className="mono-rise"><Eyebrow>워드프레스 · 애드센스 수익화 가이드</Eyebrow></div>
          <h1 className="font-pretendard mono-rise mono-d1 mt-5 text-[2rem] font-extrabold leading-[1.12] tracking-tight sm:text-6xl">
            블로그로 버는 길,<br />
            <span className="text-[#3f91ff]">처음이라도 막힘없이.</span>
          </h1>
          <p className="mono-rise mono-d2 mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-base">
            개설 · 글쓰기 · 애드센스 승인 · 수익화까지 —<br />막히는 지점마다, 옆에서 같이 끝까지.
          </p>
          <div ref={formRef} className="mono-rise mono-d3 mt-10 scroll-mt-24">
            <WaitlistForm source="credit-lp" />
          </div>
          <p className="mono-rise mono-d4 mt-5 text-xs font-medium text-neutral-400">
            월 구독 아니에요 · <span className="text-neutral-600">무료 3편</span>으로 시작 · 필요할 때만 충전
          </p>

          {/* 스크롤 힌트 */}
          <div className="mono-rise mono-d5 mt-14 flex justify-center">
            <motion.span
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="text-neutral-300"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            </motion.span>
          </div>
        </div>
      </section>

      {/* 공감 — 멈추는 지점 */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">이런 데서 멈추지 않았나요?</h2>
          <p className="mt-3 text-center text-sm text-neutral-500">수익화는 어렵지 않아요. <b className="text-neutral-700">막히는 지점</b>이 너무 많을 뿐.</p>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {WALLS.map((w, i) => (
              <motion.div
                key={w.q}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm"
              >
                <span className="text-2xl">{w.icon}</span>
                <p className="text-[15px] font-medium text-neutral-700">{w.q}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 시네마틱 여정 — 다크 */}
      <section className="relative overflow-hidden bg-[#0b1220]">
        {/* 라디얼 글로우 */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#3f91ff]/25 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#3f91ff]/10 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 sm:py-28">
          <div className="text-center">
            <Eyebrow>하나의 흐름</Eyebrow>
            <h2 className="font-pretendard mt-4 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              흩어진 네 단계를,<br />끊김 없는 한 줄기로.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/50">
              다른 곳은 다 따로따로예요. 우리는 다음 ‘한 걸음’만 보여줘요.
            </p>
          </div>
          <div className="mt-14">
            <Journey />
          </div>
        </div>
      </section>

      {/* 차별점 — 흩어진 걸 하나로 */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-20 sm:py-24">
          <div className="grid items-center gap-8 sm:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-neutral-200 bg-neutral-50 p-7"
            >
              <p className="text-xs font-semibold text-neutral-400">기존엔</p>
              <ul className="mt-3 space-y-2 text-sm text-neutral-500">
                <li>· 호스팅 검색하다 하루</li>
                <li>· 테마·설정에서 또 막힘</li>
                <li>· 애드센스 반려, 이유도 모름</li>
                <li>· 글쓰기는 외주 아니면 포기</li>
              </ul>
              <p className="mt-4 text-sm font-semibold text-neutral-700">→ 결국 시작도 못 함</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border-2 border-[#3f91ff]/30 bg-[#3f91ff]/5 p-7"
            >
              <p className="text-xs font-semibold text-[#3f91ff]">AteFlo는</p>
              <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                <li className="font-medium">· 개설부터 버튼 한 번</li>
                <li className="font-medium">· 승인 잘 나는 글·구조</li>
                <li className="font-medium">· 막히면 다음 한 걸음 안내</li>
                <li className="font-medium">· 수익화까지 한 흐름</li>
              </ul>
              <p className="mt-4 text-sm font-bold text-[#2f7fe6]">→ 오늘 시작, 끝까지 완주</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 크레딧 안심 */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center sm:py-24">
          <Eyebrow>부담 없이</Eyebrow>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">매달 빠져나가는 구독료, 없어요.</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-neutral-500">
            <b className="text-neutral-700">무료 3편</b>으로 충분히 경험하고, 마음에 들면 그때 충전해요.
            쓴 만큼만 차감, <b className="text-neutral-700">안 쓰면 0원.</b>
          </p>
        </div>
      </section>

      {/* 최종 CTA — 단계 선택(인터랙티브) + 신청 */}
      <section className="relative overflow-hidden bg-[#0b1220]">
        <div className="pointer-events-none absolute -bottom-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#3f91ff]/20 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-xl px-6 py-24 text-center sm:py-28">
          <h2 className="font-pretendard text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            지금, 어디쯤이세요?
          </h2>
          <p className="mt-3 text-sm text-white/50">선택하면 딱 그 지점부터 안내해드려요.</p>

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {STAGES.map((s) => {
              const on = stage === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setStage(on ? null : s.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${
                    on
                      ? "border-[#3f91ff] bg-[#3f91ff] text-white shadow-[0_0_22px_rgba(63,145,255,0.5)]"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* 선택 시 맞춤 한 줄 (레이아웃 흔들림 방지 위해 높이 예약) */}
          <div className="mt-4 min-h-[1.5rem]">
            {selected && (
              <motion.p
                key={selected.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-sm font-medium text-[#9cc4ff]"
              >
                {selected.line}
              </motion.p>
            )}
          </div>

          <div className="mt-7">
            <WaitlistForm source="credit-lp-cta" extra={{ v: "credit-lp", stage: stage ?? "unspecified" }} />
          </div>
          <p className="mt-5 text-xs text-white/40">
            오픈 시 가장 먼저 초대 · 초기 신청자 혜택 준비 중
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
