import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { isAdminEmail, getAdminStats } from "@/lib/adminStats";
import HeroInput from "@/components/HeroInput";
import DemoStream from "@/components/DemoStream";
import Brand from "@/components/Brand";
import LandingNav from "@/components/LandingNav";
import ServiceIntro from "@/components/ServiceIntro";
import SiteFooter from "@/components/SiteFooter";
import DashboardClient from "@/components/dashboard/DashboardClient";
import type { Article } from "@/components/dashboard/types";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — 키워드 하나로 끝내는 블로그 글쓰기` },
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
    const isAdmin = isAdminEmail(user.email);
    const adminStats = isAdmin ? await getAdminStats() : null;
    return (
      <DashboardClient
        email={user.email ?? ""}
        plan={row.plan}
        articlesUsed={row.articles_used}
        articlesLimit={row.articles_limit}
        subStatus={row.sub_status}
        initialArticles={(articles ?? []) as Article[]}
        wpSiteUrl={conn?.site_url ?? null}
        isAdmin={isAdmin}
        adminStats={adminStats}
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
        <div className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/"><Brand /></Link>
          <div className="absolute left-1/2 -translate-x-1/2">
            <LandingNav />
          </div>
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
          <h1 className="font-pretendard mono-rise mono-d1 mt-5 whitespace-nowrap text-[1.65rem] font-bold leading-[1.15] tracking-tight sm:whitespace-normal sm:text-6xl">
            글쓰기, 키워드 하나면 끝
          </h1>
          <p className="mono-rise mono-d2 mx-auto mt-6 max-w-md text-sm leading-relaxed text-neutral-500 sm:text-base">
            어떤 구조로, 어떤 흐름으로 글을 써야 좋은 글이 되는지.<br />우리는 그 답을 알고, 키워드 하나로 글을 씁니다.
          </p>
          <div className="mono-rise mono-d3 mt-10">
            <HeroInput loggedIn={!!user} />
          </div>
          <div className="mono-rise mono-d3 mt-12">
            <DemoStream />
          </div>
        </div>
      </section>

      <ServiceIntro />

      {/* CTA */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center">
          <h2 className="mx-auto max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            좋은 글인지,<br />직접 확인해보세요.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-neutral-500">
            키워드 하나만 넣어보면 알 수 있어요.
          </p>
          <Link href={ctaHref} className="mt-10 inline-block rounded-full bg-neutral-900 px-8 py-4 text-sm font-medium text-white transition hover:bg-neutral-700">
            {ctaLabel}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
