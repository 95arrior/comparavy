import type { Metadata } from "next";
import Link from "next/link";
import KitCtaLink from "@/components/kits/KitCtaLink";
import SiteHeader from "@/components/SiteHeader";
import {
  type AteFloKit,
  getKitBySlug,
  getKitCtaHref,
  kitHasCheckout,
} from "@/data/kits";

const KIT_SLUG = "online-sales-setup-kit";
const onlineSalesSetupKit = getKitBySlug(KIT_SLUG);

if (!onlineSalesSetupKit) {
  throw new Error("AI 온라인 영업 세팅 키트 data is missing.");
}

const kit: AteFloKit = onlineSalesSetupKit;

export const metadata: Metadata = {
  title: "AI 온라인 영업 세팅 키트 | AteFlo Kit Studio",
  description:
    "가게나 서비스를 온라인에서 손님 받을 준비 상태로 만들기 위한 문구, 채널 세팅, 홍보 흐름, 결제·도메인·분석·SEO 체크리스트를 순서대로 정리합니다.",
  alternates: {
    canonical: `/kits/${KIT_SLUG}`,
  },
  openGraph: {
    title: "AI 온라인 영업 세팅 키트 | AteFlo Kit Studio",
    description:
      "가게나 서비스를 온라인에서 손님 받을 준비 상태로 만들기 위한 문구, 채널 세팅, 홍보 흐름, 결제·도메인·분석·SEO 체크리스트를 순서대로 정리합니다.",
    url: `/kits/${KIT_SLUG}`,
  },
  twitter: {
    card: "summary",
    title: "AI 온라인 영업 세팅 키트 | AteFlo Kit Studio",
    description:
      "가게나 서비스를 온라인에서 손님 받을 준비 상태로 만들기 위한 문구, 채널 세팅, 홍보 흐름, 결제·도메인·분석·SEO 체크리스트를 순서대로 정리합니다.",
  },
};

export const revalidate = 0;

const primaryCtaClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2";

const secondaryCtaClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2";

export default function OnlineSalesSetupKitPage() {
  const hasCheckout = kitHasCheckout(kit);

  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <SiteHeader active="online-sales-kit" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            AteFlo flagship kit
          </p>
          <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            AI 온라인 영업 세팅 키트
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            가게나 서비스를 온라인에서 손님 받을 준비 상태로 만들기 위해 필요한
            문구, 채널 세팅, 홍보 흐름, 결제·도메인·분석·SEO 체크리스트를
            순서대로 정리해드려요.
          </p>
          <p className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm leading-7 text-slate-700">
            Toss Payments checkout은 추후 연결 예정입니다. checkout URL이 없을
            때는 사전 신청만 사용하며 실제 결제는 발생하지 않습니다.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <KitCtaLink
              href={getKitCtaHref(kit)}
              kitSlug={kit.slug}
              sourcePage="online_sales_setup_kit"
              actionLocation="online_sales_setup_kit_hero"
              hasCheckout={hasCheckout}
              className={primaryCtaClass}
            >
              {hasCheckout ? "전체 패키지 열기" : "사전 신청하기"}
            </KitCtaLink>
            <Link href="/assemble/online-sales-setup-kit" className={secondaryCtaClass}>
              세팅 확인하기
            </Link>
          </div>
        </section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            포함될 모듈
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {kit.modules.map((module) => (
              <article
                key={module.title}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <h3 className="text-base font-semibold text-slate-950">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {module.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="early-access"
          className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            안전한 진행 방식
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            {kit.safetyNotes.map((note) => (
              <li key={note} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
