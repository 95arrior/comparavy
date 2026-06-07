import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { PLANS, formatKRW } from "@/lib/plans";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import HeroInput from "@/components/HeroInput";
import DemoStream from "@/components/DemoStream";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — 발행할 가치가 있는 AI 블로그 글` },
  description: SITE_DESCRIPTION,
};

const STEPS = [
  { n: "01", title: "키워드랑 내 생각 입력", body: "쓰고 싶은 키워드를 넣으세요. 내 경험이나 의견이 있으면 한 줄 보태면 됩니다. 그게 남들 글이랑 갈리는 지점입니다." },
  { n: "02", title: "써지는 걸 실시간으로", body: "글이 한 줄씩 써지는 걸 그대로 봅니다. 구조는 매번 바뀌고, 없는 정보는 안 넣습니다." },
  { n: "03", title: "워드프레스에 바로", body: "보고 고친 다음 버튼 하나로 내 사이트에 올립니다. 복사해서 붙여넣는 일 없습니다." },
];

const FEATURES = [
  { title: "그냥 껍데기 도구가 아닙니다", body: "키워드 넣으면 글 뱉는 도구는 많습니다. AteFlo는 글을 어떻게 쓰는지부터 직접 짰습니다. 구조도, 관점도, 정직함도 거기서 나옵니다." },
  { title: "같은 키워드, 매번 다른 글", body: "남들이랑 같은 키워드로 써도 글 구조가 안 겹칩니다. 복붙한 듯한 양산글이 안 나옵니다." },
  { title: "없는 얘기 안 지어냅니다", body: "가짜 통계나 후기, 안 해본 경험을 만들지 않습니다. 내 블로그에 그대로 올려도 탈 없습니다." },
  { title: "AI 티 안 나는 한국어", body: "'알아보겠습니다' 같은 뻔한 말투랑 번역투를 뺍니다. 읽는 사람은 AI가 썼는지 모릅니다." },
  { title: "SEO는 알아서 잡아줍니다", body: "제목, 메타, FAQ, 소제목까지 한국 구글에 맞게 자동으로. SEO 따로 공부 안 해도 됩니다." },
  { title: "쓰는 걸로 안 끝납니다", body: "워드프레스에 버튼 하나로 발행까지. 글 만들어 놓고 올리느라 고생하는 일 없습니다." },
];

export default async function Home() {
  let user = null;
  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    user = (await supabase.auth.getUser()).data.user;
  }
  const ctaHref = user ? "/dashboard" : "/login";
  const ctaLabel = user ? "대시보드로 이동" : "무료로 시작";

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-base font-semibold tracking-tight">{SITE_NAME}</span>
          <nav className="hidden items-center gap-8 text-sm text-neutral-500 md:flex">
            <Link href="#how" className="transition hover:text-neutral-900">사용법</Link>
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

      {/* Hero — 도구 우선: 입력창 + 실시간 데모를 첫 화면에 */}
      <section className="hero-aurora relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-24 text-center sm:pt-32">
          <p className="mono-rise text-sm font-medium tracking-tight text-neutral-400">워드프레스 블로그를 위한 AI 글쓰기</p>
          <h1 className="font-pretendard mono-rise mono-d1 mt-5 text-4xl font-bold leading-[1.15] tracking-tight sm:text-6xl">
            글쓰기, 키워드 하나면 끝
          </h1>
          <p className="mono-rise mono-d2 mx-auto mt-6 max-w-md text-base leading-relaxed text-neutral-500">
            어떤 구조로, 어떤 흐름으로 글을 써야 좋은 글이 되는지. 우리는 그 답을 알고, 키워드 하나로 글을 씁니다.
          </p>
          <div className="mono-rise mono-d3 mt-10">
            <HeroInput loggedIn={!!user} />
            <p className="mt-4 text-sm text-neutral-400">무료 3편 · 카드 등록 없음</p>
          </div>
          <div className="mono-rise mono-d3 mt-12">
            <DemoStream />
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="max-w-3xl text-2xl font-medium leading-snug tracking-tight text-neutral-500 sm:text-3xl">
            “그냥 ChatGPT 쓰면 되잖아요.” 네, 천 단어는 누구나 1분이면 뽑습니다. 근데 다 비슷하게 생겨서
            <span className="text-neutral-900"> 검색에 안 잡히는 게 문제죠</span>. 우리가 신경 쓴 건 속도가 아니라 어떻게 쓰느냐입니다. 올렸을 때 사람이 끝까지 읽고, 구글이 띄워주는 글.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 border-t border-neutral-200/70">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">이렇게 씁니다</h2>
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
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">왜 그냥 ChatGPT 안 쓰고요?</h2>
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
          <p className="mt-3 text-neutral-500">무료 3편 먼저 써보세요. 괜찮으면 그때 프로. 외주 글 한 편 값이면 한 달 50편입니다.</p>
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
                  {plan.price === 0 ? "무료로 시작" : "프로 선택"}
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
            AI 글 양산해봤자<br />검색엔 안 뜹니다.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-neutral-500">
            무료 3편 써보고 차이가 없으면 안 쓰셔도 됩니다.
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
