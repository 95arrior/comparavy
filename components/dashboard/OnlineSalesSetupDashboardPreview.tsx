"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const KIT_SLUG = "online-sales-setup-kit";
const SOURCE_PAGE = "online_sales_setup_dashboard";
const HOMEPAGE_BUILDER_PATH =
  "/dashboard/online-sales-setup-kit/homepage-builder";

const modules = [
  {
    slug: "website",
    name: "홈페이지 만들기",
    summary: "처음 보는 손님이 바로 이해할 소개 흐름을 정리해요.",
    preview:
      "구매 후에는 가게 정보와 서비스 내용을 입력하고, 홈페이지 첫 문장, 서비스 소개문, CTA, FAQ, SEO 제목/설명을 순서대로 만들 수 있어요.",
  },
  {
    slug: "naver-place",
    name: "네이버플레이스 세팅",
    summary: "플레이스에서 필요한 소개와 기본 점검 항목을 챙겨요.",
    preview:
      "구매 후에는 매장 소개, 대표 서비스 설명, 사진 설명, FAQ, 기본 정보 점검 항목을 정리할 수 있어요.",
  },
  {
    slug: "instagram-sns",
    name: "인스타/SNS 홍보 세트",
    summary: "게시글과 스토리에서 말할 주제와 흐름을 잡아요.",
    preview:
      "구매 후에는 게시글 주제, 캡션, CTA, 스토리 문구, 주간 업로드 흐름을 만들 수 있어요.",
  },
  {
    slug: "review-replies",
    name: "리뷰 답변 시스템",
    summary: "상황별 리뷰 답변을 안전한 톤으로 준비해요.",
    preview:
      "구매 후에는 좋은 리뷰, 보통 리뷰, 불만 리뷰에 맞는 답변과 위험 표현 체크리스트를 사용할 수 있어요.",
  },
  {
    slug: "kakao-dm",
    name: "카카오채널/DM 응대 문구",
    summary: "문의가 왔을 때 바로 쓸 응대 흐름을 정리해요.",
    preview:
      "구매 후에는 첫 응대, 가격 문의, 예약 문의, 자주 묻는 질문, 상담 종료 문구를 순서대로 만들 수 있어요.",
  },
  {
    slug: "event-coupon",
    name: "이벤트·쿠폰 문구",
    summary: "혜택을 알릴 때 필요한 제목과 안내문을 준비해요.",
    preview:
      "구매 후에는 이벤트 제목, 쿠폰 안내, 기간 안내, 주의사항, SNS/플레이스용 홍보 문구를 만들 수 있어요.",
  },
  {
    slug: "setup-checklist",
    name: "결제·도메인·분석·SEO 세팅 체크리스트",
    summary: "직접 설치가 필요한 항목을 준비 순서로 점검해요.",
    preview:
      "구매 후에는 토스페이먼츠 준비, 도메인, GA4, Search Console, SEO 제목/설명 기본 점검 순서를 확인할 수 있어요.",
  },
  {
    slug: "seven-day-open-plan",
    name: "7일 오픈 플랜",
    summary: "일주일 동안 무엇을 쓰고 올릴지 순서를 잡아요.",
    preview:
      "구매 후에는 7일 동안 무엇을 만들고, 어디에 올리고, 무엇을 점검해야 하는지 순서대로 볼 수 있어요.",
  },
] as const;

interface DashboardPreviewProps {
  readonly ctaHref: string;
  readonly hasCheckout: boolean;
}

function eventParams(
  actionLocation: string,
  extra: { readonly moduleSlug?: string } = {},
) {
  return {
    kit_slug: KIT_SLUG,
    module_slug: extra.moduleSlug,
    source_page: SOURCE_PAGE,
    action_location: actionLocation,
  };
}

export default function OnlineSalesSetupDashboardPreview({
  ctaHref,
  hasCheckout,
}: DashboardPreviewProps) {
  const [selectedModuleSlug, setSelectedModuleSlug] =
    useState<(typeof modules)[number]["slug"]>("website");
  const [interestRecorded, setInterestRecorded] = useState(false);
  const selectedModule =
    modules.find((module) => module.slug === selectedModuleSlug) ?? modules[0];

  useEffect(() => {
    trackEvent("paid_dashboard_viewed", eventParams("dashboard_loaded"));
  }, []);

  function selectModule(moduleSlug: (typeof modules)[number]["slug"]) {
    setSelectedModuleSlug(moduleSlug);
    trackEvent(
      "paid_module_preview_clicked",
      eventParams("module_preview_button", { moduleSlug }),
    );
  }

  function trackHomepageBuilderOpen() {
    trackEvent(
      "paid_module_preview_clicked",
      eventParams("module_route_button", { moduleSlug: "homepage-builder" }),
    );
  }

  function handleCtaClick() {
    trackEvent(
      hasCheckout ? "kit_checkout_click" : "kit_interest_click",
      eventParams("dashboard_cta"),
    );

    if (!hasCheckout) {
      setInterestRecorded(true);
    }
  }

  return (
    <div className="mt-7 grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">실행 모듈</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              필요한 항목을 하나씩 열어볼 수 있어요
            </h2>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
            결제 전 미리보기
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {modules.map((module) => {
            const isSelected = selectedModule.slug === module.slug;
            const cardClassName = `flex min-h-32 flex-col rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none ${
              isSelected
                ? "border-teal-300 bg-teal-50"
                : "border-slate-200 bg-slate-50/80 hover:border-teal-200 hover:bg-white"
            }`;

            const cardContent = (
              <>
                <span className="flex items-start justify-between gap-3">
                  <span className="text-base font-semibold leading-6 text-slate-950">
                    {module.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                    잠금
                  </span>
                </span>
                <span className="mt-3 text-sm leading-6 text-slate-600">
                  {module.summary}
                </span>
              </>
            );

            if (module.slug === "website") {
              return (
                <Link
                  key={module.slug}
                  href={HOMEPAGE_BUILDER_PATH}
                  onClick={trackHomepageBuilderOpen}
                  className={cardClassName}
                  aria-label="홈페이지 만들기 모듈 미리보기 열기"
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <button
                key={module.slug}
                type="button"
                onClick={() => selectModule(module.slug)}
                className={cardClassName}
                aria-pressed={isSelected}
              >
                {cardContent}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold text-teal-700">모듈 미리보기</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {selectedModule.name}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {selectedModule.preview}
          </p>
          <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            지금 화면은 구조 미리보기입니다. 실제 작성 템플릿과 체크리스트는
            결제 후 열리는 V1 대시보드에서 제공될 예정이에요.
          </p>
        </section>

        <section className="rounded-3xl border border-teal-100 bg-teal-50 p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            전체 실행 패키지는 결제 후 열릴 예정이에요
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            지금은 사전 신청 단계입니다. 정식 오픈 후에는 토스페이먼츠 결제를
            통해 전체 모듈을 사용할 수 있게 준비할 예정이에요.
          </p>

          {hasCheckout ? (
            <a
              href={ctaHref}
              target={ctaHref.startsWith("http") ? "_blank" : undefined}
              rel={ctaHref.startsWith("http") ? "noreferrer" : undefined}
              onClick={handleCtaClick}
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              전체 패키지 열기
            </a>
          ) : (
            <button
              type="button"
              onClick={handleCtaClick}
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              사전 신청하기
            </button>
          )}

          {interestRecorded ? (
            <p className="mt-3 text-sm font-semibold text-teal-900">
              사전 신청 관심이 기록됐어요. 정식 오픈 준비가 되면 연결할
              예정이에요.
            </p>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
