import type { Metadata } from "next";
import HomepageBuilderModulePreview from "@/components/dashboard/HomepageBuilderModulePreview";
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
  title: "홈페이지 만들기 모듈 미리보기 | AteFlo Kit Studio",
  description:
    "가게나 서비스를 처음 보는 사람이 이해하고 문의할 수 있도록 홈페이지 첫 문장, 서비스 소개, CTA, FAQ, SEO 제목/설명을 정리하는 모듈을 미리 확인해보세요.",
  robots: {
    index: false,
    follow: false,
  },
};

export const revalidate = 0;

export default function HomepageBuilderModulePage() {
  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="online-sales-kit" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                홈페이지 만들기 모듈
              </p>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                홈페이지 만들기
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                가게나 서비스를 처음 보는 사람이 바로 이해하고 문의할 수 있도록
                첫 화면과 기본 문구를 정리하는 모듈입니다.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">
              잠금 미리보기
            </span>
          </div>

          <p className="mt-7 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm leading-7 text-slate-700">
            구매 후에는 가게 정보와 서비스 내용을 입력하고, 홈페이지 첫 문장,
            서비스 소개문, 문의 버튼 문구, FAQ, SEO 제목/설명을 순서대로 만들
            수 있어요.
          </p>
        </section>

        <HomepageBuilderModulePreview
          ctaHref={kitCtaHref}
          hasCheckout={hasKitCheckout}
        />
      </div>
    </main>
  );
}
