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
  { n: "01", title: "키워드 입력", body: "노출하고 싶은 주제를 입력하세요. 관점이 있다면 함께 적어도 됩니다." },
  { n: "02", title: "작성 · 최적화", body: "FAQ, 메타, 관점까지 갖춘 사람이 쓴 듯한 SEO 구조의 완성된 글을 만듭니다." },
  { n: "03", title: "워드프레스 발행", body: "검토하고 다듬은 뒤 클릭 한 번으로 내 사이트에 발행합니다." },
];

const FEATURES = [
  { title: "사람이 쓴 듯한 글", body: "실제 작가처럼 다시 씁니다 — 리듬이 살아 있고, 목소리가 있고, AI 티가 나지 않습니다." },
  { title: "기본은 정직함", body: "가짜 통계도, 지어낸 후기도, 거짓 경험도 없습니다. 내 이름으로 발행해도 안전합니다." },
  { title: "SEO 기본 탑재", body: "제목·메타·FAQ·깔끔한 구조까지 신경 쓰지 않아도 최적화됩니다." },
  { title: "진짜 관점", body: "내 관점을 더하면 글이 그것을 주장합니다 — 누구나 쓸 수 있는 무난한 요약이 아니라." },
  { title: "원클릭 워드프레스", body: "한 번 연결하면 바로 발행하거나 예약합니다. 복사·붙여넣기도, 정리 작업도 없습니다." },
  { title: "오래가는 속도", body: "자연스러운 주기로 글을 예약해, 스팸처럼 몰아치지 않고 사이트를 꾸준히 키웁니다." },
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
          <p className="mono-rise text-sm font-medium tracking-tight text-neutral-400">AI 콘텐츠, 다시 쓰다.</p>
          <h1 className="mono-rise mono-d1 mt-6 text-5xl font-semibold leading-[1.12] tracking-tight sm:text-7xl">
            <span className="block">대부분의 AI 글은</span>
            <span className="block"><WordCycle /></span>
            <span className="block text-neutral-400">이건 다릅니다.</span>
          </h1>
          <p className="mono-rise mono-d2 mx-auto mt-8 max-w-xl text-lg leading-relaxed text-neutral-500">
            AI 글쓰기는 보통 뻔하고 믿기 어렵습니다. {SITE_NAME}는 그것을 다르게 씁니다 — 더 날카로운 통찰, 진짜 관점, 그리고 정직함으로. 검색에 노출되고 신뢰할 수 있는 글을 만듭니다.
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
            천 단어를 몇 초 만에 만드는 건 누구나 합니다. 그것을
            <span className="text-neutral-900"> 정확하고, 독창적이고, 읽을 가치 있게</span> 만드는 사람은 거의 없습니다. 그 간극이
            AI 콘텐츠의 전부이자, 우리가 풀려는 문제입니다.
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
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">무엇이 다른가</h2>
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
          <p className="mt-3 text-neutral-500">무료로 시작하고, 본격적으로 발행할 때 업그레이드하세요.</p>
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
            남들과 똑같은 글, 이제 그만 발행하세요.
          </h2>
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
