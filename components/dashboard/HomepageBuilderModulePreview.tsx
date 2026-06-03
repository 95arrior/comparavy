"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const KIT_SLUG = "online-sales-setup-kit";
const MODULE_SLUG = "homepage-builder";
const SOURCE_PAGE = "online_sales_setup_homepage_builder";

const outputCards = [
  {
    title: "첫 화면 문구",
    description:
      "손님이 처음 봤을 때 무엇을 하는 곳인지 바로 알 수 있는 문장",
  },
  {
    title: "서비스 소개문",
    description: "대표 서비스와 장점을 쉽게 설명하는 문구",
  },
  {
    title: "문의/예약 CTA",
    description: "상담, 예약, 문의로 이어지는 버튼 문구",
  },
  {
    title: "FAQ",
    description: "처음 방문하는 손님이 궁금해할 질문과 답변 구조",
  },
  {
    title: "SEO 제목/설명",
    description: "검색 결과에 보일 제목과 설명 기본안",
  },
  {
    title: "도메인·배포 체크리스트",
    description: "홈페이지를 실제로 올리기 전에 확인해야 할 항목",
  },
] as const;

const workflowSteps = [
  "가게 정보 입력",
  "대표 서비스 선택",
  "손님이 원하는 결과 정리",
  "첫 화면 문구 만들기",
  "서비스 소개문 만들기",
  "문의 버튼 문구 만들기",
  "FAQ 만들기",
  "SEO 제목/설명 정리",
  "도메인·배포 체크리스트 확인",
] as const;

interface HomepageBuilderModulePreviewProps {
  readonly ctaHref: string;
  readonly hasCheckout: boolean;
}

function eventParams(actionLocation: string) {
  return {
    kit_slug: KIT_SLUG,
    module_slug: MODULE_SLUG,
    source_page: SOURCE_PAGE,
    action_location: actionLocation,
  };
}

export default function HomepageBuilderModulePreview({
  ctaHref,
  hasCheckout,
}: HomepageBuilderModulePreviewProps) {
  const [interestRecorded, setInterestRecorded] = useState(false);

  useEffect(() => {
    trackEvent(
      "paid_module_preview_viewed",
      eventParams("homepage_builder_loaded"),
    );
  }, []);

  function handleCtaClick() {
    trackEvent(
      hasCheckout ? "kit_checkout_click" : "kit_interest_click",
      eventParams("homepage_builder_cta"),
    );

    if (!hasCheckout) {
      setInterestRecorded(true);
    }
  }

  return (
    <div className="mt-7 space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">모듈 미리보기</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              이 모듈에서 만들 항목
            </h2>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
            전체 내용 잠금
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {outputCards.map((card) => (
            <article
              key={card.title}
              className="min-h-36 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold leading-6 text-slate-950">
                  {card.title}
                </h3>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                  잠금
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold text-teal-700">잠긴 실행 흐름</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          구매 후에는 이렇게 진행돼요
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workflowSteps.map((step, index) => (
            <article
              key={step}
              className="flex min-h-20 gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-semibold text-teal-800">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold leading-6 text-slate-950">
                  {step}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">잠금</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.58fr_0.42fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold text-teal-700">
            예시는 이 정도만 보여드릴게요
          </p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Sample input
              </p>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-800">
                네일샵 / 성수동 / 웨딩 네일과 손톱 케어
              </p>
            </div>
            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                Sample output preview
              </p>
              <p className="mt-2 text-base font-semibold leading-7 text-slate-950">
                성수동에서 웨딩 네일과 손톱 케어를 편안하게 받을 수 있는 네일샵
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            전체 모듈에서는 이 문장을 바탕으로 서비스 소개, 문의 버튼, FAQ,
            SEO 문구까지 이어서 만들 수 있어요.
          </p>
        </div>

        <aside className="rounded-3xl border border-teal-100 bg-teal-50 p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            전체 홈페이지 만들기 모듈은 패키지 안에서 열립니다
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            지금은 사전 신청 단계입니다. 정식 오픈 후에는 전체 실행
            패키지에서 이 모듈을 사용할 수 있게 준비할 예정이에요.
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

          <Link
            href="/dashboard/online-sales-setup-kit"
            className="mt-4 inline-flex text-sm font-semibold text-teal-800 underline-offset-4 hover:underline"
          >
            대시보드 미리보기로 돌아가기
          </Link>
        </aside>
      </section>
    </div>
  );
}
