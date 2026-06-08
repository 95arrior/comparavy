import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { PLANS, formatKRW } from "@/lib/plans";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import HeroInput from "@/components/HeroInput";
import DemoStream from "@/components/DemoStream";
import ServiceIntro from "@/components/ServiceIntro";
import DashboardClient from "@/components/dashboard/DashboardClient";
import type { Article } from "@/components/dashboard/types";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — 발행할 가치가 있는 AI 블로그 글` },
  description: SITE_DESCRIPTION,
};

export const dynamic = "force-dynamic";

export default async function Home() {
  let user = null;
  let supabase = null;
  if (hasSupabaseEnv()) {
    supabase = await createSupabaseServerClient();
    user = (await supabase.auth.getUser()).data.user;
  }

  // 로그인하면 홈이 곧 작업공간 — '대시보드로 이동'하는 뎁스를 없앤다
  if (user && supabase) {
    const row = await ensureUserRow(supabase, user.id);
    const { data: articles } = await supabase
      .from("articles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const { data: conn } = await supabase
      .from("wordpress_connections")
      .select("site_url")
      .eq("user_id", user.id)
      .maybeSingle();
    return (
      <DashboardClient
        email={user.email ?? ""}
        plan={row.plan}
        articlesUsed={row.articles_used}
        articlesLimit={row.articles_limit}
        initialArticles={(articles ?? []) as Article[]}
        wpSiteUrl={conn?.site_url ?? null}
      />
    );
  }

  // 비로그인 → 마케팅 랜딩
  const ctaHref = "/login";
  const ctaLabel = "무료로 시작";

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

      <ServiceIntro />

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
