import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { PLANS, formatKRW } from "@/lib/plans";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import WordCycle from "@/components/WordCycle";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — 발행할 가치가 있는 AI 블로그 글` },
  description: SITE_DESCRIPTION,
};

const STEPS = [
  { n: "01", title: "키워드 + 내 관점 입력", body: "노출하고 싶은 키워드를 넣고, 내 경험이나 관점이 있으면 한 줄 더하세요. 그게 남들과 다른 글의 시작입니다." },
  { n: "02", title: "눈앞에서 써지는 글", body: "AI가 글을 써 내려가는 과정을 실시간으로 봅니다. 매번 다른 구조로, 지어내는 정보 없이." },
  { n: "03", title: "워드프레스 1클릭 발행", body: "검토·수정하고 클릭 한 번으로 내 사이트에 발행. 복사·붙여넣기도, 정리 작업도 없습니다." },
];

const FEATURES = [
  { title: "막연한 자동생성이 아닙니다", body: "‘키워드 넣으면 끝’인 도구는 널렸습니다. 우리는 ‘어떻게 쓰는가’ — 구조·관점·정직성 — 를 로직으로 설계했습니다. AI를 시키는 게 아니라, AI로 제대로 쓰는 것." },
  { title: "같은 키워드, 매번 다른 글", body: "1,000명이 같은 키워드로 생성해도 구조가 겹치지 않게, 다양화 엔진이 매번 다른 골격을 고릅니다. 복붙 양산글이 아닙니다." },
  { title: "지어내지 않습니다", body: "가짜 통계·후기·경험을 만들지 않습니다. 내 블로그에 내 이름으로 발행해도 안전합니다." },
  { title: "사람이 쓴 듯한 한국어", body: "‘알아보겠습니다’ 같은 AI 상투어와 번역투를 걷어냅니다. 읽는 사람은 AI 글인지 모릅니다." },
  { title: "한국 구글 SEO 내장", body: "제목·메타·FAQ·소제목 구조까지 검색 노출에 맞춰 자동으로. 따로 공부할 필요 없습니다." },
  { title: "발행까지가 제품입니다", body: "글 생성에서 끝나지 않습니다. 워드프레스 1클릭 발행 — 운영자의 손이 가장 덜 가도록 편의성까지 설계했습니다." },
];

export default async function Home() {
  let user = null;
  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    user = (await supabase.auth.getUser()).data.user;
  }
  const ctaHref = user ? "/dashboard" : "/login";
  const ctaLabel = user ? "대시보드로 이동" : "시작하기";

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-base font-semibold tracking-tight">{SITE_NAME}</span>
          <nav className="hidden items-center gap-8 text-sm text-neutral-500 md:flex">
            <Link href="#how" className="transition hover:text-neutral-900">작동 방식</Link>
            <Link href="#features" className="transition hover:text-neutral-900">기능</Link>
            <Link href="/pricing" className="transition hover:text-neutral-900">요금</Link>
          </nav>
          <div className="flex items-center gap-5">
            {!user && <Link href="/login" className="hidden text-sm text-neutral-500 transition hover:text-neutral-900 sm:block">로그인</Link>}
            <Link href={ctaHref} className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700">
              {ctaLabel}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-aurora relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-28 pt-28 text-center sm:pt-44">
          <p className="mono-rise text-sm font-medium tracking-tight text-neutral-400">AI에게 시키는 게 아니라, AI로 제대로 씁니다.</p>
          <h1 className="mono-rise mono-d1 mt-6 text-5xl font-semibold leading-[1.12] tracking-tight sm:text-7xl">
            <span className="block">대부분의 AI 글은</span>
            <span className="block"><WordCycle /></span>
            <span className="block text-neutral-400">이건 다릅니다.</span>
          </h1>
          <p className="mono-rise mono-d2 mx-auto mt-8 max-w-xl text-lg leading-relaxed text-neutral-500">
            ChatGPT에 ‘써줘’ 하면 다 비슷하고, 티 나고, 검색에 안 뜹니다. {SITE_NAME}는 글 쓰는 방식을 직접 설계했습니다 — 매번 다른 구조로, 지어내지 않고, 한국 구글 검색에 맞게. 그리고 워드프레스에 1클릭으로 발행합니다.
          </p>
          <div className="mono-rise mono-d3 mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
            <Link href={ctaHref} className="rounded-full bg-neutral-900 px-7 py-3.5 text-center text-sm font-medium text-white transition hover:bg-neutral-700">
              {ctaLabel}
            </Link>
            <Link href="/pricing" className="rounded-full border border-neutral-300 bg-white/70 px-7 py-3.5 text-center text-sm font-medium text-neutral-900 backdrop-blur transition hover:border-neutral-900">
              요금 보기
            </Link>
          </div>
          <p className="mono-rise mono-d4 mt-5 text-sm text-neutral-400">무료로 시작 · 카드 등록 불필요</p>
        </div>
      </section>

      {/* Manifesto */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="max-w-3xl text-2xl font-medium leading-snug tracking-tight text-neutral-500 sm:text-3xl">
            “그냥 ChatGPT 쓰면 되지 않나요?” 맞습니다, 천 단어는 누구나 몇 초면 뽑습니다. 문제는 그 글이 다 비슷하고, AI 티가 나고,
            <span className="text-neutral-900"> 구글 검색에 뜨지 않는다는 것</span>. 우리는 ‘얼마나 빨리’가 아니라 ‘어떻게 쓰는가’를 설계했습니다 — 발행해서 트래픽과 수익이 되는 글이 되도록.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 border-t border-neutral-200/70">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">작동 방식</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-white p-8">
                <span className="text-sm font-medium text-neutral-300">{s.n}</span>
                <h3 className="mt-4 text-lg font-medium tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">왜 그냥 ChatGPT가 아니라 {SITE_NAME}인가</h2>
          <div className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <h3 className="text-base font-medium tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-neutral-200/70">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">요금</h2>
          <p className="mt-3 text-neutral-500">무료 3편으로 충분히 확인한 뒤, 본격 발행은 프로로. 외주 글 1편 값이면 한 달치입니다.</p>
          <div className="mt-12 grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2">
            {[PLANS.free, PLANS.pro].map((plan) => (
              <div key={plan.key} className="flex flex-col bg-white p-8">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-medium tracking-tight">{plan.name}</h3>
                  {plan.highlight && <span className="text-xs text-neutral-400">가장 인기</span>}
                </div>
                <p className="mt-3">
                  <span className="text-4xl font-semibold tracking-tight">
                    {plan.price === 0 ? "무료" : formatKRW(plan.price)}
                  </span>
                  {plan.price !== 0 && <span className="text-sm text-neutral-400">/월</span>}
                </p>
                <p className="mt-3 text-sm text-neutral-500">월 {plan.articles}편 · 글당 최대 {plan.maxWords.toLocaleString()}자</p>
                <Link
                  href="/pricing"
                  className={`mt-8 rounded-full px-5 py-2.5 text-center text-sm font-medium transition ${
                    plan.highlight ? "bg-neutral-900 text-white hover:bg-neutral-700" : "border border-neutral-300 text-neutral-900 hover:border-neutral-900"
                  }`}
                >
                  {plan.price === 0 ? "시작하기" : "프로 선택"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center">
          <h2 className="mx-auto max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            AI한테 ‘써줘’ 하지 말고,<br />검색에 뜨는 글을 쓰게 하세요.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-neutral-500">
            남들과 똑같은 AI 글로는 상위 노출도, 광고 수익도 없습니다. 무료 3편으로 차이를 직접 확인하세요.
          </p>
          <Link href={ctaHref} className="mt-10 inline-block rounded-full bg-neutral-900 px-8 py-4 text-sm font-medium text-white transition hover:bg-neutral-700">
            {ctaLabel}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200/70">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-neutral-900">{SITE_NAME}</span>
          <nav className="flex flex-wrap gap-6">
            <Link href="/pricing" className="transition hover:text-neutral-900">요금</Link>
            <Link href="/terms" className="transition hover:text-neutral-900">이용약관</Link>
            <Link href="/privacy" className="transition hover:text-neutral-900">개인정보처리방침</Link>
            <Link href="/refund" className="transition hover:text-neutral-900">환불정책</Link>
          </nav>
          <span className="text-xs text-neutral-400">© {new Date().getFullYear()} {SITE_NAME}</span>
        </div>
      </footer>
    </div>
  );
}
