import Brand from "@/components/Brand";
import DemoStream from "@/components/DemoStream";
import ServiceIntro from "@/components/ServiceIntro";
import SiteFooter from "@/components/SiteFooter";
import LandingIntro from "@/components/LandingIntro";
import WaitlistForm from "@/components/WaitlistForm";
import ProductShowcase from "@/components/ProductShowcase";
import CalendarShowcase from "@/components/CalendarShowcase";
import FeatureGrid from "@/components/FeatureGrid";

const WALLS = [
  { t: "방향", q: "“이거 맞게 하는 걸까? 헛수고면 어쩌지.”", d: "뭘 써야 할지 모른 채 시간만 흘러요." },
  { t: "꾸준함", q: "“6개월을 매일 쓰라고? 못 버텨.”", d: "검색에 잡히려면 꾸준해야 하는데 그게 제일 어렵죠." },
  { t: "시간", q: "“수백 시간 써서 치킨값도 안 되면….”", d: "글 한 편에 몇 시간씩, 본업도 바쁜데." },
];

/** 출시 전 사전 등록(웨이트리스트) 랜딩. 앱은 잠그고, 기대감·페인·기능으로 이메일을 모은다. */
export default function WaitlistLanding() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <LandingIntro />

      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Brand />
          <span className="rounded-full bg-neutral-900/5 px-3 py-1 text-xs font-medium text-neutral-500">곧 오픈</span>
        </div>
      </header>

      {/* 히어로 */}
      <section className="hero-aurora relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-24 text-center sm:pt-28">
          <p className="mono-rise inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3f91ff]" /> 곧 오픈 · 사전 등록 받는 중
          </p>
          <h1 className="font-pretendard mono-rise mono-d1 mt-5 whitespace-nowrap text-[1.7rem] font-bold leading-[1.15] tracking-tight sm:whitespace-normal sm:text-6xl">
            글쓰기, 키워드 하나면 끝
          </h1>
          <p className="mono-rise mono-d2 mx-auto mt-6 max-w-lg text-sm leading-relaxed text-neutral-500 sm:text-base">
            블로그로 돈 벌려면 글이 꾸준히 쌓여야 하는데, 글쓰기가 제일 큰 벽이죠.<br />
            키워드 하나면 글이 완성돼요. 다듬고, 워드프레스에 <b className="text-neutral-700">발행·예약</b>까지 한 곳에서 끝나요.
          </p>
          <div className="mono-rise mono-d3 mt-9">
            <WaitlistForm source="hero" />
          </div>
          <div className="mono-rise mono-d3 mt-12">
            <DemoStream />
          </div>
        </div>
      </section>

      {/* 공감 — 속마음 + 3개의 벽 */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
          <p className="text-center text-xl font-bold leading-snug tracking-tight sm:text-2xl">
            “블로그로 돈 번다더니…<br />글 한 편 쓰는 것부터 막막하네.”
          </p>
          <p className="mt-4 text-center text-sm text-neutral-500">블로그 수익화의 진짜 적은 ‘글솜씨’가 아니라 이 세 가지예요.</p>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {WALLS.map((w) => (
              <div key={w.t} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <span className="rounded-lg bg-neutral-900/5 px-2.5 py-1 text-xs font-semibold text-neutral-600">{w.t}</span>
                <p className="mt-4 text-base font-semibold leading-snug tracking-tight">{w.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{w.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-base font-semibold tracking-tight">그 벽, AteFlo가 넘게 해드려요.</p>
        </div>
      </section>

      {/* 실제 화면 목업 — 무엇을 하는 서비스인지 한눈에 */}
      <ProductShowcase />

      {/* 예약 발행 캘린더 — 스케줄 관리 어필 */}
      <CalendarShowcase />

      {/* 이런 것까지 자동 — 기능 breadth를 한눈에 */}
      <FeatureGrid />

      {/* 기능 쇼케이스 (재활용) */}
      <ServiceIntro waitlist />

      {/* 정직 — 과장 없이 */}
      <section className="border-t border-neutral-200/70">
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">솔직하게 말할게요</h2>
          <p className="mt-5 text-base leading-relaxed text-neutral-500">
            방문자 수는 약속하지 않아요. 그건 시간과 꾸준함, 구글에 달린 거니까요.<br />
            대신 <b className="text-neutral-800">좋은 글을 빠르고 꾸준히 쌓게</b> 해드려요. 성공 확률을 높이는 도구예요.
          </p>
        </div>
      </section>

      {/* 마지막 CTA */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            가장 먼저,<br />써보실 분을 찾아요.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-neutral-500">오픈하면 메일로 가장 먼저 초대해드릴게요.</p>
          <div className="mt-10">
            <WaitlistForm source="bottom" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
