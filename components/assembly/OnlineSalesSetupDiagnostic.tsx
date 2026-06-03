"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  buildModuleGroups,
  businessChips,
  channelChips,
  classifyBusinessType,
  classifyChannel,
  classifyGoal,
  generateAdaptiveDiagnosis,
  getBusinessTypeLabel,
  getChannelQuestion,
  getGoalChips,
  type BusinessTypeCategory,
  type ChannelCategory,
  type DiagnosisContext,
  type GoalCategory,
  type LocalContext,
} from "@/data/diagnosisEngine";
import { trackEvent } from "@/lib/analytics";

const KIT_SLUG = "online-sales-setup-kit";
const SOURCE_PAGE = "online_sales_setup_assembly";
const DASHBOARD_PREVIEW_PATH = "/dashboard/online-sales-setup-kit";

type RequiredStep = "business" | "channel" | "need" | "local";
type OptionalStep = "region";
type FlowStep = RequiredStep | OptionalStep | "ready" | "diagnosis";
type SelectedOptionType = "chip" | "custom" | "skip";

interface Answer {
  readonly label: string;
  readonly optionType: SelectedOptionType;
  readonly hasCustomInput: boolean;
}

interface OnlineSalesSetupDiagnosticProps {
  readonly ctaHref: string;
  readonly hasCheckout: boolean;
}

const progressSteps = ["상황 확인", "필요한 세팅 찾기", "전체 패키지 열기"] as const;
const localChips = [
  "네, 동네 손님이 중요해요",
  "아니요, 온라인 고객이 더 중요해요",
  "잘 모르겠어요",
] as const;

function isReducedMotionPreferred(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function localContextFromLabel(label: string): LocalContext {
  if (label.startsWith("네,")) {
    return "local";
  }

  if (label.startsWith("아니요")) {
    return "online";
  }

  return "unsure";
}

function stepNameForStep(step: RequiredStep | OptionalStep): string {
  const stepNames: Record<RequiredStep | OptionalStep, string> = {
    business: "business_type",
    channel: "current_channel",
    need: "main_need",
    local: "local_context",
    region: "optional_region",
  };

  return stepNames[step];
}

function eventParams(
  actionLocation: string,
  context: Partial<DiagnosisContext>,
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
    business_type_category: context.businessType,
    channel_category: context.channel,
    goal_category: context.goal,
    local_context_selected:
      context.localContext === undefined ? undefined : context.localContext,
    has_custom_input: extra.hasCustomInput,
    has_diagnosis_generated: extra.hasDiagnosisGenerated,
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
  selected = false,
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none ${
        selected
          ? "border-teal-300 bg-teal-50 text-teal-900"
          : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50"
      }`}
    >
      {children}
    </button>
  );
}

function QuestionBlock({
  message,
  answer,
  chips,
  isCurrent,
  showDirectInput,
  allowDirectInput = true,
  directInputPlaceholder,
  directInputValue,
  onDirectInputChange,
  onDirectInputSubmit,
  onDirectInputOpen,
  onChipClick,
}: {
  readonly message: string;
  readonly answer?: Answer;
  readonly chips: readonly string[];
  readonly isCurrent: boolean;
  readonly showDirectInput: boolean;
  readonly allowDirectInput?: boolean;
  readonly directInputPlaceholder: string;
  readonly directInputValue: string;
  readonly onDirectInputChange: (value: string) => void;
  readonly onDirectInputSubmit: () => void;
  readonly onDirectInputOpen: () => void;
  readonly onChipClick: (chip: string) => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onDirectInputSubmit();
  }

  return (
    <div className="space-y-3">
      <ChatBubble>{message}</ChatBubble>
      {answer ? <ChatBubble variant="user">{answer.label}</ChatBubble> : null}
      {isCurrent ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <ChipButton
                key={chip}
                selected={answer?.label === chip}
                onClick={() => onChipClick(chip)}
              >
                {chip}
              </ChipButton>
            ))}
          </div>

          {showDirectInput ? (
            <form
              onSubmit={handleSubmit}
              className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"
            >
              <label className="sr-only" htmlFor={`custom-${message}`}>
                직접 입력
              </label>
              <input
                id={`custom-${message}`}
                value={directInputValue}
                onChange={(event) => onDirectInputChange(event.target.value)}
                placeholder={directInputPlaceholder}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-100 motion-reduce:transition-none"
              />
              <button
                type="submit"
                disabled={!directInputValue.trim()}
                className="min-h-11 rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                입력 완료
              </button>
            </form>
          ) : allowDirectInput ? (
            <button
              type="button"
              onClick={onDirectInputOpen}
              className="mt-3 text-sm font-semibold text-teal-700 transition hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              직접 입력할게요
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
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
  const [pendingStep, setPendingStep] = useState<FlowStep | null>(null);
  const [activeCustomStep, setActiveCustomStep] = useState<
    RequiredStep | OptionalStep | null
  >(null);
  const [customValue, setCustomValue] = useState("");
  const [regionValue, setRegionValue] = useState("");
  const [context, setContext] = useState<Partial<DiagnosisContext>>({
    businessType: "fallback",
  });
  const [diagnosisGenerated, setDiagnosisGenerated] = useState(false);
  const [interestRecorded, setInterestRecorded] = useState(false);
  const startedRef = useRef(false);
  const lockedViewedRef = useRef(false);

  const businessType = context.businessType ?? "fallback";
  const channelQuestion = getChannelQuestion(businessType);
  const goalChips = getGoalChips(businessType);
  const hasAnyCustomInput = Boolean(
    answers.business?.hasCustomInput ||
      answers.channel?.hasCustomInput ||
      answers.need?.hasCustomInput ||
      answers.region?.hasCustomInput,
  );

  const completeContext: DiagnosisContext = {
    businessType,
    channel: context.channel ?? "unsure",
    goal: context.goal ?? "unsure",
    localContext: context.localContext ?? "unsure",
    hasRegionText: Boolean(answers.region?.hasCustomInput),
  };

  const diagnosisItems = useMemo(
    () => generateAdaptiveDiagnosis(completeContext),
    [
      completeContext.businessType,
      completeContext.channel,
      completeContext.goal,
      completeContext.localContext,
      completeContext.hasRegionText,
    ],
  );

  const moduleGroups = useMemo(
    () => buildModuleGroups(completeContext),
    [
      completeContext.businessType,
      completeContext.channel,
      completeContext.goal,
      completeContext.localContext,
      completeContext.hasRegionText,
    ],
  );

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    trackEvent("assembly_started", eventParams("assembly_page_loaded", context));
  }, [context]);

  function moveToStep(nextStep: FlowStep) {
    if (isReducedMotionPreferred()) {
      setCurrentStep(nextStep);
      return;
    }

    setPendingStep(nextStep);
    window.setTimeout(() => {
      setCurrentStep(nextStep);
      setPendingStep(null);
    }, 180);
  }

  function recordAnswer(
    step: RequiredStep,
    label: string,
    optionType: SelectedOptionType,
    hasCustomInput: boolean,
  ) {
    let nextContext: Partial<DiagnosisContext> = context;
    let nextStep: FlowStep = "ready";

    if (step === "business") {
      const classifiedBusinessType = classifyBusinessType(label);
      nextContext = {
        ...context,
        businessType: classifiedBusinessType,
      };
      nextStep = "channel";
    }

    if (step === "channel") {
      const classifiedChannel = classifyChannel(label);
      nextContext = {
        ...context,
        channel: classifiedChannel,
      };
      nextStep = "need";
    }

    if (step === "need") {
      const classifiedGoal = classifyGoal(label);
      nextContext = {
        ...context,
        goal: classifiedGoal,
      };
      nextStep = "local";
    }

    if (step === "local") {
      const localContext = localContextFromLabel(label);
      nextContext = {
        ...context,
        localContext,
      };
      nextStep = localContext === "local" ? "region" : "ready";
    }

    setContext(nextContext);
    setAnswers((current) => ({
      ...current,
      [step]: { label, optionType, hasCustomInput },
    }));
    setActiveCustomStep(null);
    setCustomValue("");

    trackEvent(
      "chat_step_answered",
      eventParams("diagnostic_chat", nextContext, {
        stepName: stepNameForStep(step),
        selectedOptionType: optionType,
        hasCustomInput,
        hasDiagnosisGenerated: false,
      }),
    );

    moveToStep(nextStep);
  }

  function recordRegion(optionType: SelectedOptionType) {
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
    setActiveCustomStep(null);

    trackEvent(
      "chat_step_answered",
      eventParams("diagnostic_region", context, {
        stepName: stepNameForStep("region"),
        selectedOptionType: optionType,
        hasCustomInput: optionType === "custom",
        hasDiagnosisGenerated: false,
      }),
    );

    moveToStep("ready");
  }

  function handleChipClick(step: RequiredStep, chip: string) {
    if (step === "business" && chip === "직접 입력") {
      setActiveCustomStep(step);
      return;
    }

    recordAnswer(step, chip, "chip", false);
  }

  function submitCustomStep(step: RequiredStep | OptionalStep) {
    if (step === "region") {
      recordRegion("custom");
      return;
    }

    const trimmed = customValue.trim();
    if (!trimmed) {
      return;
    }

    recordAnswer(step, trimmed, "custom", true);
  }

  function generateDiagnosis() {
    setDiagnosisGenerated(true);
    setCurrentStep("diagnosis");

    trackEvent(
      "setup_diagnosis_generated",
      eventParams("diagnosis_button", completeContext, {
        hasCustomInput: hasAnyCustomInput,
        hasDiagnosisGenerated: true,
      }),
    );

    if (!lockedViewedRef.current) {
      lockedViewedRef.current = true;
      trackEvent(
        "locked_modules_viewed",
        eventParams("diagnosis_results", completeContext, {
          hasCustomInput: hasAnyCustomInput,
          hasDiagnosisGenerated: true,
        }),
      );
    }
  }

  function handleUnlockClick() {
    trackEvent(
      hasCheckout ? "kit_checkout_click" : "kit_interest_click",
      eventParams("locked_modules_cta", completeContext, {
        hasCustomInput: hasAnyCustomInput,
        hasDiagnosisGenerated: diagnosisGenerated,
      }),
    );

    if (!hasCheckout) {
      setInterestRecorded(true);
    }
  }

  return (
    <div className="mt-8 grid gap-5">
      <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-sm font-semibold text-teal-700">진행 순서</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
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

      <section className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="space-y-4" aria-live="polite">
          <ChatBubble>
            안녕하세요. 몇 가지만 답하면 지금 먼저 챙기면 좋은 온라인 영업
            세팅을 정리해드릴게요.
          </ChatBubble>

          <QuestionBlock
            message="어떤 일을 하고 계세요?"
            answer={answers.business}
            chips={businessChips}
            isCurrent={currentStep === "business"}
            showDirectInput={activeCustomStep === "business"}
            allowDirectInput={false}
            directInputPlaceholder="예: 학원인데 샵인샵 느낌이에요"
            directInputValue={customValue}
            onDirectInputChange={setCustomValue}
            onDirectInputOpen={() => setActiveCustomStep("business")}
            onDirectInputSubmit={() => submitCustomStep("business")}
            onChipClick={(chip) => handleChipClick("business", chip)}
          />

          {answers.business ? (
            <p className="pl-1 text-sm font-semibold text-slate-500">
              {getBusinessTypeLabel(businessType)} 기준으로 이어서 볼게요.
            </p>
          ) : null}

          {answers.business || currentStep === "channel" ? (
            <QuestionBlock
              message={channelQuestion}
              answer={answers.channel}
              chips={channelChips}
              isCurrent={currentStep === "channel"}
              showDirectInput={activeCustomStep === "channel"}
              directInputPlaceholder="예: 인스타 DM이랑 지인 소개"
              directInputValue={customValue}
              onDirectInputChange={setCustomValue}
              onDirectInputOpen={() => setActiveCustomStep("channel")}
              onDirectInputSubmit={() => submitCustomStep("channel")}
              onChipClick={(chip) => handleChipClick("channel", chip)}
            />
          ) : null}

          {answers.channel || currentStep === "need" ? (
            <QuestionBlock
              message="지금 가장 막힌 부분은 어디예요?"
              answer={answers.need}
              chips={goalChips}
              isCurrent={currentStep === "need"}
              showDirectInput={activeCustomStep === "need"}
              directInputPlaceholder="예: 학부모 상담으로 잘 이어지지 않아요"
              directInputValue={customValue}
              onDirectInputChange={setCustomValue}
              onDirectInputOpen={() => setActiveCustomStep("need")}
              onDirectInputSubmit={() => submitCustomStep("need")}
              onChipClick={(chip) => handleChipClick("need", chip)}
            />
          ) : null}

          {answers.need || currentStep === "local" ? (
            <QuestionBlock
              message="지역 손님이 중요한가요?"
              answer={answers.local}
              chips={localChips}
              isCurrent={currentStep === "local"}
              showDirectInput={false}
              allowDirectInput={false}
              directInputPlaceholder=""
              directInputValue=""
              onDirectInputChange={() => undefined}
              onDirectInputOpen={() => undefined}
              onDirectInputSubmit={() => undefined}
              onChipClick={(chip) => handleChipClick("local", chip)}
            />
          ) : null}

          {(currentStep === "region" || answers.region) && (
            <div className="space-y-3">
              <ChatBubble>
                지역이나 상권을 적어주세요. 지역을 넣으면 문구와 진단을 더
                자연스럽게 맞춰드릴게요.
              </ChatBubble>
              {answers.region ? (
                <ChatBubble variant="user">{answers.region.label}</ChatBubble>
              ) : null}
              {currentStep === "region" ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      recordRegion("custom");
                    }}
                    className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"
                  >
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
                      type="submit"
                      disabled={!regionValue.trim()}
                      className="min-h-11 rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
                    >
                      입력 완료
                    </button>
                    <button
                      type="button"
                      onClick={() => recordRegion("skip")}
                      className="min-h-11 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
                    >
                      건너뛰기
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          )}

          {pendingStep ? <ChatBubble>다음 질문을 준비할게요.</ChatBubble> : null}

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

      {diagnosisGenerated ? (
        <section>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
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

          <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm font-semibold text-teal-700">
              전체 패키지에서는 이렇게 이어서 만들 수 있어요
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {moduleGroups.map((group) => (
                <article
                  key={group.slug}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">
                        {group.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {group.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                      잠금
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {group.modules.map((module) => (
                      <Link
                        key={`${group.slug}-${module.slug}`}
                        href={DASHBOARD_PREVIEW_PATH}
                        className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold leading-6 text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
                      >
                        <span>{module.name}</span>
                        <span className="text-xs text-slate-400">잠금</span>
                      </Link>
                    ))}
                  </div>
                </article>
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
