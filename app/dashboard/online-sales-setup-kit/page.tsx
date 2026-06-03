import type { Metadata } from "next";
import ProductDashboardPreview from "@/components/product/ProductDashboardPreview";
import ProductShell from "@/components/product/ProductShell";
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
    <ProductShell>
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold text-teal-700">
          대시보드 미리보기
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
          AI 온라인 영업 세팅 키트
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
          온라인에서 손님을 받을 준비를 버튼으로 하나씩 정리하는 실행
          패키지입니다.
        </p>
        <span className="mt-5 inline-flex rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">
          미리보기
        </span>
      </section>

      <ProductDashboardPreview
        ctaHref={kitCtaHref}
        hasCheckout={hasKitCheckout}
      />
    </ProductShell>
  );
}
