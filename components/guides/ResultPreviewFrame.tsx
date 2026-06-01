import type { Guide } from "@/lib/guides";

interface PreviewSection {
  readonly heading: string;
  readonly items: readonly string[];
}

interface PreviewContent {
  readonly windowTitle: string;
  readonly beforeTitle: string;
  readonly before: readonly string[];
  readonly afterTitle: string;
  readonly after: readonly PreviewSection[];
  readonly whyItWorks: string;
}

const PREVIEW_BY_SLUG: Record<string, PreviewContent> = {
  "how-to-turn-meeting-notes-into-a-client-recap-with-ai": {
    windowTitle: "Client recap draft",
    beforeTitle: "Messy meeting notes",
    before: [
      "Client wants launch copy by Friday. Pricing page still open.",
      "Sarah sends logo files. We own homepage draft. Question: who approves testimonials?",
      "Need recap email, decisions, action items, open questions.",
    ],
    afterTitle: "Client-ready recap email",
    after: [
      {
        heading: "Subject",
        items: ["Recap: launch copy next steps and open approvals"],
      },
      {
        heading: "Decisions",
        items: [
          "Homepage draft is the next priority.",
          "Pricing page copy stays open until final package details are confirmed.",
        ],
      },
      {
        heading: "Action items",
        items: [
          "Sarah sends logo files.",
          "We prepare the homepage draft by Friday.",
          "Client confirms who approves testimonial wording.",
        ],
      },
      {
        heading: "Closing",
        items: ["Reply with the testimonial approver and any pricing-page constraints before Friday."],
      },
    ],
    whyItWorks:
      "It turns scattered notes into decisions, owners, questions, and a reply-friendly next step.",
  },
  "how-to-write-etsy-product-descriptions-with-ai": {
    windowTitle: "Listing draft preview",
    beforeTitle: "Rough product facts",
    before: [
      "Product name, material, dimensions, color, care notes, personalization rules, and buyer use case.",
      "Seller still needs to confirm shipping limits, processing time, and any claim not in the fact sheet.",
    ],
    afterTitle: "Reviewable listing draft",
    after: [
      {
        heading: "Product title",
        items: ["[Product name] - [material/color] [use case], [key verified detail]"],
      },
      {
        heading: "Buyer-focused opening",
        items: [
          "A clear first sentence that names the item, who it is for, and the main verified use.",
        ],
      },
      {
        heading: "Bullets",
        items: [
          "Material: [seller-provided material]",
          "Size or format: [seller-provided dimensions]",
          "Care or personalization: [verified seller notes]",
        ],
      },
      {
        heading: "Tag ideas",
        items: ["[product type], [buyer use], [material], [occasion], [style]"],
      },
      {
        heading: "Needs Seller Review",
        items: ["Confirm processing time, shipping limits, safety claims, trademark terms, and care instructions."],
      },
    ],
    whyItWorks:
      "It gives the seller a usable listing shape while keeping unsupported details in review fields.",
  },
  "best-ai-tools-for-etsy-product-descriptions": {
    windowTitle: "Etsy listing workflow preview",
    beforeTitle: "Rough product facts",
    before: [
      "Product fact sheet, buyer use case, shop tone, and listing fields that need drafting.",
      "Tool choice is still open: flexible draft, calmer rewrite, or repeatable shop voice.",
    ],
    afterTitle: "Tool-guided listing draft",
    after: [
      {
        heading: "Start here",
        items: ["Use a general AI chat tool for the first title, opening, bullets, and description draft."],
      },
      {
        heading: "Listing output",
        items: [
          "Title: [verified product name] with buyer-friendly keywords.",
          "Opening: one sentence that names the item and use case.",
          "Bullets: material, size, care, personalization, and review notes.",
        ],
      },
      {
        heading: "Needs Seller Review",
        items: ["Check every material, measurement, shipping, care, trademark, and safety detail before publishing."],
      },
    ],
    whyItWorks:
      "It connects tool choice to a concrete listing result instead of treating the tool as the outcome.",
  },
  "how-to-summarize-a-pdf-into-study-notes-with-ai": {
    windowTitle: "Study notes preview",
    beforeTitle: "Short document excerpt",
    before: [
      "A class reading or PDF section with headings, key terms, and passages the student is allowed to process.",
      "The source needs summarizing, quiz questions, and a review list.",
    ],
    afterTitle: "Study-ready notes",
    after: [
      {
        heading: "Overview",
        items: ["This section explains the main idea in plain language without adding outside facts."],
      },
      {
        heading: "Key concepts",
        items: ["Concept A: definition from the provided text.", "Concept B: why it matters in this section."],
      },
      {
        heading: "Quiz questions",
        items: ["What is the main difference between Concept A and Concept B?", "Which detail needs source review before memorizing?"],
      },
      {
        heading: "Needs review",
        items: ["Recheck names, formulas, dates, definitions, and any confusing term against the PDF."],
      },
    ],
    whyItWorks:
      "It separates summary, concepts, practice questions, and source-review items so the notes are usable for studying.",
  },
  "how-to-create-a-content-calendar-for-a-small-business-with-ai": {
    windowTitle: "Content calendar preview",
    beforeTitle: "Rough business info",
    before: [
      "Business type, services, local dates, offers, customer questions, available channels, and posting capacity.",
      "Needs a realistic plan without growth promises.",
    ],
    afterTitle: "Weekly planning draft",
    after: [
      {
        heading: "Week 1 calendar",
        items: [
          "Mon: customer question post for the main service.",
          "Wed: behind-the-scenes or process post.",
          "Fri: offer reminder with a clear next step.",
        ],
      },
      {
        heading: "Channel suggestions",
        items: ["Use Instagram for visual posts, email for existing customers, and Google Business Profile for local updates."],
      },
      {
        heading: "CTA ideas",
        items: ["Book a consultation.", "Reply with your question.", "Save this checklist for later."],
      },
      {
        heading: "Review checklist",
        items: ["Confirm dates, offer terms, service availability, and claims before scheduling."],
      },
    ],
    whyItWorks:
      "It turns loose business context into a schedule the owner can review without implying guaranteed results.",
  },
  "best-ai-tools-for-small-business-content-calendars": {
    windowTitle: "Calendar tool choice preview",
    beforeTitle: "Rough planning inputs",
    before: [
      "Offers, customer questions, seasonal dates, team capacity, and where the calendar should live.",
      "The business needs a plan and a tool choice, not a generic tool list.",
    ],
    afterTitle: "Decision-ready calendar plan",
    after: [
      {
        heading: "Calendar shape",
        items: ["Four weekly themes with post ideas, channel notes, owners, and review reminders."],
      },
      {
        heading: "Tool fit",
        items: [
          "Use an AI chat tool for theme and caption drafts.",
          "Use a workspace tool if the team needs shared planning.",
          "Use a scheduler only after posts are reviewed.",
        ],
      },
      {
        heading: "Review checklist",
        items: ["Check offer terms, dates, availability, images, and claims before publishing."],
      },
    ],
    whyItWorks:
      "It makes the tool decision depend on the finished calendar workflow, not the loudest feature list.",
  },
  "how-to-turn-a-blog-post-into-an-instagram-carousel-with-ai": {
    windowTitle: "Carousel outline preview",
    beforeTitle: "Blog source",
    before: [
      "A blog post with one main argument, supporting points, and a clear reader takeaway.",
      "Needs short slide text, caption draft, and a review pass against the article.",
    ],
    afterTitle: "Instagram carousel draft",
    after: [
      {
        heading: "Slide 1 hook",
        items: ["The one mistake readers make when they try [topic]."],
      },
      {
        heading: "Slide flow",
        items: [
          "Slide 2: define the problem.",
          "Slide 3: explain the first key point.",
          "Slide 4: show a practical example from the article.",
          "Slide 5: summarize the action step.",
        ],
      },
      {
        heading: "Caption draft",
        items: ["Short setup, one takeaway, and a prompt to read the full post or save the carousel."],
      },
      {
        heading: "Review checklist",
        items: ["Verify every claim against the blog post and remove any statistic, quote, or case study not in the source."],
      },
    ],
    whyItWorks:
      "It converts the article into slide beats while keeping the final check tied to the original source.",
  },
};

function fallbackPreview(guide: Guide): PreviewContent {
  return {
    windowTitle: "Shortcut output preview",
    beforeTitle: "Rough input",
    before: [
      guide.exampleWorkflow ??
        guide.contentGap ??
        "Messy source material, loose notes, or a rough draft.",
    ],
    afterTitle: "Reviewable finished output",
    after: [
      {
        heading: "Finished result",
        items: [
          guide.exampleResult ??
            guide.visualSummary.headline ??
            `A structured output for ${guide.useCase}.`,
        ],
      },
      {
        heading: "Review checklist",
        items: ["Check names, dates, claims, missing details, and sensitive information before using it."],
      },
    ],
    whyItWorks:
      "It shows the shape of the final result while keeping human review visible before use.",
  };
}

export default function ResultPreviewFrame({ guide }: { readonly guide: Guide }) {
  const preview = PREVIEW_BY_SLUG[guide.slug] ?? fallbackPreview(guide);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-teal-100 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[#ff6b5f]" />
          <span className="h-3 w-3 rounded-full bg-[#f6c85f]" />
          <span className="h-3 w-3 rounded-full bg-[#39c277]" />
        </div>
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {preview.windowTitle}
        </p>
        <span className="h-3 w-16" aria-hidden="true" />
      </div>

      <div className="bg-[#FCFBF7] p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Example transformation
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              See the result before you copy the prompt
            </h2>
          </div>
          <span className="inline-flex w-fit rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            Review-ready
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Before
            </p>
            <h3 className="mt-2 text-base font-semibold text-slate-900">
              {preview.beforeTitle}
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {preview.before.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                  After
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                  {preview.afterTitle}
                </h3>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" aria-hidden="true" />
            </div>

            <div className="mt-4 grid gap-3">
              {preview.after.map((section) => (
                <div key={section.heading} className="rounded-2xl bg-teal-50/45 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
                    {section.heading}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/85 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Why it works
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{preview.whyItWorks}</p>
        </div>
      </div>
    </section>
  );
}
