"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";
import GlassIcon from "@/components/GlassIcon";
import SiteFooter from "@/components/SiteFooter";
import { CREDIT_PACKS } from "@/lib/creditPacks";

// ★네이버 수익화 랜딩 — 광고 문구가 아니라 '제품이 직접 시연'하는 무대.
//  심리 흐름: 욕망(수익) → 체험(글감 고르면 눈앞에서 글이 써짐) → 신뢰(네이버 로직·정직 카피)
//           → 진짜 FOMO(메이트 베타 시한·키워드 선점) → 해소(트라이얼 1,900원).
//  정직 원칙: 가짜 카운터·수익 보장 금지. 시한과 선점은 사실만.

const BLUE = "#1D75F7";

/* ── 데모 데이터 — 실제 엔진 산출 스타일의 샘플(글감 3종 × 발췌) ── */
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
      "<p>[사진: 은행 앱에서 계좌 비교하는 화면]</p>",
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
      "<p>걷다가 한쪽 뒷다리를 살짝 들고 서너 걸음 뛰는 '스킵 보행'이 가장 흔한 신호예요. 아파하지 않아서 놓치기 쉬운데, <b style=\"background-color:#fff3a8\">1~2기엔 통증이 거의 없다는 게 함정</b>입니다.</p>",
      "<p>[사진: 강아지 뒷다리 관찰하는 모습]</p>",
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
      "<p>항공+숙소+식비+교통을 다 합친 금액이에요. 성수기·비수기 차이가 커서 <b style=\"background-color:#fff3a8\">항공권만 30만원 이상 벌어질 수 있으니</b> 시기부터 정하는 게 순서입니다.</p>",
      "<p>[사진: 후쿠오카 시내 이동 지하철 패스]</p>",
      "<h2>항목별로 쪼개면 이렇게</h2>",
      "<p>숙소는 하카타역 근처 기준 1박 9~13만원 선인데…</p>",
    ].join(""),
  },
];

/* ── 타자기 훅 — 랜딩 데모용(글자 단위, 밀리면 가속) ── */
function useTypewriter(html: string, active: boolean) {
  const [n, setN] = useState(0);
  const total = html.replace(/<[^>]+>/g, "").length;
  useEffect(() => {
    setN(0);
    if (!active) return;
    const id = setInterval(() => {
      setN((cur) => {
        if (cur >= total) { clearInterval(id); return cur; }
        return cur + Math.max(1, Math.ceil((total - cur) / 260));
      });
    }, 24);
    return () => clearInterval(id);
  }, [html, active, total]);
  // 태그 보존 절단
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

/* ── 스크롤 등장 래퍼 ── */
function Rise({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); ob.disconnect(); } }, { threshold: 0.2 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(18px)", transition: `opacity 0.6s var(--at-ease) ${delay}ms, transform 0.6s var(--at-ease) ${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── 헤더 ── */
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

/* ── 인터랙티브 데모 — 글감 고르면 눈앞에서 써짐 ── */
function LiveDemo() {
  const [sel, setSel] = useState(0);
  const [run, setRun] = useState(false);
  // ★자동 시연 — 대부분의 방문자는 버튼을 안 누른다. 섹션이 보이면 1번 글감으로 자동 시작.
  const autoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = autoRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setRun(true); ob.disconnect(); }
    }, { threshold: 0.45 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  const topic = DEMO_TOPICS[sel];
  const { shown, done, progress } = useTypewriter(topic.excerpt, run);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (run && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [shown, run]);

  return (
    <div ref={autoRef} className="mx-auto max-w-2xl">
      {/* 글감 3종 — 실제 홈 UI 축소판 */}
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
            <p className="mt-2 text-[12px] font-bold" style={{ color: BLUE }}>{sel === i && run ? (done ? "완성! ✓" : "쓰는 중…") : "이 글감으로 써보기 →"}</p>
          </button>
        ))}
      </div>

      {/* 원고 — 타자기 */}
      <div className={`relative mt-3 overflow-hidden rounded-2xl transition-all duration-500 ${run ? "at-glass-strong" : "at-glass"}`}>
        {!run ? (
          <div className="flex h-[300px] flex-col items-center justify-center px-6 text-center sm:h-[340px]">
            <span className="at-ai-orb" style={{ width: 56, height: 56 }} />
            <p className="mt-5 text-[15px] font-bold text-neutral-700">잠시 후 여기서 글이 써져요</p>
            <p className="mt-1 text-[12.5px] text-neutral-400">진짜로 이 자리에서 글이 써져요</p>
          </div>
        ) : (
          <>
            <div ref={boxRef} className="h-[300px] overflow-y-auto p-5 sm:h-[340px] sm:p-6" style={{ scrollBehavior: "smooth" }}>
              <p className="text-[17px] font-extrabold leading-snug tracking-tight text-neutral-900">{topic.title}</p>
              <div
                className="prose prose-sm prose-neutral mt-3 max-w-none [&_h2]:mt-4 [&_h2]:text-[15px] [&_h2]:font-bold [&_p]:my-2 [&_p]:text-[13.5px] [&_p]:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: shown }}
              />
              {!done && <span className="at-caret" />}
              {done && (
                <div className="at-pop mt-5 rounded-xl bg-[#1D75F7]/[0.06] p-4 text-center">
                  <p className="text-[13.5px] font-bold" style={{ color: BLUE }}>이런 글이 매일 준비돼요 — 복사해서 붙여넣으면 발행 끝</p>
                  <Link href="/login" className="at-press mt-3 inline-block rounded-xl bg-[#1D75F7] px-6 py-2.5 text-[13.5px] font-bold text-white transition hover:opacity-90">
                    내 주제로 시작하기
                  </Link>
                </div>
              )}
            </div>
            {/* 진행 바 */}
            <div className="absolute inset-x-0 top-0 h-0.5 bg-neutral-200/50">
              <div className="h-full transition-all duration-200" style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, ${BLUE}, #38cdf8)` }} />
            </div>
          </>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-neutral-400">실제 에이트플로가 쓴 글의 발췌예요 · 서식(형광펜·소제목·사진 자리)까지 네이버 규격</p>
    </div>
  );
}

/* ── 수익화 길 4종 ── */
const PATHS = [
  { icon: "adpost", tint: "blue" as const, name: "애드포스트", desc: "글에 광고가 붙는 기본 수익. 코스 완주가 곧 신청 준비." },
  { icon: "medal", tint: "amber" as const, name: "네이버 메이트", desc: "AI 브리핑에 인용되면 월 30만원. 스페셜은 최대 1,000만원." },
  { icon: "gift", tint: "rose" as const, name: "체험단·기자단", desc: "방문자가 붙으면 제품·원고료 제안이 들어와요." },
  { icon: "cart", tint: "orange" as const, name: "쿠팡파트너스", desc: "글 속 추천 링크로 수수료. 블로그만 있으면 시작." },
];

export default function NaverLanding() {
  return (
    <div className="at-app-bg min-h-screen text-neutral-900 antialiased">
      <Header />

      {/* ═══ 히어로 ═══ */}
      <section className="mx-auto max-w-3xl px-5 pb-14 pt-28 text-center sm:pt-36">
        <Rise>
          <p className="inline-flex items-center gap-1.5 rounded-full at-glass px-3.5 py-1.5 text-[12px] font-bold text-neutral-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 네이버 블로그 수익화 코스
          </p>
        </Rise>
        <Rise delay={80}>
          <h1 className="mt-5 text-[34px] font-extrabold leading-[1.15] tracking-tight sm:text-[52px]">
            매일 글 하나면,
            <br />
            <span style={{ background: `linear-gradient(90deg, ${BLUE}, #38cdf8)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              네이버가 수익이 돼요
            </span>
          </h1>
        </Rise>
        <Rise delay={160}>
          <p className="mx-auto mt-5 max-w-md text-[15.5px] leading-relaxed text-neutral-500">
            뭘 쓸지 고민하지 마세요. 검색되는 글감부터 완성 글까지
            <br className="hidden sm:block" /> 매일 준비돼요. 복사해서 붙여넣으면 발행 끝.
          </p>
        </Rise>
        <Rise delay={240}>
          <Link href="/login" className="at-press mt-8 inline-block rounded-2xl bg-[#1D75F7] px-9 py-4 text-[16px] font-bold text-white shadow-[0_14px_34px_-12px_rgba(29,117,247,0.55)] transition hover:opacity-90">
            1,900원으로 시작하기
          </Link>
          <p className="mt-3 text-[12px] text-neutral-400">트라이얼 글 3편 · 자동결제 아님</p>
        </Rise>
      </section>

      {/* ═══ 인터랙티브 데모 ═══ */}
      <section className="mx-auto max-w-4xl px-5 pb-20">
        <Rise>
          <p className="text-center text-[12.5px] font-bold" style={{ color: BLUE }}>말보다 증거</p>
          <h2 className="mt-2 text-center text-[24px] font-extrabold tracking-tight sm:text-[30px]">여기서 직접 보세요</h2>
        </Rise>
        <Rise delay={100} className="mt-7">
          <LiveDemo />
        </Rise>
      </section>

      {/* ═══ 3스텝 ═══ */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <Rise><h2 className="text-center text-[24px] font-extrabold tracking-tight sm:text-[30px]">하루 5분, 이게 전부예요</h2></Rise>
        <div className="mt-8 space-y-4">
          {[
            { n: "1", t: "오늘의 글을 눌러요", s: "검색량·경쟁도 실데이터로 고른 '이길 수 있는 글감'이 매일 준비돼요." },
            { n: "2", t: "글이 눈앞에서 완성돼요", s: "네이버 로직(C-Rank·D.I.A.) 규격으로. 원하면 AI 이미지까지 함께." },
            { n: "3", t: "복사해서 붙여넣어요", s: "자동 발행은 계정을 위험하게 해요. 마지막 붙여넣기만 남겨 계정을 지켜요." },
          ].map((x, i) => (
            <Rise key={x.n} delay={i * 120}>
              <div className="flex items-start gap-4 rounded-2xl at-glass p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D75F7]/10 text-[16px] font-extrabold" style={{ color: BLUE }}>{x.n}</span>
                <div>
                  <p className="text-[16.5px] font-extrabold tracking-tight text-neutral-900">{x.t}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-neutral-500">{x.s}</p>
                </div>
              </div>
            </Rise>
          ))}
        </div>
      </section>

      {/* ═══ 수익화 길 — 진짜 FOMO(메이트 시한) ═══ */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <Rise>
          <p className="text-center text-[12.5px] font-bold" style={{ color: BLUE }}>2026년, 판이 바뀌었어요</p>
          <h2 className="mt-2 text-center text-[24px] font-extrabold leading-snug tracking-tight sm:text-[30px]">
            네이버가 블로거에게
            <br />직접 돈을 주기 시작했어요
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-[13.5px] leading-relaxed text-neutral-500">
            네이버 메이트(공식) — AI에 인용되는 글을 쓰면 매달 선정해 지원금을 줘요.
            <b className="text-neutral-700"> 베타는 2026년 12월까지.</b> 먼저 쌓은 블로그가 유리한 게임이에요.
          </p>
        </Rise>
        <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
          {PATHS.map((p, i) => (
            <Rise key={p.name} delay={i * 90}>
              <div className="flex items-start gap-3.5 rounded-2xl at-glass p-5">
                <GlassIcon name={p.icon} tint={p.tint} size={30} />
                <div>
                  <p className="text-[15px] font-extrabold text-neutral-900">{p.name}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-neutral-500">{p.desc}</p>
                </div>
              </div>
            </Rise>
          ))}
        </div>
        <Rise delay={200}>
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-center text-[12.5px] leading-relaxed text-amber-800">
            좋은 글감은 <b>선점 게임</b>이에요 — 그 검색어의 첫 완결 글이 검색을 가져가요. 오늘 쓴 글이 내일의 자리예요.
          </p>
        </Rise>
      </section>

      {/* ═══ 신뢰 — 정직한 차별점 ═══ */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <Rise><h2 className="text-center text-[24px] font-extrabold tracking-tight sm:text-[30px]">그럴듯한 약속 대신, 구조</h2></Rise>
        <div className="mt-8 space-y-3">
          {[
            { t: "실데이터로 고르는 글감", s: "감이 아니라 네이버 검색량과 실제 발행 글 수(경쟁)로 골라요. 발행 후엔 검색에 잡혔는지도 자동 확인해 드려요." },
            { t: "네이버 공식 가이드 기반 글", s: "C-Rank·D.I.A.와 2026 AI 브리핑 가이드(경험·출처·완결) 규격. 계정마다 문체가 달라 같은 글이 없어요." },
            { t: "계정이 안 죽는 방식", s: "자동 발행 프로그램은 이용약관 위반으로 계정을 위험하게 해요. 우리는 복사·붙여넣기 방식만 써요." },
            { t: "방문자·수익을 보장하지 않아요", s: "노출은 네이버가 정해요. 우리가 하는 건 확률을 높이는 준비 — 그래서 더 믿을 수 있어요." },
          ].map((x, i) => (
            <Rise key={x.t} delay={i * 90}>
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
      <section className="mx-auto max-w-2xl px-5 pb-20">
        <Rise>
          <h2 className="text-center text-[24px] font-extrabold tracking-tight sm:text-[30px]">커피 반 잔으로 시작</h2>
          <p className="mt-2 text-center text-[13.5px] text-neutral-500">구독 아님 · 1회 결제 · 크레딧은 유효기간 없이 계정에</p>
        </Rise>
        <div className="mt-8 space-y-2.5">
          {CREDIT_PACKS.map((p, i) => (
            <Rise key={p.key} delay={i * 70}>
              <Link href="/login" className={`at-press relative flex items-center gap-4 rounded-2xl p-5 transition ${p.highlight ? "at-glass-strong ring-2 ring-[#1D75F7]" : "at-glass hover:ring-1 hover:ring-[#1D75F7]/40"}`}>
                {p.highlight && <span className="absolute -top-2.5 left-5 rounded-full bg-[#1D75F7] px-2.5 py-0.5 text-[11px] font-bold text-white">가장 많이 선택</span>}
                <GlassIcon name="credit" tint={p.highlight ? "blue" : "grey"} size={34} />
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

      {/* ═══ FAQ — 솔직 문답 ═══ */}
      <section className="mx-auto max-w-2xl px-5 pb-20">
        <Rise><h2 className="text-center text-[24px] font-extrabold tracking-tight sm:text-[30px]">솔직하게 답할게요</h2></Rise>
        <div className="mt-8 space-y-2.5">
          {[
            { q: "AI가 쓴 글, 네이버가 싫어하지 않나요?", a: "네이버 공식 답변: \"AI 도구 사용 자체는 패널티가 아니에요.\" 걸러지는 건 무분별한 복제 글이에요. 에이트플로는 계정마다 문체가 다르고, 경험·출처·완결 같은 공식 기준에 맞춰 써요. 마지막에 내 경험 한 줄을 얹으면 가장 좋아요." },
            { q: "언제부터 수익이 나요?", a: "보장 못 해요 — 그게 정직한 답이에요. 통상 흐름은 발행 후 2일 안에 검색 반영, 1~2주부터 노출, 승인 신청은 글이 쌓인 뒤예요. 우리는 이 과정 전체를 코스로 안내하고, 검색 반영 여부를 자동으로 확인해 드려요." },
            { q: "자동으로 발행해 주나요?", a: "아니요, 일부러 안 해요. 자동 발행 프로그램은 네이버 약관 위반이라 계정 제한 사유가 돼요. 붙여넣기 한 번은 남겨서 계정을 지키는 게 우리 방식이에요." },
            { q: "블로그가 없어도 되나요?", a: "네. 온보딩에서 개설부터 검색 설정까지 순서대로 같이 해요. 이미 있다면 주소만 연결하면 돼요." },
          ].map((f, i) => (
            <Rise key={f.q} delay={i * 70}>
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
          <div className="rounded-3xl at-glass-strong px-6 py-12 sm:px-12">
            <h2 className="text-[26px] font-extrabold leading-snug tracking-tight sm:text-[34px]">
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
