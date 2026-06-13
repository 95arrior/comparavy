import Brand from "@/components/Brand";
import SiteFooter from "@/components/SiteFooter";
import LandingIntro from "@/components/LandingIntro";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/Reveal";
import ProductShowcase from "@/components/ProductShowcase";
import Diagnosis from "@/components/Diagnosis";

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

// "워드프레스, 몰라도 돼요" — 안심 카피(작동 기능 아님)
const EASE = [
  { t: "블로그가 없어도 돼요", d: "만들기부터 도와드려요. 빈손으로 시작해도 괜찮아요." },
  { t: "설정도, 호스팅도", d: "복잡한 건 안 보이게. 버튼 몇 번이면 돼요." },
];

/** 출시 전 사전 등록 랜딩. 진단(시뮬레이터) → 결과·신청 → 공감 → 차별점 → 안심 → 증명 → 신청. */
export default function WaitlistLanding({ introSeen = false }: { introSeen?: boolean }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-neutral-900 antialiased">
      <LandingIntro skip={introSeen} />

      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 sm:px-6">
          <Brand />
          <a
            href="#signup"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-neutral-900 px-4 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-neutral-700"
          >
            <span className="dot-pulse h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
            사전 신청
          </a>
        </div>
      </header>

      {/* ① 히어로 — 진단 입구 */}
      <section className="hero-aurora relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-3xl px-5 pb-14 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
          <p className="mono-rise inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} /> 곧 오픈 · 30초 무료 진단
          </p>
          <h1
            className="font-pretendard mono-rise mono-d1 mt-5 font-bold tracking-tight"
            style={{ fontSize: "clamp(26px, 6.6vw, 52px)", lineHeight: 1.3, wordBreak: "keep-all" }}
          >
            내 블로그,<br />월 얼마까지 가능할까?
          </h1>
          <p
            className="mono-rise mono-d2 mx-auto mt-5 max-w-md text-neutral-500"
            style={{ fontSize: "clamp(15px, 4vw, 18px)", lineHeight: 1.6, wordBreak: "keep-all" }}
          >
            30초 진단하면, 네이버와 워드프레스<br />수익 차이를 알려드려요.
          </p>
          <div className="mono-rise mono-d3 mt-9 flex flex-col items-center gap-4">
            <a
              href="#diagnosis"
              className="inline-flex min-h-[56px] items-center justify-center rounded-2xl px-9 text-base font-bold text-white shadow-sm transition active:scale-[0.97]"
              style={{ background: ACCENT }}
            >
              무료로 진단하기
            </a>
            <a href="#more" className="text-sm text-neutral-400 transition hover:text-neutral-600">
              제품 먼저 둘러볼게요 ↓
            </a>
          </div>
        </div>
      </section>

      {/* ②③ 진단 시뮬레이터 + 결과·신청 */}
      <section id="diagnosis" className="scroll-mt-16 border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-20">
          <Diagnosis />
        </div>
      </section>

      {/* ④ 페인 포인트 — 공감 (둘러보기 도착점) */}
      <section id="more" className="scroll-mt-16 border-t border-neutral-200/70">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-20">
          <Reveal>
            <h2 className="text-center font-bold tracking-tight" style={{ fontSize: "clamp(22px, 5.2vw, 34px)", lineHeight: 1.3, wordBreak: "keep-all" }}>
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
                  <p className="mt-3 font-semibold tracking-tight" style={{ fontSize: "clamp(16px, 4.4vw, 18px)", lineHeight: 1.4, wordBreak: "keep-all" }}>{w.q}</p>
                  <p className="mt-2 text-neutral-500" style={{ fontSize: "14px", lineHeight: 1.6, wordBreak: "keep-all" }}>{w.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ 왜 다른가 — 차별점 */}
      <section className="border-t border-neutral-200/70">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-20">
          <Reveal>
            <h2 className="text-center font-bold tracking-tight" style={{ fontSize: "clamp(22px, 5.2vw, 34px)", lineHeight: 1.3, wordBreak: "keep-all" }}>
              “AI로 쓰면 다 똑같은 거 아니에요?”
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center text-neutral-500" style={{ fontSize: "clamp(15px, 4vw, 17px)", lineHeight: 1.6, wordBreak: "keep-all" }}>
              빠른 건 다들 해요. 문제는 <b style={{ color: ACCENT }}>검색에 안 걸린다</b>는 것. 우리가 신경 쓴 건 속도가 아니라 어떻게 쓰느냐예요.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-3 sm:gap-4 sm:grid-cols-3">
            {DIFFS.map((d, i) => (
              <Reveal key={d.t} delay={i * 80}>
                <div className="h-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: ACCENT }}>{i + 1}</span>
                  <p className="mt-4 font-bold tracking-tight text-neutral-900" style={{ fontSize: "clamp(17px, 4.6vw, 19px)", lineHeight: 1.35, wordBreak: "keep-all" }}>{d.t}</p>
                  <p className="mt-2 text-neutral-500" style={{ fontSize: "15px", lineHeight: 1.6, wordBreak: "keep-all" }}>{d.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ⑥ 워드프레스, 몰라도 돼요 — 안심(카피만) */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-20">
          <Reveal>
            <p className="text-center text-sm font-semibold tracking-tight" style={{ color: ACCENT }}>처음이어도 괜찮아요</p>
            <h2 className="mt-3 text-center font-bold tracking-tight" style={{ fontSize: "clamp(22px, 5.2vw, 34px)", lineHeight: 1.3, wordBreak: "keep-all" }}>
              워드프레스, 몰라도 돼요
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center text-neutral-500" style={{ fontSize: "clamp(15px, 4vw, 17px)", lineHeight: 1.6, wordBreak: "keep-all" }}>
              어려운 건 우리가 다 맡을게요. 글에만 집중하면 돼요.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-3 sm:gap-4 sm:grid-cols-2">
            {EASE.map((e, i) => (
              <Reveal key={e.t} delay={i * 80}>
                <div className="flex h-full items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: ACCENT }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <div>
                    <p className="font-bold tracking-tight text-neutral-900" style={{ fontSize: "clamp(16px, 4.4vw, 18px)", lineHeight: 1.4, wordBreak: "keep-all" }}>{e.t}</p>
                    <p className="mt-1.5 text-neutral-500" style={{ fontSize: "14px", lineHeight: 1.6, wordBreak: "keep-all" }}>{e.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ⑦ 증명 — 실제 화면 목업 */}
      <ProductShowcase />

      {/* ⑧ 마무리 — 사전신청 (진단 건너뛴 사람용 출구) */}
      <section id="signup" className="scroll-mt-16 border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-2xl px-5 py-14 text-center sm:px-6 sm:py-24">
          <Reveal>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(24px, 6vw, 44px)", lineHeight: 1.3, wordBreak: "keep-all" }}>
              가장 먼저,<br />써보실 분을 찾아요.
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-neutral-500" style={{ fontSize: "clamp(15px, 4vw, 17px)", lineHeight: 1.6 }}>
              오픈하면 가장 먼저 초대해드릴게요.
            </p>
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
