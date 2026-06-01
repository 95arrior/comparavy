"use client";

import { useEffect, useRef, useState } from "react";
import type { Guide } from "@/lib/guides";

type PreviewType =
  | "ai_result"
  | "document_result"
  | "email_result"
  | "calendar_result"
  | "carousel_result"
  | "listing_result";

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
    type: "email_result",
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
    type: "listing_result",
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
    type: "listing_result",
    windowTitle: "AI tool output preview",
    resultLabel: "Listing result",
    inputTitle: "Input used",
    input:
      "Product facts, shop tone, buyer use case, and listing fields that need a title, description, bullets, and review notes.",
    resultTitle: "Polished Etsy-ready listing result",
    intro:
      "[Verified product name] - [style/material] [buyer use] with optional personalization",
    sections: [
      {
        heading: "Buyer-focused opening",
        items: [
          "A concise first paragraph that explains what the item is, who it is for, and how it can be used, based only on verified seller details.",
        ],
      },
      {
        heading: "Details to include",
        items: [
          "Materials and dimensions from the product sheet.",
          "Personalization options and character limits.",
          "Care instructions supplied by the seller.",
          "Shipping or processing note marked for seller confirmation.",
        ],
      },
      {
        heading: "Keyword and tag ideas",
        items: [
          "[product type], [recipient], [occasion], [material], [style], [custom option]",
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
    type: "calendar_result",
    windowTitle: "AI calendar workflow",
    resultLabel: "Tool-backed content plan",
    inputTitle: "Input used",
    input:
      "Offers, seasonal dates, common customer questions, team capacity, preferred channels, and where the calendar should live.",
    resultTitle: "Decision-ready calendar plan",
    rows: [
      {
        label: "Week 1",
        value: "Service education theme",
        meta: "AI chat tool drafts post angles and captions",
      },
      {
        label: "Week 2",
        value: "Customer question theme",
        meta: "Workspace tool tracks review status and owners",
      },
      {
        label: "Week 3",
        value: "Offer or event theme",
        meta: "Scheduler only after claims and dates are reviewed",
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
    type: "carousel_result",
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
    type: "ai_result",
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
    case "email_result":
      return "Email result";
    case "listing_result":
      return "Listing result";
    case "document_result":
      return "Document result";
    case "calendar_result":
      return "Calendar result";
    case "carousel_result":
      return "Carousel result";
    case "ai_result":
    default:
      return "AI result";
  }
}

function resultShellClass(type: PreviewType): string {
  switch (type) {
    case "listing_result":
      return "border-teal-200 bg-gradient-to-br from-white to-teal-50/50";
    case "calendar_result":
      return "border-emerald-200 bg-gradient-to-br from-white to-emerald-50/45";
    case "carousel_result":
      return "border-slate-200 bg-gradient-to-br from-white to-slate-50";
    case "email_result":
    case "document_result":
    case "ai_result":
    default:
      return "border-teal-100 bg-white";
  }
}

function renderSections(sections?: readonly PreviewSection[]) {
  if (!sections?.length) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {sections.map((section) => (
        <div key={section.heading} className="rounded-2xl bg-[#F6FBF8] p-3 sm:p-4">
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
          className="grid gap-2 rounded-2xl border border-emerald-100 bg-white/85 p-3 sm:grid-cols-[5rem_1fr]"
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
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
              {row.label}
            </span>
            <p className="text-sm font-semibold text-slate-950">{row.value}</p>
          </div>
          {row.meta ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">{row.meta}</p>
          ) : null}
        </div>
      ))}
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

  if (preview.type === "carousel_result") {
    return (
      <div className="space-y-4">
        {renderCarouselRows(preview.rows)}
        {renderSections(preview.sections)}
      </div>
    );
  }

  return renderSections(preview.sections);
}

export default function ResultPreviewFrame({ guide }: { readonly guide: Guide }) {
  const preview = PREVIEW_BY_SLUG[guide.slug] ?? fallbackPreview(guide);
  const previewRef = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const previewElement = previewRef.current;

    if (!previewElement) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.28,
      },
    );

    observer.observe(previewElement);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={previewRef}
      className={`overflow-hidden rounded-[1.5rem] border bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition-[opacity,transform,border-color,box-shadow] duration-500 ease-out motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 ${
        isInView
          ? "translate-y-0 scale-100 border-teal-200 opacity-100 shadow-[0_22px_58px_rgba(15,118,110,0.14)]"
          : "translate-y-2 scale-[0.965] border-teal-100 opacity-[0.88]"
      }`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-[#F8FAF8] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#ff6b5f]" />
          <span className="h-3 w-3 rounded-full bg-[#f6c85f]" />
          <span className="h-3 w-3 rounded-full bg-[#39c277]" />
        </div>
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {preview.windowTitle}
        </p>
        <span className="h-3 w-14" aria-hidden="true" />
      </div>

      <div className="bg-[#FCFBF7] p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              Example result
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950 sm:text-2xl">
              See what this shortcut can produce
            </h2>
          </div>
          <span className="inline-flex h-8 w-fit items-center justify-center rounded-full border border-teal-100 bg-teal-50 px-3 text-xs font-semibold text-teal-800">
            {typeLabel(preview.type)}
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white/85 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {preview.inputTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{preview.input}</p>
        </div>

        <div className={`mt-4 rounded-[1.25rem] border p-4 shadow-sm sm:p-5 ${resultShellClass(preview.type)}`}>
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                {preview.resultLabel}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950 sm:text-xl">
                {preview.resultTitle}
              </h3>
            </div>
            <span className="inline-flex h-8 w-fit items-center rounded-full bg-slate-950 px-3 text-xs font-semibold text-white">
              Review-ready draft
            </span>
          </div>

          {preview.intro ? (
            <p className="mt-4 rounded-2xl bg-white/75 p-3 text-sm font-medium leading-6 text-slate-800 sm:p-4">
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
  );
}
