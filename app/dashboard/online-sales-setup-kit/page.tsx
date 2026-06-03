import type { Metadata } from "next";
import OnlineSalesSetupDashboardPreview from "@/components/dashboard/OnlineSalesSetupDashboardPreview";
import SiteHeader from "@/components/SiteHeader";
import { getKitBySlug, getKitCtaHref, kitHasCheckout } from "@/data/kits";

const KIT_SLUG = "online-sales-setup-kit";
const kit = getKitBySlug(KIT_SLUG);

if (!kit) {
  throw new Error("AI 온라인 영업 세팅 키트 data is missing.");
}

const kitCtaHref = getKitCtaHref(kit);
const hasKitCheckout = kitHasCheckout(kit);

export const metadata: Metadata = {
  title: "AI 온라인 영업 세팅 키트 미리보기 | AteFlo Kit Studio",
  description:
    "온라인에서 손님을 받을 준비를 위한 홈페이지, 네이버플레이스, SNS, 리뷰 답변, 결제·도메인·분석·SEO 세팅 모듈을 미리 확인해보세요.",
  robots: {
    index: false,
    follow: false,
  },
};

export const revalidate = 0;

export default function OnlineSalesSetupDashboardPage() {
  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="online-sales-kit" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                대시보드 미리보기
              </p>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                AI 온라인 영업 세팅 키트
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                온라인에서 손님을 받을 준비를 버튼으로 하나씩 정리하는 실행
                패키지입니다.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">
              미리보기
            </span>
          </div>
        </section>

        <OnlineSalesSetupDashboardPreview
          ctaHref={kitCtaHref}
          hasCheckout={hasKitCheckout}
        />
      </div>
    </main>
  );
}
