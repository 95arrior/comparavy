"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

const KIT_SLUG = "online-sales-setup-kit";
const SOURCE_PAGE = "online_sales_setup_assembly";
const DASHBOARD_PREVIEW_PATH = "/dashboard/online-sales-setup-kit";

type RequiredStep = "business" | "channel" | "need";
type OptionalStep = "region";
type FlowStep = RequiredStep | OptionalStep | "ready" | "diagnosis";
type SelectedOptionType = "chip" | "custom" | "skip";

interface Answer {
  readonly label: string;
  readonly optionType: SelectedOptionType;
  readonly hasCustomInput: boolean;
}

interface QuestionConfig {
  readonly key: RequiredStep;
  readonly stepName: string;
  readonly message: string;
  readonly chips: readonly string[];
}

interface OnlineSalesSetupDiagnosticProps {
  readonly ctaHref: string;
  readonly hasCheckout: boolean;
}

const progressSteps = ["상황 확인", "필요한 세팅 찾기", "전체 패키지 열기"] as const;

const questions: readonly QuestionConfig[] = [
  {
    key: "business",
    stepName: "business_type",
    message: "어떤 일을 하고 계세요?",
    chips: [
      "네일샵",
      "카페",
      "필라테스",
      "강아지 미용",
      "학원",
      "병원·클리닉",
      "청소·인테리어",
      "온라인 서비스",
      "직접 입력",
    ],
  },
  {
    key: "channel",
    stepName: "current_channel",
    message: "지금 어디에서 손님을 받고 있나요?",
    chips: [
      "네이버플레이스",
      "인스타그램",
      "블로그",
      "카카오채널",
      "홈페이지",
      "아직 없어요",
      "잘 모르겠어요",
    ],
  },
  {
    key: "need",
    stepName: "main_need",
    message: "지금 가장 필요한 건 뭐예요?",
    chips: [
      "문의 늘리기",
      "예약 받기",
      "구매로 연결하기",
      "신뢰도 높이기",
      "이벤트 알리기",
      "뭐부터 해야 할지 모르겠어요",
    ],
  },
];

const diagnosisItems = [
  {
    title: "온라인 첫인상 세팅",
    description:
      "손님이 처음 봤을 때 무엇을 하는 곳인지 바로 알 수 있는 소개 문구가 필요해요.",
  },
  {
    title: "문의/예약 연결 세팅",
    description:
      "글을 보고 바로 문의하거나 예약할 수 있는 문구와 버튼 흐름이 필요해요.",
  },
  {
    title: "노출 점검 세팅",
    description:
      "네이버플레이스, 인스타그램, 홈페이지, 분석 도구 중 빠진 부분을 점검해야 해요.",
  },
] as const;

const lockedModules = [
  { slug: "website", name: "홈페이지 만들기" },
  { slug: "naver-place", name: "네이버플레이스 세팅" },
  { slug: "instagram-sns", name: "인스타/SNS 홍보 세트" },
  { slug: "review-replies", name: "리뷰 답변 시스템" },
  { slug: "kakao-dm", name: "카카오채널/DM 응대 문구" },
  { slug: "event-coupon", name: "이벤트·쿠폰 문구" },
  { slug: "setup-checklist", name: "결제·도메인·분석·SEO 세팅 체크리스트" },
  { slug: "seven-day-open-plan", name: "7일 오픈 플랜" },
] as const;

function nextStep(current: RequiredStep): FlowStep {
  if (current === "business") {
    return "channel";
  }

  if (current === "channel") {
    return "need";
  }

  return "region";
}

function eventParams(
  actionLocation: string,
  extra: {
    readonly stepName?: string;
    readonly selectedOptionType?: SelectedOptionType;
    readonly hasCustomInput?: boolean;
    readonly hasDiagnosisGenerated?: boolean;
  } = {},
) {
  return {
    kit_slug: KIT_SLUG,
    source_page: SOURCE_PAGE,
    action_location: actionLocation,
    step_name: extra.stepName,
    selected_option_type: extra.selectedOptionType,
    has_custom_input: extra.hasCustomInput,
    has_diagnosis_generated: extra.hasDiagnosisGenerated,
  };
}

function modulePreviewParams(moduleSlug: string) {
  return {
    kit_slug: KIT_SLUG,
    module_slug: moduleSlug,
    source_page: SOURCE_PAGE,
    action_location: "assembly_locked_module",
  };
}

function ChatBubble({
  children,
  variant = "bot",
}: {
  readonly children: ReactNode;
  readonly variant?: "bot" | "user";
}) {
  const isUser = variant === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm sm:max-w-[74%] ${
          isUser
            ? "rounded-tr-md bg-teal-700 text-white"
            : "rounded-tl-md border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ChipButton({
  children,
  onClick,
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}

export default function OnlineSalesSetupDiagnostic({
  ctaHref,
  hasCheckout,
}: OnlineSalesSetupDiagnosticProps) {
  const [answers, setAnswers] = useState<
    Partial<Record<RequiredStep | OptionalStep, Answer>>
  >({});
  const [currentStep, setCurrentStep] = useState<FlowStep>("business");
  const [customBusinessValue, setCustomBusinessValue] = useState("");
  const [showCustomBusinessInput, setShowCustomBusinessInput] = useState(false);
  const [regionValue, setRegionValue] = useState("");
  const [diagnosisGenerated, setDiagnosisGenerated] = useState(false);
  const [interestRecorded, setInterestRecorded] = useState(false);
  const startedRef = useRef(false);
  const lockedViewedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    trackEvent("assembly_started", eventParams("assembly_page_loaded"));
  }, []);

  function recordAnswer(
    key: RequiredStep,
    label: string,
    optionType: SelectedOptionType,
    hasCustomInput: boolean,
  ) {
    const question = questions.find((item) => item.key === key);

    setAnswers((current) => ({
      ...current,
      [key]: { label, optionType, hasCustomInput },
    }));
    setCurrentStep(nextStep(key));

    trackEvent(
      "chat_step_answered",
      eventParams("diagnostic_chat", {
        stepName: question?.stepName,
        selectedOptionType: optionType,
        hasCustomInput,
        hasDiagnosisGenerated: false,
      }),
    );
  }

  function handleChipClick(question: QuestionConfig, chip: string) {
    if (question.key === "business" && chip === "직접 입력") {
      setShowCustomBusinessInput(true);
      return;
    }

    recordAnswer(question.key, chip, "chip", false);
  }

  function submitCustomBusiness() {
    const trimmed = customBusinessValue.trim();

    if (!trimmed) {
      return;
    }

    recordAnswer("business", trimmed, "custom", true);
  }

  function submitRegion(optionType: SelectedOptionType) {
    const label = optionType === "skip" ? "건너뛰기" : regionValue.trim();

    if (optionType !== "skip" && !label) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      region: {
        label,
        optionType,
        hasCustomInput: optionType === "custom",
      },
    }));
    setCurrentStep("ready");

    trackEvent(
      "chat_step_answered",
      eventParams("diagnostic_region", {
        stepName: "optional_region",
        selectedOptionType: optionType,
        hasCustomInput: optionType === "custom",
        hasDiagnosisGenerated: false,
      }),
    );
  }

  function generateDiagnosis() {
    setDiagnosisGenerated(true);
    setCurrentStep("diagnosis");

    trackEvent(
      "setup_diagnosis_generated",
      eventParams("diagnosis_button", {
        hasCustomInput: Boolean(
          answers.business?.hasCustomInput || answers.region?.hasCustomInput,
        ),
        hasDiagnosisGenerated: true,
      }),
    );

    if (!lockedViewedRef.current) {
      lockedViewedRef.current = true;
      trackEvent(
        "locked_modules_viewed",
        eventParams("diagnosis_results", {
          hasCustomInput: Boolean(
            answers.business?.hasCustomInput || answers.region?.hasCustomInput,
          ),
          hasDiagnosisGenerated: true,
        }),
      );
    }
  }

  function handleUnlockClick() {
    trackEvent(
      "kit_unlock_click",
      eventParams("locked_modules_cta", {
        hasCustomInput: Boolean(
          answers.business?.hasCustomInput || answers.region?.hasCustomInput,
        ),
        hasDiagnosisGenerated: diagnosisGenerated,
      }),
    );

    trackEvent(
      hasCheckout ? "kit_checkout_click" : "kit_interest_click",
      eventParams("locked_modules_cta", {
        hasCustomInput: Boolean(
          answers.business?.hasCustomInput || answers.region?.hasCustomInput,
        ),
        hasDiagnosisGenerated: diagnosisGenerated,
      }),
    );

    if (!hasCheckout) {
      setInterestRecorded(true);
    }
  }

  function handleLockedModuleClick(moduleSlug: string) {
    trackEvent("paid_module_preview_clicked", modulePreviewParams(moduleSlug));
  }

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-[0.72fr_0.28fr]">
      <section className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="space-y-4" aria-live="polite">
          <ChatBubble>
            안녕하세요. 몇 가지만 답하면 지금 먼저 챙기면 좋은 온라인 영업
            세팅을 정리해드릴게요.
          </ChatBubble>

          {questions.map((question) => {
            const answer = answers[question.key];
            const isCurrent = currentStep === question.key;
            const shouldShow =
              answer ||
              isCurrent ||
              (question.key === "channel" && answers.business) ||
              (question.key === "need" && answers.channel);

            if (!shouldShow) {
              return null;
            }

            return (
              <div key={question.key} className="space-y-3">
                <ChatBubble>{question.message}</ChatBubble>
                {answer ? (
                  <ChatBubble variant="user">{answer.label}</ChatBubble>
                ) : null}
                {isCurrent ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap gap-2">
                      {question.chips.map((chip) => (
                        <ChipButton
                          key={chip}
                          onClick={() => handleChipClick(question, chip)}
                        >
                          {chip}
                        </ChipButton>
                      ))}
                    </div>

                    {question.key === "business" && showCustomBusinessInput ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                        <label className="sr-only" htmlFor="custom-business">
                          직접 입력
                        </label>
                        <input
                          id="custom-business"
                          value={customBusinessValue}
                          onChange={(event) =>
                            setCustomBusinessValue(event.target.value)
                          }
                          placeholder="예: 사진 스튜디오, 상담 서비스"
                          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-100 motion-reduce:transition-none"
                        />
                        <button
                          type="button"
                          onClick={submitCustomBusiness}
                          disabled={!customBusinessValue.trim()}
                          className="min-h-11 rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
                        >
                          입력 완료
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          {(currentStep === "region" || answers.region) && (
            <div className="space-y-3">
              <ChatBubble>지역이나 상권을 넣으면 더 정확해져요</ChatBubble>
              {answers.region ? (
                <ChatBubble variant="user">{answers.region.label}</ChatBubble>
              ) : null}
              {currentStep === "region" ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <label className="sr-only" htmlFor="region-input">
                      지역이나 상권
                    </label>
                    <input
                      id="region-input"
                      value={regionValue}
                      onChange={(event) => setRegionValue(event.target.value)}
                      placeholder="예: 서울 성수동, 부산 해운대"
                      className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-100 motion-reduce:transition-none"
                    />
                    <button
                      type="button"
                      onClick={() => submitRegion("custom")}
                      disabled={!regionValue.trim()}
                      className="min-h-11 rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
                    >
                      입력 완료
                    </button>
                    <button
                      type="button"
                      onClick={() => submitRegion("skip")}
                      className="min-h-11 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
                    >
                      건너뛰기
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {currentStep === "ready" ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={generateDiagnosis}
                className="min-h-12 rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                진단 보기
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-sm font-semibold text-teal-700">진행 순서</p>
        <div className="mt-4 grid gap-3">
          {progressSteps.map((step, index) => (
            <div
              key={step}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-sm font-semibold text-teal-800">
                {index + 1}
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-900">{step}</p>
            </div>
          ))}
        </div>
      </aside>

      {diagnosisGenerated ? (
        <section className="lg:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm font-semibold text-teal-700">무료 진단 결과</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              지금 먼저 챙기면 좋은 세팅 3가지예요
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {diagnosisItems.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-sm font-semibold text-teal-800">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm leading-7 text-slate-700">
              이건 첫 진단이에요. 전체 패키지에서는 필요한 항목을 버튼으로
              하나씩 만들 수 있어요.
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm font-semibold text-teal-700">
              전체 패키지에서 이어서 만들 수 있어요
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {lockedModules.map((module) => (
                <Link
                  key={module.slug}
                  href={DASHBOARD_PREVIEW_PATH}
                  onClick={() => handleLockedModuleClick(module.slug)}
                  className="flex min-h-24 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left opacity-95 transition hover:border-teal-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-500"
                  >
                    잠금
                  </span>
                  <span className="text-sm font-semibold leading-6 text-slate-700">
                    {module.name}
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 p-4">
              {hasCheckout ? (
                <a
                  href={ctaHref}
                  target={ctaHref.startsWith("http") ? "_blank" : undefined}
                  rel={ctaHref.startsWith("http") ? "noreferrer" : undefined}
                  onClick={handleUnlockClick}
                  data-event="kit_checkout_click"
                  data-action-location="locked_modules_cta"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
                >
                  전체 패키지 열기
                </a>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      정리한 흐름을 이어서 만들 준비가 되면 열어둘게요.
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      정식 결제는 토스페이먼츠 연동 후 열릴 예정이에요.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnlockClick}
                    data-event="kit_interest_click"
                    data-action-location="locked_modules_cta"
                    className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
                  >
                    사전 신청하기
                  </button>
                </div>
              )}

              {interestRecorded ? (
                <p className="mt-3 text-sm font-semibold text-teal-900">
                  사전 신청 관심이 기록됐어요. 정식 오픈 준비가 되면 연결할
                  예정이에요.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
