"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  buildModuleGroups,
  businessChips,
  channelChips,
  classifyBusinessType,
  classifyChannel,
  classifyGoal,
  classifyOperationHint,
  generateAdaptiveDiagnosis,
  getChannelQuestion,
  getGoalChips,
  type BusinessTypeCategory,
  type DiagnosisContext,
  type LocalContext,
  type OperationHint,
} from "@/data/diagnosisEngine";
import { trackEvent } from "@/lib/analytics";

const KIT_SLUG = "online-sales-setup-kit";
const SOURCE_PAGE = "online_sales_setup_assembly";
const DASHBOARD_PREVIEW_PATH = "/dashboard/online-sales-setup-kit";

type RequiredStep = "business" | "channel" | "need" | "local";
type OptionalStep = "region";
type FlowStep = RequiredStep | OptionalStep | "ready" | "diagnosis";
type SelectedOptionType = "chip" | "custom" | "skip";

interface ChatMessage {
  readonly id: string;
  readonly role: "bot" | "user";
  readonly text: string;
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

const stepPlaceholders: Record<RequiredStep | OptionalStep, string> = {
  business: "예: 학원인데 샵인샵 느낌이에요, 성수동 네일샵이에요",
  channel: "예: 네이버플레이스, 인스타, 블로그, 지인 소개, 아직 없어요",
  need: "예: 학부모 상담이 잘 이어지지 않아요",
  local: "예: 네, 동네 손님이 중요해요",
  region: "예: 서울 성수동, 부산 해운대",
};

function isReducedMotionPreferred(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function localContextFromLabel(label: string): LocalContext {
  const normalized = label.trim().toLowerCase();

  if (
    normalized.includes("동네") ||
    normalized.includes("지역") ||
    normalized.includes("가까") ||
    normalized.startsWith("네")
  ) {
    return "local";
  }

  if (
    normalized.includes("온라인") ||
    normalized.includes("아니") ||
    normalized.includes("전국")
  ) {
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

function botMessageId() {
  return `bot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function splitTypingChunks(text: string): string[] {
  return text.split(/(\s+)/).filter(Boolean);
}

function getBusinessConfirmation(
  businessType: BusinessTypeCategory,
  operationHint: OperationHint,
): string {
  if (businessType === "education" && operationHint === "shared-space") {
    return "좋아요. 학원/교육 서비스이고, 공간을 함께 쓰는 형태로 이해했어요.";
  }

  const confirmations: Record<BusinessTypeCategory, string> = {
    education: "좋아요. 학원/교육 서비스로 보고 이어서 물어볼게요.",
    beauty: "좋아요. 뷰티/예약형 서비스로 보고 이어서 물어볼게요.",
    fitness: "좋아요. 상담이나 체험 문의가 중요한 서비스로 보고 이어서 물어볼게요.",
    pet: "좋아요. 예약형 반려동물 서비스로 보고 이어서 물어볼게요.",
    food: "좋아요. 방문 손님 흐름이 중요한 가게로 보고 이어서 물어볼게요.",
    "home-service":
      "좋아요. 상담이나 견적 문의가 중요한 서비스로 보고 이어서 물어볼게요.",
    clinic: "좋아요. 상담과 신뢰가 중요한 서비스로 보고 이어서 물어볼게요.",
    "online-service":
      "좋아요. 온라인 신청이나 상담 흐름이 중요한 서비스로 보고 이어서 물어볼게요.",
    fallback: "좋아요. 지금 답변을 기준으로 필요한 세팅을 같이 찾아볼게요.",
  };

  return confirmations[businessType];
}

function getCurrentSuggestions(
  step: FlowStep,
  businessType: BusinessTypeCategory,
): readonly string[] {
  if (step === "business") return businessChips;
  if (step === "channel") return channelChips;
  if (step === "need") return getGoalChips(businessType);
  if (step === "local") return localChips;

  return [];
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

function ThinkingBubble() {
  return (
    <ChatBubble>
      <span className="inline-flex items-center gap-2">
        <span>잠깐만요, 상황을 정리하고 있어요</span>
        <span className="inline-flex gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500 motion-reduce:animate-none" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500 [animation-delay:120ms] motion-reduce:animate-none" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500 [animation-delay:240ms] motion-reduce:animate-none" />
        </span>
      </span>
    </ChatBubble>
  );
}

function TypingBubble({ text }: { readonly text: string }) {
  return (
    <ChatBubble>
      {text}
      <span
        className="ml-1 inline-block h-4 w-1 translate-y-0.5 animate-pulse rounded-full bg-teal-600 motion-reduce:animate-none"
        aria-hidden="true"
      />
    </ChatBubble>
  );
}

function ChipButton({
  children,
  onClick,
  disabled,
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-10 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}

function ChatComposer({
  value,
  placeholder,
  suggestions,
  disabled,
  showSkip,
  inputRef,
  onChange,
  onSubmit,
  onSuggestionClick,
  onSkip,
}: {
  readonly value: string;
  readonly placeholder: string;
  readonly suggestions: readonly string[];
  readonly disabled: boolean;
  readonly showSkip: boolean;
  readonly inputRef: React.RefObject<HTMLTextAreaElement | null>;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onSuggestionClick: (value: string) => void;
  readonly onSkip: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="sr-only" htmlFor="chat-answer">
          답변 입력
        </label>
        <textarea
          ref={inputRef}
          id="chat-answer"
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-12 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50 motion-reduce:transition-none"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="min-h-12 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          보내기
        </button>
        {showSkip ? (
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className="min-h-12 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            건너뛰기
          </button>
        ) : null}
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-slate-500">
            빠른 선택
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <ChipButton
                key={suggestion}
                disabled={disabled}
                onClick={() => onSuggestionClick(suggestion)}
              >
                {suggestion}
              </ChipButton>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}

export default function OnlineSalesSetupDiagnostic({
  ctaHref,
  hasCheckout,
}: OnlineSalesSetupDiagnosticProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "bot-business-question",
      role: "bot",
      text: "어떤 일을 하고 계세요?",
    },
  ]);
  const [currentStep, setCurrentStep] = useState<FlowStep>("business");
  const [inputValue, setInputValue] = useState("");
  const [context, setContext] = useState<Partial<DiagnosisContext>>({
    businessType: "fallback",
  });
  const [hasAnyCustomInput, setHasAnyCustomInput] = useState(false);
  const [diagnosisGenerated, setDiagnosisGenerated] = useState(false);
  const [interestRecorded, setInterestRecorded] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [isBotResponding, setIsBotResponding] = useState(false);
  const startedRef = useRef(false);
  const lockedViewedRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const businessType = context.businessType ?? "fallback";
  const completeContext: DiagnosisContext = {
    businessType,
    channel: context.channel ?? "unsure",
    goal: context.goal ?? "unsure",
    localContext: context.localContext ?? "unsure",
    hasRegionText: context.hasRegionText ?? false,
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

  const currentSuggestions = getCurrentSuggestions(currentStep, businessType);
  const showComposer =
    currentStep !== "ready" &&
    currentStep !== "diagnosis" &&
    !diagnosisGenerated;

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    trackEvent("assembly_started", eventParams("assembly_page_loaded", context));
  }, [context]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, isThinking, typingText, currentStep, diagnosisGenerated]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  function schedule(callback: () => void, delay: number) {
    const timeoutId = window.setTimeout(callback, delay);
    timeoutsRef.current.push(timeoutId);
  }

  function focusInputSoon() {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function addBotMessages(texts: readonly string[]) {
    setMessages((current) => [
      ...current,
      ...texts.map((text) => ({
        id: botMessageId(),
        role: "bot" as const,
        text,
      })),
    ]);
  }

  function typeBotMessages(texts: readonly string[], nextStep: FlowStep) {
    setIsBotResponding(true);

    if (isReducedMotionPreferred()) {
      addBotMessages(texts);
      setCurrentStep(nextStep);
      setIsBotResponding(false);
      focusInputSoon();
      return;
    }

    setIsThinking(true);

    function finish() {
      setCurrentStep(nextStep);
      setIsBotResponding(false);
      focusInputSoon();
    }

    function typeOneMessage(messageIndex: number) {
      const text = texts[messageIndex];
      const chunks = splitTypingChunks(text);
      let chunkIndex = 0;
      setTypingText("");

      function tick() {
        chunkIndex += 1;
        setTypingText(chunks.slice(0, chunkIndex).join(""));

        if (chunkIndex < chunks.length) {
          schedule(tick, 42);
          return;
        }

        schedule(() => {
          setMessages((current) => [
            ...current,
            { id: botMessageId(), role: "bot", text },
          ]);
          setTypingText("");

          if (messageIndex + 1 < texts.length) {
            typeOneMessage(messageIndex + 1);
            return;
          }

          finish();
        }, 140);
      }

      tick();
    }

    schedule(() => {
      setIsThinking(false);
      typeOneMessage(0);
    }, 720);
  }

  function recordStepAnalytics(
    step: RequiredStep | OptionalStep,
    optionType: SelectedOptionType,
    nextContext: Partial<DiagnosisContext>,
  ) {
    trackEvent(
      "chat_step_answered",
      eventParams("diagnostic_chat", nextContext, {
        stepName: stepNameForStep(step),
        selectedOptionType: optionType,
        hasCustomInput: optionType === "custom",
        hasDiagnosisGenerated: false,
      }),
    );
  }

  function submitAnswer(rawValue: string, optionType: SelectedOptionType) {
    const label = rawValue.trim();

    if (!label || isBotResponding || currentStep === "ready") {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: "user",
        text: label,
      },
    ]);
    setInputValue("");
    setInterestRecorded(false);

    if (optionType === "custom") {
      setHasAnyCustomInput(true);
    }

    if (currentStep === "business") {
      const classifiedBusinessType = classifyBusinessType(label);
      const operationHint = classifyOperationHint(label);
      const nextContext = {
        ...context,
        businessType: classifiedBusinessType,
      };
      setContext(nextContext);
      recordStepAnalytics("business", optionType, nextContext);
      typeBotMessages(
        [
          getBusinessConfirmation(classifiedBusinessType, operationHint),
          getChannelQuestion(classifiedBusinessType),
        ],
        "channel",
      );
      return;
    }

    if (currentStep === "channel") {
      const classifiedChannel = classifyChannel(label);
      const nextContext = {
        ...context,
        channel: classifiedChannel,
      };
      setContext(nextContext);
      recordStepAnalytics("channel", optionType, nextContext);
      typeBotMessages(
        [
          "좋아요. 그 흐름을 기준으로 이어서 볼게요.",
          "지금 가장 막힌 부분은 어디예요?",
        ],
        "need",
      );
      return;
    }

    if (currentStep === "need") {
      const classifiedGoal = classifyGoal(label);
      const nextContext = {
        ...context,
        goal: classifiedGoal,
      };
      setContext(nextContext);
      recordStepAnalytics("need", optionType, nextContext);
      typeBotMessages(
        ["좋아요. 필요한 부분을 기준으로 볼게요.", "지역 손님이 중요한가요?"],
        "local",
      );
      return;
    }

    if (currentStep === "local") {
      const localContext = localContextFromLabel(label);
      const nextContext = {
        ...context,
        localContext,
      };
      setContext(nextContext);
      recordStepAnalytics("local", optionType, nextContext);

      if (localContext === "local") {
        typeBotMessages(
          [
            "좋아요. 지역 맥락도 같이 반영할게요.",
            "지역이나 상권을 적어주세요\n지역을 넣으면 문구와 진단을 더 자연스럽게 맞춰드릴게요.",
          ],
          "region",
        );
        return;
      }

      typeBotMessages(
        ["좋아요. 이제 먼저 챙길 세팅을 정리해볼게요."],
        "ready",
      );
      return;
    }

    if (currentStep === "region") {
      const nextContext = {
        ...context,
        hasRegionText: optionType !== "skip",
      };
      setContext(nextContext);
      recordStepAnalytics("region", optionType, nextContext);
      typeBotMessages(
        ["좋아요. 지역은 문구를 자연스럽게 맞추는 참고로만 볼게요."],
        "ready",
      );
    }
  }

  function submitTypedAnswer() {
    submitAnswer(inputValue, "custom");
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
          {messages.map((message) => (
            <ChatBubble key={message.id} variant={message.role}>
              {message.text}
            </ChatBubble>
          ))}
          {isThinking ? <ThinkingBubble /> : null}
          {typingText ? <TypingBubble text={typingText} /> : null}
          <div ref={bottomRef} />
        </div>

        {showComposer ? (
          <div className="mt-5">
            <ChatComposer
              value={inputValue}
              placeholder={stepPlaceholders[currentStep]}
              suggestions={currentSuggestions}
              disabled={isBotResponding}
              showSkip={currentStep === "region"}
              inputRef={inputRef}
              onChange={setInputValue}
              onSubmit={submitTypedAnswer}
              onSuggestionClick={(suggestion) => submitAnswer(suggestion, "chip")}
              onSkip={() => submitAnswer("건너뛰기", "skip")}
            />
          </div>
        ) : null}

        {currentStep === "ready" && !diagnosisGenerated ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={generateDiagnosis}
              className="min-h-12 rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              진단 보기
            </button>
          </div>
        ) : null}
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
