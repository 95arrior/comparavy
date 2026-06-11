import Brand from "@/components/Brand";
import DemoStream from "@/components/DemoStream";
import SiteFooter from "@/components/SiteFooter";
import LandingIntro from "@/components/LandingIntro";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";
import ProductShowcase from "@/components/ProductShowcase";

const ACCENT = "#3182F6";

// 페인 포인트(공감) — 따옴표 독백 + 한 줄 설명
const WALLS = [
  { t: "방향", q: "“이거 맞게 하는 걸까?”", d: "뭘 써야 할지 모른 채 시간만 흘러요." },
  { t: "꾸준함", q: "“6개월을 매일 쓰라고?”", d: "검색에 잡히려면 꾸준해야 하는데 그게 제일 어렵죠." },
  { t: "시간", q: "“한 편에 몇 시간씩…”", d: "본업도 바쁜데 글까지 붙잡고 있어요." },
];

// 차별점 — 기존 방식 한계 다음에 오는 우리 답
const DIFFS = [
  { t: "찍어내지 않아요", d: "같은 키워드도 매번 다른 구조로 써요. 검색은 똑같은 글을 싫어하거든요." },
  { t: "프롬프트 없이, 한 번에", d: "이렇게 써줘 저렇게 써줘 할 필요 없어요. 키워드 하나면 돼요." },
  { t: "워드프레스까지 한 번에", d: "복붙 없이, 버튼 하나로 바로 올라가요." },
];

const PLAN_FEATURES = ["워드프레스 1클릭 발행", "SEO 자동 최적화 (제목·메타·FAQ)", "매번 다른 구조", "AI 말투 제거"];

/** 출시 전 사전 등록(웨이트리스트) 랜딩. 페인 인식 후크 → 공감 → 차별점 → 증명 → 신청(끝 1곳). */
export default function WaitlistLanding({ introSeen = false }: { introSeen?: boolean }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <LandingIntro skip={introSeen} />

      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
          <Brand />
          <a
            href="#signup"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-neutral-700"
          >
            <span className="dot-pulse h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
            사전 신청
          </a>
        </div>
      </header>

      {/* 1. 히어로 — 페인 인식 후크 */}
      <section className="hero-aurora relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
          <p className="mono-rise inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} /> 곧 오픈 · 사전 신청 받는 중
          </p>
          <h1
            className="font-pretendard mono-rise mono-d1 mt-5 font-bold tracking-tight"
            style={{ fontSize: "clamp(26px, 6.6vw, 52px)", lineHeight: 1.3 }}
          >
            블로그로 돈 벌려다,<br />글쓰기에서 멈췄나요?
          </h1>
          <p
            className="mono-rise mono-d2 mx-auto mt-5 max-w-lg text-neutral-500"
            style={{ fontSize: "clamp(15px, 4vw, 18px)", lineHeight: 1.6 }}
          >
            키워드 하나면 <b style={{ color: ACCENT }}>검색에 걸리는 글</b>이 써져요. 다듬고, 워드프레스 발행까지 한 곳에서.
          </p>
          <div className="mono-rise mono-d3 mt-10">
            <DemoStream />
          </div>
        </div>
      </section>

      {/* 2. 페인 포인트 — 공감 */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-20">
          <Reveal>
            <h2 className="text-center font-bold tracking-tight" style={{ fontSize: "clamp(22px, 5.2vw, 34px)", lineHeight: 1.3 }}>
              “블로그로 돈 번다더니…<br />글 한 편 쓰는 것부터 막막하네.”
            </h2>
            <p className="mt-4 text-center text-neutral-500" style={{ fontSize: "clamp(14px, 4vw, 16px)", lineHeight: 1.6 }}>
              글솜씨 문제가 아니에요.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-3 sm:gap-4 sm:grid-cols-3">
            {WALLS.map((w, i) => (
              <Reveal key={w.t} delay={i * 80}>
                <div className="h-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                  <span className="rounded-lg bg-neutral-900/5 px-2.5 py-1 text-xs font-semibold text-neutral-600">{w.t}</span>
                  <p className="mt-3 font-semibold tracking-tight" style={{ fontSize: "clamp(16px, 4.4vw, 18px)", lineHeight: 1.4 }}>{w.q}</p>
                  <p className="mt-2 text-neutral-500" style={{ fontSize: "14px", lineHeight: 1.6 }}>{w.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 왜 다른가 — 기존 방식 한계 + 우리 차별점 */}
      <section className="border-t border-neutral-200/70">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-20">
          <Reveal>
            <h2 className="text-center font-bold tracking-tight" style={{ fontSize: "clamp(22px, 5.2vw, 34px)", lineHeight: 1.3 }}>
              “AI로 쓰면 다 똑같은 거 아니에요?”
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center text-neutral-500" style={{ fontSize: "clamp(15px, 4vw, 17px)", lineHeight: 1.6 }}>
              빠른 건 다들 해요. 문제는 <b style={{ color: ACCENT }}>검색에 안 걸린다</b>는 것. 우리가 신경 쓴 건 속도가 아니라 어떻게 쓰느냐예요.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-3 sm:gap-4 sm:grid-cols-3">
            {DIFFS.map((d, i) => (
              <Reveal key={d.t} delay={i * 80}>
                <div className="h-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                  <p className="font-bold tracking-tight" style={{ fontSize: "clamp(17px, 4.6vw, 19px)", lineHeight: 1.35, color: ACCENT }}>{d.t}</p>
                  <p className="mt-2.5 text-neutral-600" style={{ fontSize: "15px", lineHeight: 1.6 }}>{d.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 증명 — 실제 화면 목업 (데스크탑 2×2 / 모바일 탭) */}
      <ProductShowcase />

      {/* 5. 가격 + CTA */}
      <section id="signup" className="scroll-mt-20 border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-2xl px-5 py-14 text-center sm:px-6 sm:py-24">
          <Reveal>
            <p className="text-neutral-500" style={{ fontSize: "clamp(15px, 4vw, 17px)", lineHeight: 1.6 }}>
              외주 글 한 편 값이면, 여기선 <b className="text-neutral-900">한 달 30편</b>.
            </p>
            {/* 요금 카드 */}
            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-left shadow-sm">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight">₩29,900</span>
                <span className="text-sm text-neutral-400">/ 월 · 30편</span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-neutral-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: ACCENT }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-12 font-bold tracking-tight" style={{ fontSize: "clamp(24px, 6vw, 44px)", lineHeight: 1.3 }}>
              가장 먼저,<br />써보실 분을 찾아요.
            </h2>
            <div className="mt-8">
              <WaitlistForm source="bottom" />
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
