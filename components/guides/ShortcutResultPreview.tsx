import type { ReactNode } from "react";

type ShortcutPreviewKind =
  | "recap"
  | "listing"
  | "study"
  | "calendar"
  | "carousel"
  | "decision"
  | "structured";

interface ShortcutResultPreviewProps {
  readonly slug: string;
  readonly title?: string;
  readonly topicCluster?: string;
  readonly className?: string;
  readonly variant?: "card" | "detail";
}

interface PreviewTemplate {
  readonly kind: ShortcutPreviewKind;
  readonly eyebrow: string;
  readonly title: string;
}

const PREVIEW_BY_SLUG: Record<string, PreviewTemplate> = {
  "how-to-turn-meeting-notes-into-a-client-recap-with-ai": {
    kind: "recap",
    eyebrow: "Recap result",
    title: "Client-ready recap",
  },
  "best-ai-tools-for-etsy-product-descriptions": {
    kind: "decision",
    eyebrow: "Tool decision",
    title: "Listing copy path",
  },
  "how-to-write-etsy-product-descriptions-with-ai": {
    kind: "listing",
    eyebrow: "Listing result",
    title: "Review-ready listing",
  },
  "how-to-summarize-a-pdf-into-study-notes-with-ai": {
    kind: "study",
    eyebrow: "Study result",
    title: "Notes and review",
  },
  "best-ai-tools-for-small-business-content-calendars": {
    kind: "decision",
    eyebrow: "Tool decision",
    title: "Calendar workflow",
  },
  "how-to-create-a-content-calendar-for-a-small-business-with-ai": {
    kind: "calendar",
    eyebrow: "Calendar result",
    title: "Weekly plan",
  },
  "how-to-turn-a-blog-post-into-an-instagram-carousel-with-ai": {
    kind: "carousel",
    eyebrow: "Carousel result",
    title: "Slide outline",
  },
};

function previewFor({
  slug,
  title,
  topicCluster,
}: Pick<ShortcutResultPreviewProps, "slug" | "title" | "topicCluster">): PreviewTemplate {
  const direct = PREVIEW_BY_SLUG[slug];

  if (direct) {
    return direct;
  }

  const source = `${title ?? ""} ${topicCluster ?? ""} ${slug}`.toLowerCase();

  if (source.includes("meeting") || source.includes("recap") || source.includes("email")) {
    return { kind: "recap", eyebrow: "Recap result", title: "Clean summary" };
  }

  if (source.includes("etsy") || source.includes("listing") || source.includes("product")) {
    return { kind: "listing", eyebrow: "Listing result", title: "Product copy" };
  }

  if (source.includes("pdf") || source.includes("study") || source.includes("notes")) {
    return { kind: "study", eyebrow: "Study result", title: "Review notes" };
  }

  if (source.includes("calendar") || source.includes("plan")) {
    return { kind: "calendar", eyebrow: "Plan result", title: "Content plan" };
  }

  if (source.includes("carousel") || source.includes("instagram") || source.includes("social")) {
    return { kind: "carousel", eyebrow: "Visual result", title: "Slide plan" };
  }

  if (source.includes("tool") || source.includes("compare") || source.includes("best")) {
    return { kind: "decision", eyebrow: "Decision result", title: "Best fit" };
  }

  return { kind: "structured", eyebrow: "Result preview", title: "Structured output" };
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Frame({
  children,
  className,
  variant,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly variant: "card" | "detail";
}) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-[1.45rem] border border-teal-100 bg-[#F7FBF7] shadow-[0_18px_46px_rgba(15,23,42,0.10)]",
        variant === "detail" ? "p-3 sm:p-4" : "p-2.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function PreviewHeader({
  eyebrow,
  title,
  tone = "teal",
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly tone?: "teal" | "slate" | "emerald";
}) {
  const dotClass =
    tone === "slate" ? "bg-slate-700" : tone === "emerald" ? "bg-emerald-600" : "bg-teal-600";

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {eyebrow}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-950">{title}</p>
      </div>
      <span className={cx("mt-1 h-3 w-3 rounded-full", dotClass)} aria-hidden="true" />
    </div>
  );
}

function RecapPreview({
  template,
  variant,
}: {
  readonly template: PreviewTemplate;
  readonly variant: "card" | "detail";
}) {
  return (
    <Frame variant={variant}>
      <div className="rounded-[1.15rem] border border-slate-200 bg-white p-4">
        <PreviewHeader eyebrow={template.eyebrow} title={template.title} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {["Decisions", "Actions", "Open Qs"].map((label, index) => (
            <div key={label} className="rounded-2xl border border-teal-100 bg-teal-50/60 p-3">
              <p className="text-xs font-semibold text-teal-900">{label}</p>
              <div className="mt-2 space-y-1.5" aria-hidden="true">
                <span className="block h-2 rounded-full bg-teal-700/70" />
                <span
                  className={cx(
                    "block h-2 rounded-full bg-teal-700/25",
                    index === 1 ? "w-10/12" : "w-8/12",
                  )}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">Follow-up note</p>
          <div className="mt-2 space-y-1.5" aria-hidden="true">
            <span className="block h-2 rounded-full bg-slate-300" />
            <span className="block h-2 w-9/12 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    </Frame>
  );
}

function ListingPreview({
  template,
  variant,
}: {
  readonly template: PreviewTemplate;
  readonly variant: "card" | "detail";
}) {
  return (
    <Frame variant={variant}>
      <div className="rounded-[1.15rem] border border-teal-100 bg-white p-4">
        <PreviewHeader eyebrow={template.eyebrow} title={template.title} />
        <div className="mt-4 grid gap-4 sm:grid-cols-[6.5rem_1fr]">
          <div className="aspect-square rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-100 via-white to-emerald-100" />
          <div>
            <div className="h-3 w-10/12 rounded-full bg-slate-800" aria-hidden="true" />
            <div className="mt-3 space-y-2" aria-hidden="true">
              <span className="block h-2 rounded-full bg-slate-200" />
              <span className="block h-2 w-8/12 rounded-full bg-slate-200" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Title", "Bullets", "Tags"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function StudyPreview({
  template,
  variant,
}: {
  readonly template: PreviewTemplate;
  readonly variant: "card" | "detail";
}) {
  return (
    <Frame variant={variant}>
      <div className="rounded-[1.15rem] border border-slate-200 bg-white p-4">
        <PreviewHeader eyebrow={template.eyebrow} title={template.title} />
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem]">
          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-3">
            <p className="text-xs font-semibold text-teal-900">Key concepts</p>
            <div className="mt-3 space-y-2" aria-hidden="true">
              <span className="block h-2 rounded-full bg-teal-700/60" />
              <span className="block h-2 w-10/12 rounded-full bg-teal-700/25" />
              <span className="block h-2 w-8/12 rounded-full bg-teal-700/25" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Quiz</p>
            <div className="mt-3 grid gap-2" aria-hidden="true">
              <span className="h-8 rounded-xl bg-white shadow-sm" />
              <span className="h-8 rounded-xl bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function CalendarPreview({
  template,
  variant,
}: {
  readonly template: PreviewTemplate;
  readonly variant: "card" | "detail";
}) {
  return (
    <Frame variant={variant}>
      <div className="rounded-[1.15rem] border border-emerald-100 bg-white p-4">
        <PreviewHeader eyebrow={template.eyebrow} title={template.title} tone="emerald" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Mon", "Question"],
            ["Wed", "Process"],
            ["Fri", "Offer"],
          ].map(([day, label]) => (
            <div key={day} className="min-h-24 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
              <p className="text-xs font-bold text-emerald-900">{day}</p>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-700">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function CarouselPreview({
  template,
  variant,
}: {
  readonly template: PreviewTemplate;
  readonly variant: "card" | "detail";
}) {
  return (
    <Frame variant={variant}>
      <div className="rounded-[1.15rem] border border-teal-100 bg-white p-4">
        <PreviewHeader eyebrow={template.eyebrow} title={template.title} />
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {[
            ["1", "Hook"],
            ["2", "Problem"],
            ["3", "Idea"],
            ["4", "Example"],
            ["5", "CTA"],
          ].map(([number, label]) => (
            <div
              key={number}
              className="flex min-h-24 flex-col justify-between rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 p-3 shadow-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                {number}
              </span>
              <p className="text-xs font-semibold leading-5 text-slate-800">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function DecisionPreview({
  template,
  variant,
}: {
  readonly template: PreviewTemplate;
  readonly variant: "card" | "detail";
}) {
  return (
    <Frame variant={variant}>
      <div className="rounded-[1.15rem] border border-slate-200 bg-white p-4">
        <PreviewHeader eyebrow={template.eyebrow} title={template.title} tone="slate" />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {["Draft", "Review", "Publish"].map((label, index) => (
            <div
              key={label}
              className={cx(
                "rounded-2xl border p-3",
                index === 0
                  ? "border-teal-200 bg-teal-50"
                  : "border-slate-100 bg-slate-50",
              )}
            >
              <p className="text-xs font-semibold text-slate-800">{label}</p>
              <span
                className={cx(
                  "mt-3 block h-2 rounded-full",
                  index === 0 ? "bg-teal-700/70" : "bg-slate-300",
                )}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function StructuredPreview({
  template,
  variant,
}: {
  readonly template: PreviewTemplate;
  readonly variant: "card" | "detail";
}) {
  return (
    <Frame variant={variant}>
      <div className="rounded-[1.15rem] border border-teal-100 bg-white p-4">
        <PreviewHeader eyebrow={template.eyebrow} title={template.title} />
        <div className="mt-4 grid gap-2">
          {["Input", "Prompt", "Result"].map((label, index) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                {index + 1}
              </span>
              <p className="text-xs font-semibold text-slate-800">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export default function ShortcutResultPreview({
  slug,
  title,
  topicCluster,
  className,
  variant = "card",
}: ShortcutResultPreviewProps) {
  const template = previewFor({ slug, title, topicCluster });
  let preview: ReactNode;

  switch (template.kind) {
    case "recap":
      preview = <RecapPreview template={template} variant={variant} />;
      break;
    case "listing":
      preview = <ListingPreview template={template} variant={variant} />;
      break;
    case "study":
      preview = <StudyPreview template={template} variant={variant} />;
      break;
    case "calendar":
      preview = <CalendarPreview template={template} variant={variant} />;
      break;
    case "carousel":
      preview = <CarouselPreview template={template} variant={variant} />;
      break;
    case "decision":
      preview = <DecisionPreview template={template} variant={variant} />;
      break;
    case "structured":
    default:
      preview = <StructuredPreview template={template} variant={variant} />;
      break;
  }

  return className ? <div className={className}>{preview}</div> : preview;
}
