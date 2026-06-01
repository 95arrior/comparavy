import ScrollFocusReveal from "@/components/guides/ScrollFocusReveal";
import type { Guide } from "@/lib/guides";

type PreviewType =
  | "product_result"
  | "visual_content_result"
  | "document_result"
  | "decision_result"
  | "calendar_result";

interface PreviewSection {
  readonly heading: string;
  readonly items: readonly string[];
}

interface PreviewRow {
  readonly label: string;
  readonly value: string;
  readonly meta?: string;
}

interface PreviewContent {
  readonly type: PreviewType;
  readonly windowTitle: string;
  readonly resultLabel: string;
  readonly inputTitle: string;
  readonly input: string;
  readonly resultTitle: string;
  readonly intro?: string;
  readonly sections?: readonly PreviewSection[];
  readonly rows?: readonly PreviewRow[];
  readonly whyItWorks: string;
}

const PREVIEW_BY_SLUG: Record<string, PreviewContent> = {
  "how-to-turn-meeting-notes-into-a-client-recap-with-ai": {
    type: "document_result",
    windowTitle: "AI recap result",
    resultLabel: "Email and recap draft",
    inputTitle: "Input used",
    input:
      "Messy client meeting notes: launch copy due Friday, logo files from Sarah, pricing page unresolved, testimonial approver unknown.",
    resultTitle: "Client recap and follow-up email",
    intro:
      "Subject: Recap: launch copy next steps and open approvals",
    sections: [
      {
        heading: "Key decisions",
        items: [
          "Homepage draft is the next copy priority.",
          "Pricing page wording stays open until package details are confirmed.",
        ],
      },
      {
        heading: "Action items",
        items: [
          "Sarah owns final logo files. Deadline: before homepage draft review.",
          "We own the homepage draft. Deadline: Friday.",
          "Client owns testimonial approval path. Deadline: before final copy review.",
        ],
      },
      {
        heading: "Open questions",
        items: [
          "Who has final approval on testimonial edits?",
          "Are there pricing constraints we should avoid mentioning yet?",
        ],
      },
      {
        heading: "Follow-up note",
        items: [
          "Thanks for today. I’ll move forward with the homepage draft and hold the pricing page until the package details are final. Please send the testimonial approver and any pricing constraints before Friday so I can keep the draft accurate.",
        ],
      },
    ],
    whyItWorks:
      "The output matches the shortcut promise: decisions, owners, dates, open questions, and a sendable client follow-up.",
  },
  "how-to-write-etsy-product-descriptions-with-ai": {
    type: "document_result",
    windowTitle: "AI listing draft",
    resultLabel: "Etsy-ready draft",
    inputTitle: "Input used",
    input:
      "Seller-provided product facts: item name, verified materials, dimensions, color options, personalization rules, care notes, and intended buyer use.",
    resultTitle: "Reviewable Etsy listing draft",
    intro:
      "[Product name] - personalized [material] gift for [buyer/use case]",
    sections: [
      {
        heading: "Short description",
        items: [
          "A buyer-focused opening that names the item, explains the use case, and only uses details from the seller’s fact sheet.",
        ],
      },
      {
        heading: "Bullet details",
        items: [
          "Material: [seller-provided material]",
          "Size: [seller-provided dimensions]",
          "Personalization: [seller-provided options and limits]",
          "Care: [seller-provided care notes]",
        ],
      },
      {
        heading: "Keyword and tag ideas",
        items: [
          "[product type], [buyer use], [material], [occasion], [style], [personalization option]",
        ],
      },
      {
        heading: "Seller review",
        items: [
          "Confirm materials, measurements, personalization rules, processing time, shipping limits, and any safety or trademark-sensitive wording before publishing.",
        ],
      },
    ],
    whyItWorks:
      "It gives the seller a usable listing structure without inventing product claims or shop policies.",
  },
  "best-ai-tools-for-etsy-product-descriptions": {
    type: "decision_result",
    windowTitle: "AI tool decision preview",
    resultLabel: "Decision preview",
    inputTitle: "Input used",
    input:
      "Product facts, shop tone, buyer use case, and listing fields that need a title, description, bullets, and review notes.",
    resultTitle: "Choose the right tool for the listing job",
    intro:
      "Start with the tool that best matches the listing work you need to finish, then review the generated copy before publishing.",
    rows: [
      {
        label: "Use an AI chat tool",
        value: "Best when you need a title, buyer-focused opening, bullets, and a first description draft.",
        meta: "Good fit for flexible drafting from verified product facts.",
      },
      {
        label: "Use a calmer rewrite tool",
        value: "Best when the first draft sounds too salesy or needs a cleaner, more careful tone.",
        meta: "Keep every material, size, and policy detail tied to the seller's source notes.",
      },
      {
        label: "Use a design/workflow tool",
        value: "Best after the copy is reviewed and you need image layouts, shop assets, or a repeatable process.",
        meta: "Do not treat design polish as proof that product claims are verified.",
      },
    ],
    sections: [
      {
        heading: "Finished listing output",
        items: [
          "Title and buyer-focused opening.",
          "Materials and dimensions from the product sheet.",
          "Bullets, tag ideas, and Needs Seller Review notes.",
        ],
      },
      {
        heading: "Needs Seller Review",
        items: [
          "Check every material, measurement, shipping, care, trademark, and safety detail before publishing.",
        ],
      },
    ],
    whyItWorks:
      "The tool recommendation is grounded in the real deliverable: a listing draft the seller can review and improve.",
  },
  "how-to-summarize-a-pdf-into-study-notes-with-ai": {
    type: "document_result",
    windowTitle: "AI study notes result",
    resultLabel: "Study notes",
    inputTitle: "Input used",
    input:
      "A class PDF section with headings, key terms, and passages the student is allowed to summarize.",
    resultTitle: "Study-ready notes from the PDF",
    intro:
      "Overview: This section explains the main idea in plain language, using only the provided PDF text.",
    sections: [
      {
        heading: "Key concepts",
        items: [
          "Concept A: definition or explanation from the assigned reading.",
          "Concept B: how it connects to the section’s main argument.",
          "Term to verify: recheck the source wording before memorizing.",
        ],
      },
      {
        heading: "Study notes",
        items: [
          "Main idea: rewrite the section in plain language.",
          "Important detail: connect the definition to the example in the provided text.",
          "Memory cue: group related terms before practicing questions.",
        ],
      },
      {
        heading: "Quick review questions",
        items: [
          "What is the difference between Concept A and Concept B?",
          "Which example in the PDF supports the main idea?",
          "What detail needs source review before using it in class notes?",
        ],
      },
      {
        heading: "Answer check",
        items: [
          "Answers should come from the supplied PDF text, not outside knowledge or invented citations.",
        ],
      },
      {
        heading: "Needs review",
        items: [
          "Verify names, definitions, formulas, dates, citations, and any confusing terms against the original PDF.",
        ],
      },
    ],
    whyItWorks:
      "It creates usable study notes while keeping the review step tied to the source document.",
  },
  "how-to-create-a-content-calendar-for-a-small-business-with-ai": {
    type: "calendar_result",
    windowTitle: "AI calendar result",
    resultLabel: "Content plan",
    inputTitle: "Input used",
    input:
      "Business type, services, customer questions, available channels, local dates, offers, and weekly posting capacity.",
    resultTitle: "One-week small business content calendar",
    rows: [
      {
        label: "Mon",
        value: "Answer a common customer question",
        meta: "Instagram post - CTA: Save this checklist",
      },
      {
        label: "Wed",
        value: "Show the process behind the main service",
        meta: "Short video - CTA: Reply with your question",
      },
      {
        label: "Fri",
        value: "Remind customers about a verified offer",
        meta: "Email or local update - CTA: Book a consultation",
      },
    ],
    sections: [
      {
        heading: "Review before scheduling",
        items: [
          "Confirm dates, offer terms, service availability, images, and any claim before publishing.",
        ],
      },
    ],
    whyItWorks:
      "The output is a practical calendar the owner can review, not a vague marketing brainstorm or growth promise.",
  },
  "best-ai-tools-for-small-business-content-calendars": {
    type: "decision_result",
    windowTitle: "AI calendar tool decision",
    resultLabel: "Decision preview",
    inputTitle: "Input used",
    input:
      "Offers, seasonal dates, common customer questions, team capacity, preferred channels, and where the calendar should live.",
    resultTitle: "Choose the tool by the calendar bottleneck",
    rows: [
      {
        label: "Planning",
        value: "Use an AI chat tool when you need weekly themes, post angles, caption drafts, and CTAs.",
        meta: "Best when ideas and copy are the main bottleneck.",
      },
      {
        label: "Workflow",
        value: "Use a workspace tool when owners, review status, deadlines, and approvals need to stay visible.",
        meta: "Best when more than one person touches the calendar.",
      },
      {
        label: "Publishing",
        value: "Use a scheduler after dates, claims, assets, and offer details have been reviewed.",
        meta: "Best after the content plan is approved.",
      },
    ],
    sections: [
      {
        heading: "Tool fit",
        items: [
          "Use an AI chat tool for ideas and draft copy.",
          "Use a workspace tool if more than one person reviews the calendar.",
          "Use a scheduler after final human review.",
        ],
      },
    ],
    whyItWorks:
      "The preview shows how the tool choice supports the finished calendar workflow instead of acting as a generic tool list.",
  },
  "how-to-turn-a-blog-post-into-an-instagram-carousel-with-ai": {
    type: "visual_content_result",
    windowTitle: "AI carousel result",
    resultLabel: "Carousel outline",
    inputTitle: "Input used",
    input:
      "A blog post with one main argument, supporting points, and a clear reader takeaway.",
    resultTitle: "Slide-by-slide Instagram carousel plan",
    rows: [
      {
        label: "1",
        value: "Hook",
        meta: "Plan a week of posts without starting from zero",
      },
      {
        label: "2",
        value: "Problem",
        meta: "Posting feels hard when every idea starts as a blank page.",
      },
      {
        label: "3",
        value: "Key idea",
        meta: "Use one blog post as the source for several short teaching points.",
      },
      {
        label: "4",
        value: "Example",
        meta: "Pull one tip from the article and turn it into a one-sentence slide.",
      },
      {
        label: "5",
        value: "Action step",
        meta: "Pick one article, extract the main takeaway, and draft five slides.",
      },
    ],
    sections: [
      {
        heading: "Caption draft",
        items: [
          "Short setup, one takeaway, and a prompt to read the full post or save the carousel.",
        ],
      },
      {
        heading: "Review checklist",
        items: [
          "Verify every claim against the blog post and remove any statistic, quote, or case study not in the source.",
        ],
      },
    ],
    whyItWorks:
      "It turns the blog post into visible slide beats, which is the real output users need before opening a design tool.",
  },
};

function fallbackPreview(guide: Guide): PreviewContent {
  return {
    type: "document_result",
    windowTitle: "AI result preview",
    resultLabel: "Reviewable result",
    inputTitle: "Input used",
    input:
      guide.exampleWorkflow ??
      guide.contentGap ??
      "Messy source material, loose notes, or a rough draft.",
    resultTitle: "Finished output shape",
    intro:
      guide.exampleResult ??
      guide.visualSummary.headline ??
      `A structured output for ${guide.useCase}.`,
    sections: [
      {
        heading: "Review checklist",
        items: [
          "Check names, dates, claims, missing details, and sensitive information before using it.",
        ],
      },
    ],
    whyItWorks:
      "It shows the realistic shape of the final result while keeping human review visible before use.",
  };
}

function typeLabel(type: PreviewType): string {
  switch (type) {
    case "product_result":
      return "Product result";
    case "visual_content_result":
      return "Visual content result";
    case "document_result":
      return "Document result";
    case "decision_result":
      return "Decision result";
    case "calendar_result":
      return "Calendar result";
    default:
      return "Result preview";
  }
}

function resultShellClass(type: PreviewType): string {
  switch (type) {
    case "product_result":
      return "border-teal-200 bg-gradient-to-br from-white via-teal-50/60 to-white";
    case "visual_content_result":
      return "border-teal-200 bg-gradient-to-br from-white via-slate-50 to-teal-50";
    case "calendar_result":
      return "border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50";
    case "decision_result":
      return "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50/60";
    case "document_result":
    default:
      return "border-teal-200 bg-gradient-to-br from-white via-white to-teal-50/70";
  }
}

function renderSections(sections?: readonly PreviewSection[]) {
  if (!sections?.length) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {sections.map((section) => (
        <div
          key={section.heading}
          className="rounded-2xl border border-teal-100 bg-white p-3 shadow-sm sm:p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
            {section.heading}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function renderCalendarRows(rows?: readonly PreviewRow[]) {
  if (!rows?.length) {
    return null;
  }

  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="grid gap-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm sm:grid-cols-[5rem_1fr]"
        >
          <div className="inline-flex h-9 w-fit items-center rounded-full bg-emerald-100 px-3 text-sm font-semibold text-emerald-900 sm:w-full sm:justify-center">
            {row.label}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">{row.value}</p>
            {row.meta ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">{row.meta}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderCarouselRows(rows?: readonly PreviewRow[]) {
  if (!rows?.length) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="flex min-h-[8.75rem] flex-col rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50/60 p-3 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
              {row.label}
            </span>
            <p className="text-sm font-semibold text-slate-950">{row.value}</p>
          </div>
          {row.meta ? (
            <p className="mt-auto pt-3 text-sm leading-6 text-slate-600">{row.meta}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function renderDecisionRows(rows?: readonly PreviewRow[]) {
  if (!rows?.length) {
    return null;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
            {row.label}
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-950">{row.value}</p>
          {row.meta ? (
            <p className="mt-auto pt-3 text-sm leading-6 text-slate-600">{row.meta}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function renderProductRows(rows?: readonly PreviewRow[]) {
  if (!rows?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="rounded-xl bg-teal-50/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
              {row.label}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{row.value}</p>
            {row.meta ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">{row.meta}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderResultBody(preview: PreviewContent) {
  if (preview.type === "calendar_result") {
    return (
      <div className="space-y-4">
        {renderCalendarRows(preview.rows)}
        {renderSections(preview.sections)}
      </div>
    );
  }

  if (preview.type === "visual_content_result") {
    return (
      <div className="space-y-4">
        {renderCarouselRows(preview.rows)}
        {renderSections(preview.sections)}
      </div>
    );
  }

  if (preview.type === "decision_result") {
    return (
      <div className="space-y-4">
        {renderDecisionRows(preview.rows)}
        {renderSections(preview.sections)}
      </div>
    );
  }

  if (preview.type === "product_result") {
    return (
      <div className="space-y-4">
        {renderProductRows(preview.rows)}
        {renderSections(preview.sections)}
      </div>
    );
  }

  return renderSections(preview.sections);
}

export default function ResultPreviewFrame({ guide }: { readonly guide: Guide }) {
  const preview = PREVIEW_BY_SLUG[guide.slug] ?? fallbackPreview(guide);

  return (
    <ScrollFocusReveal>
      <section className="overflow-hidden rounded-[1.65rem] bg-gradient-to-br from-teal-900 via-teal-700 to-slate-950 p-[1px] shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="flex items-center justify-between gap-4 rounded-t-[1.6rem] border-b border-white/10 bg-slate-950/70 px-4 py-3 text-white sm:px-5">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#ff6b5f]" />
            <span className="h-3 w-3 rounded-full bg-[#f6c85f]" />
            <span className="h-3 w-3 rounded-full bg-[#39c277]" />
          </div>
          <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.14em] text-teal-50">
            {preview.windowTitle}
          </p>
          <span className="hidden h-3 w-14 rounded-full bg-white/10 sm:block" aria-hidden="true" />
        </div>

        <div className="rounded-b-[1.6rem] bg-[#FCFBF7] p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                Result preview
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950 sm:text-2xl">
                A realistic output this shortcut is built to create
              </h2>
            </div>
            <span className="inline-flex h-8 w-fit items-center justify-center rounded-full border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-800 shadow-sm">
              {typeLabel(preview.type)}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-teal-100 bg-white/90 p-3 shadow-sm sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {preview.inputTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{preview.input}</p>
          </div>

          <div className={`mt-4 rounded-[1.35rem] border p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-5 ${resultShellClass(preview.type)}`}>
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                  {preview.resultLabel}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950 sm:text-xl">
                  {preview.resultTitle}
                </h3>
              </div>
              <span className="inline-flex h-8 w-fit items-center rounded-full bg-teal-900 px-3 text-xs font-semibold text-white">
                Review-ready draft
              </span>
            </div>

            {preview.intro ? (
              <p className="mt-4 rounded-2xl border border-slate-100 bg-white p-3 text-sm font-medium leading-6 text-slate-800 shadow-sm sm:p-4">
                {preview.intro}
              </p>
            ) : null}

            <div className="mt-4">{renderResultBody(preview)}</div>
          </div>

          <div className="mt-4 rounded-2xl border border-teal-100 bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
              Why it works
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{preview.whyItWorks}</p>
          </div>
        </div>
      </section>
    </ScrollFocusReveal>
  );
}
