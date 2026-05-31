"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Guide } from "@/lib/guides";

const PROMPT_COPY_REQUEST_EVENT = "ateflo:prompt-copy-request";
const PROMPT_COPIED_EVENT = "ateflo:prompt-copied";

type CopyActionLocation = "top_button" | "prompt_builder";

interface PromptField {
  readonly key: string;
  readonly label: string;
  readonly placeholder: string;
  readonly multiline?: boolean;
}

interface PromptBuilderConfig {
  readonly whatYouWillMake: string;
  readonly primaryFields: readonly PromptField[];
  readonly optionalFields: readonly PromptField[];
  readonly privateNote?: string;
  readonly exampleInput: string;
  readonly exampleOutput: readonly string[];
  readonly checkBeforeUsing: readonly string[];
  readonly buildPrompt: (values: Record<string, string>) => string;
}

const etsyFields = {
  product: "Product",
  material: "Material",
  size: "Size",
  targetBuyer: "Target buyer",
  extraNotes: "Extra notes",
  color: "Color",
  personalization: "Personalization",
  shippingLimits: "Shipping limits",
  occasion: "Occasion or use case",
} as const;

const meetingFields = {
  notes: "Meeting notes",
  project: "Client or project",
  deadlines: "Known deadlines",
  extraNotes: "Extra notes",
  owners: "Task owners",
  questions: "Open questions",
} as const;

function valueOrPlaceholder(values: Record<string, string>, key: string, placeholder: string): string {
  return values[key]?.trim() || `[${placeholder}]`;
}

function detailLines(
  values: Record<string, string>,
  fields: Record<string, string>,
): string {
  return Object.entries(fields)
    .map(([key, label]) => `${label}: ${valueOrPlaceholder(values, key, label.toUpperCase())}`)
    .join("\n");
}

const promptConfigs: Record<string, PromptBuilderConfig> = {
  "best-ai-tools-for-etsy-product-descriptions": {
    whatYouWillMake:
      "An Etsy listing draft with a title, buyer-focused opening, scannable bullets, product description, keyword ideas, and seller review notes.",
    primaryFields: [
      { key: "product", label: "Product", placeholder: "Example: Handmade ceramic mug" },
      { key: "material", label: "Material", placeholder: "Example: Ceramic" },
      { key: "size", label: "Size", placeholder: "Example: 12 oz" },
      { key: "targetBuyer", label: "Target buyer", placeholder: "Example: Coffee lovers, gift buyers" },
      {
        key: "extraNotes",
        label: "Extra notes",
        placeholder: "Example: Microwave safe, handmade, care notes, anything important",
        multiline: true,
      },
    ],
    optionalFields: [
      { key: "color", label: "Color", placeholder: "Example: Blue glaze" },
      { key: "personalization", label: "Personalization", placeholder: "Example: Name engraving available" },
      { key: "shippingLimits", label: "Shipping limits", placeholder: "Example: US only, ships in 3-5 business days" },
      { key: "occasion", label: "Occasion or use case", placeholder: "Example: Birthday gift, housewarming gift" },
    ],
    exampleInput:
      "Handmade ceramic mug, blue glaze, 12 oz, microwave safe, gift for coffee lovers.",
    exampleOutput: [
      "Title: Handmade Blue Ceramic Mug, 12 oz Coffee Lover Gift",
      "Opening: Start your morning with a handmade ceramic mug finished in a calm blue glaze.",
      "Bullets: 12 oz size; handmade ceramic; microwave safe; good for coffee, tea, or desk use.",
      "Description: This blue ceramic mug is a simple everyday gift for coffee lovers who want something handmade and useful.",
      "Needs Seller Review: confirm dishwasher safety, processing time, shipping limits, and personalization options.",
    ],
    checkBeforeUsing: [
      "Check every material, size, color, and care detail.",
      "Remove any shipping, guarantee, or safety claim you cannot prove.",
      "Read the first two lines on your phone before publishing.",
      "Keep anything marked Needs seller input out of the live listing until you verify it.",
    ],
    buildPrompt(values) {
      return `Create an Etsy listing draft from the product details below.

Product details:
${detailLines(values, etsyFields)}

Finished output:
1. Etsy product title
2. Buyer-focused opening
3. Scannable bullet points
4. Mobile-readable product description
5. Tag or keyword ideas
6. Needs Seller Review section

Rules:
- Do not invent materials, sizes, shipping times, guarantees, or product claims.
- If a detail is missing, mark it as Needs seller input.
- Keep claims specific to the product facts I gave you.
- Make the listing helpful for a real buyer, not overly salesy.`;
    },
  },
  "how-to-turn-meeting-notes-into-a-client-recap-with-ai": {
    whatYouWillMake:
      "A client-ready recap with key decisions, action items, owners, deadlines, open questions, risks or blockers, and a short follow-up email.",
    primaryFields: [
      {
        key: "notes",
        label: "Meeting notes",
        placeholder: "Example: Client wants homepage draft by Friday. Sarah sends logo files.",
        multiline: true,
      },
      { key: "project", label: "Client or project", placeholder: "Example: Acme homepage refresh" },
      { key: "deadlines", label: "Known deadlines", placeholder: "Example: Homepage draft due Friday" },
      {
        key: "extraNotes",
        label: "Extra notes",
        placeholder: "Example: Tone, context, follow-up preferences, or anything important",
        multiline: true,
      },
    ],
    optionalFields: [
      { key: "owners", label: "Task owners", placeholder: "Example: Sarah: logo files; me: homepage draft" },
      { key: "questions", label: "Open questions", placeholder: "Example: Pricing page copy still open" },
    ],
    privateNote:
      "If the notes include private client details, remove sensitive information before pasting them into an AI tool.",
    exampleInput:
      "Client wants homepage draft by Friday. Sarah sends logo files. Pricing page copy is still open.",
    exampleOutput: [
      "Subject: Recap and next steps from our homepage call",
      "Hi Sam,",
      "Thanks for today. The homepage draft is the next priority, with a target of Friday.",
      "Action items: Sarah will send logo files. I will prepare the homepage draft.",
      "Open question: We still need to confirm the pricing page copy.",
      "Best, [Your name]",
    ],
    checkBeforeUsing: [
      "Confirm every owner, deadline, and promise against your notes.",
      "Remove private details the client should not receive.",
      "Move unclear items into Open Questions instead of guessing.",
      "Read the email once as the client before sending.",
    ],
    buildPrompt(values) {
      return `Turn these meeting notes into a client-ready recap and follow-up email.

Meeting details:
${detailLines(values, meetingFields)}

Finished output:
1. Key decisions
2. Action items
3. Owners
4. Deadlines
5. Open questions
6. Risks or blockers
7. Short client-ready follow-up email

Rules:
- Use only the information in my notes.
- Do not invent decisions, deadlines, or promises.
- If something is unclear, put it under Open Questions.
- If the notes include private client details, remove sensitive information before pasting them into an AI tool.
- Keep the email professional, simple, and easy to scan.`;
    },
  },
};

function hasAnyInput(values: Record<string, string>): boolean {
  return Object.values(values).some((value) => value.trim().length > 0);
}

function filledFieldCount(values: Record<string, string>): number {
  return Object.values(values).filter((value) => value.trim().length > 0).length;
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the textarea fallback for restricted browser contexts.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Copy command failed.");
  }
}

function CopyIcon({ copied }: { readonly copied: boolean }) {
  if (copied) {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
        <path
          d="M16.25 5.75 8.5 13.5 4.75 9.75"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
      <path
        d="M7.5 6.5V4.75A1.75 1.75 0 0 1 9.25 3h4A1.75 1.75 0 0 1 15 4.75v6A1.75 1.75 0 0 1 13.25 12H11.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.25 8h4A1.75 1.75 0 0 1 11 9.75v5A1.75 1.75 0 0 1 9.25 16.5h-4A1.75 1.75 0 0 1 3.5 14.75v-5A1.75 1.75 0 0 1 5.25 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  onFocus,
  onBlur,
  inputRef,
}: {
  readonly field: PromptField;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onFocus?: () => void;
  readonly onBlur?: (value: string) => void;
  readonly inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}) {
  const inputClasses =
    "mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-900">{field.label}</span>
      {field.multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement | null> | undefined}
          value={value}
          onFocus={onFocus}
          onBlur={(event) => onBlur?.(event.target.value)}
          onChange={(event) => {
            onFocus?.();
            onChange(event.target.value);
          }}
          placeholder={field.placeholder}
          rows={4}
          className={`${inputClasses} resize-y`}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement | null> | undefined}
          value={value}
          onFocus={onFocus}
          onBlur={(event) => onBlur?.(event.target.value)}
          onChange={(event) => {
            onFocus?.();
            onChange(event.target.value);
          }}
          placeholder={field.placeholder}
          className={inputClasses}
        />
      )}
    </label>
  );
}

function SimpleCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

export default function GuideExecutionShortcut({ guide }: { readonly guide: Guide }) {
  const config = promptConfigs[guide.slug];
  const [values, setValues] = useState<Record<string, string>>({});
  const [showMore, setShowMore] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const resetTimer = useRef<number | undefined>(undefined);
  const startedFields = useRef<Set<string>>(new Set());
  const completedFields = useRef<Set<string>>(new Set());

  const generatedPrompt = useMemo(() => config?.buildPrompt(values) ?? "", [config, values]);
  const hasDetails = hasAnyInput(values);

  const baseGuideParams = useMemo(
    () => ({
      guide_slug: guide.slug,
      guide_title: guide.title,
      topic_cluster: guide.topicCluster,
    }),
    [guide.slug, guide.title, guide.topicCluster],
  );

  useEffect(() => {
    return () => {
      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  function trackCopyPrompt(actionLocation: CopyActionLocation) {
    trackEvent("copy_prompt_click", {
      ...baseGuideParams,
      action_location: actionLocation,
      filled_field_count: filledFieldCount(values),
      has_user_input: hasAnyInput(values),
    });
  }

  async function copyPrompt(actionLocation: CopyActionLocation): Promise<boolean> {
    trackCopyPrompt(actionLocation);

    try {
      await copyTextToClipboard(generatedPrompt);
      setCopyState("copied");
      window.dispatchEvent(new CustomEvent(PROMPT_COPIED_EVENT));

      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }

      resetTimer.current = window.setTimeout(() => setCopyState("idle"), 3200);
      return true;
    } catch {
      setCopyState("failed");
      return false;
    }
  }

  useEffect(() => {
    async function handleTopCopyRequest(event: Event) {
      const actionLocation =
        event instanceof CustomEvent && event.detail?.action_location === "top_button"
          ? "top_button"
          : "top_button";

      if (!hasAnyInput(values)) {
        trackCopyPrompt(actionLocation);
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        sectionRef.current?.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
        window.setTimeout(() => firstInputRef.current?.focus(), 250);
        return;
      }

      await copyPrompt(actionLocation);
    }

    window.addEventListener(PROMPT_COPY_REQUEST_EVENT, handleTopCopyRequest);
    return () => window.removeEventListener(PROMPT_COPY_REQUEST_EVENT, handleTopCopyRequest);
  });

  if (!config) {
    return null;
  }

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleFieldStarted(fieldKey: string) {
    if (startedFields.current.has(fieldKey)) {
      return;
    }

    startedFields.current.add(fieldKey);
    trackEvent("prompt_field_started", {
      ...baseGuideParams,
      field_key: fieldKey,
      action_location: "prompt_builder",
    });
  }

  function handleFieldBlur(fieldKey: string, value: string) {
    if (!value.trim() || completedFields.current.has(fieldKey)) {
      return;
    }

    completedFields.current.add(fieldKey);
    trackEvent("prompt_field_completed", {
      ...baseGuideParams,
      filled_field_count: filledFieldCount({ ...values, [fieldKey]: value }),
    });
  }

  return (
    <div ref={sectionRef} id="prompt-builder" className="scroll-mt-6 space-y-5">
      <SimpleCard title="What you'll make">
        <p className="mt-3 text-base leading-7 text-slate-700">{config.whatYouWillMake}</p>
      </SimpleCard>

      <section className="rounded-3xl border border-teal-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              Add details
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Add a few details for a better result
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              You can copy the prompt right away, but filling this in helps the AI give you a stronger result.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              After copying, paste the prompt into ChatGPT, Claude, Gemini, Copilot, or another AI chat tool.
            </p>
            {config.privateNote && (
              <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                {config.privateNote}
              </p>
            )}
          </div>

          <div className="grid gap-4">
            {config.primaryFields.map((field, index) => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key] ?? ""}
                onFocus={() => handleFieldStarted(field.key)}
                onChange={(value) => updateValue(field.key, value)}
                onBlur={(value) => handleFieldBlur(field.key, value)}
                inputRef={index === 0 ? firstInputRef : undefined}
              />
            ))}

            <button
              type="button"
              onClick={() => setShowMore((current) => !current)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              {showMore ? "Hide more details" : "More details"}
            </button>

            {showMore && (
              <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                {config.optionalFields.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={values[field.key] ?? ""}
                    onFocus={() => handleFieldStarted(field.key)}
                    onChange={(value) => updateValue(field.key, value)}
                    onBlur={(value) => handleFieldBlur(field.key, value)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="copy-prompt" className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              Use this prompt
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Copy one prompt and paste it into your AI tool
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
              Your details are inserted automatically. Blank fields stay as clear placeholders.
            </p>
          </div>

          <div className="sm:max-w-xs">
            <button
              type="button"
              data-event="copy_prompt_click"
              data-guide-slug={guide.slug}
              data-action-location="prompt_builder"
              onClick={() => copyPrompt("prompt_builder")}
              className="ateflo-primary-copy-button inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:w-auto sm:text-sm"
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                <CopyIcon copied={copyState === "copied"} />
                {copyState === "copied" ? "Copied!" : "Copy Prompt"}
              </span>
            </button>
            <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm leading-5 text-slate-600">
              {copyState === "copied"
                ? "Prompt copied. Now paste it into your AI tool."
                : copyState === "failed"
                  ? "Copy failed. Select the prompt text below and copy it manually."
                  : ""}
            </p>
          </div>
        </div>

        <pre className="mt-5 max-w-full whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-7 text-slate-100 [overflow-wrap:anywhere]">
          {generatedPrompt}
        </pre>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleCard title="Example result">
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Example input</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{config.exampleInput}</p>
          </div>
          <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">Example output</p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {config.exampleOutput.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </SimpleCard>

        <SimpleCard title="Check before using">
          <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
            {config.checkBeforeUsing.map((item) => (
              <li key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </SimpleCard>
      </div>
    </div>
  );
}
