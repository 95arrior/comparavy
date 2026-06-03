import type { Metadata } from "next";
import OnlineSalesSetupDiagnostic from "@/components/assembly/OnlineSalesSetupDiagnostic";
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
  title: "온라인 영업 세팅 진단 | AteFlo Kit Studio",
  description:
    "몇 가지 질문에 답하면 지금 먼저 챙기면 좋은 온라인 영업 세팅 3가지를 보여드립니다.",
};

export const revalidate = 0;

export default function OnlineSalesSetupAssemblyPage() {
  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <SiteHeader active="online-sales-kit" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            AI 온라인 영업 세팅 키트
          </p>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            온라인 영업 세팅을 같이 정리해볼게요
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            몇 가지만 답하면, 지금 먼저 챙기면 좋은 세팅을 보여드릴게요.
          </p>
        </section>

        <OnlineSalesSetupDiagnostic
          ctaHref={kitCtaHref}
          hasCheckout={hasKitCheckout}
        />
      </div>
    </main>
  );
}
