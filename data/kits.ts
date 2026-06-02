export type KitStatus = "active" | "coming-soon";

export interface KitModule {
  readonly title: string;
  readonly detail: string;
}

export interface KitFaqItem {
  readonly question: string;
  readonly answer: string;
}

export interface AteFloKit {
  readonly slug: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly status: KitStatus;
  readonly isFeatured?: boolean;
  readonly productLabel?: string;
  readonly audience: string;
  readonly outcome: string;
  readonly pain: string;
  readonly oneLinePromise: string;
  readonly whatIsInside: readonly string[];
  readonly modules: readonly KitModule[];
  readonly sampleItems: readonly string[];
  readonly priceLabel: string;
  readonly ctaLabel: string;
  readonly checkoutUrlEnvKey?: string;
  readonly checkoutUrl?: string;
  readonly relatedShortcutSlugs: readonly string[];
  readonly safetyNotes: readonly string[];
  readonly faq: readonly KitFaqItem[];
}

const jobKitCheckoutUrl = process.env.NEXT_PUBLIC_JOB_KIT_CHECKOUT_URL;
const localBusinessKitCheckoutUrl =
  process.env.NEXT_PUBLIC_LOCAL_BUSINESS_KIT_CHECKOUT_URL;

export const kits: readonly AteFloKit[] = [
  {
    slug: "local-business-ai-visibility-kit",
    title: "Local Business AI Visibility Kit",
    shortTitle: "Local Business Kit",
    status: "active",
    isFeatured: true,
    productLabel: "Flagship kit",
    audience:
      "Local business owners, service providers, solo operators, and small teams.",
    outcome:
      "Review-ready local marketing assets and setup guidance for Google Business Profile, website pages, social posts, and weekly visibility work.",
    pain:
      "Local business owners do not just need AI copy. They need posts, review replies, page copy, and setup steps in the right order without invented business claims.",
    oneLinePromise:
      "Turn your business details into local posts, website copy, review replies, and visibility checklists you can review and use.",
    whatIsInside: [
      "Business Input Worksheet for services, location, offers, tone, restrictions, and details AI must not invent",
      "Prompt sequence for Google Business Profile posts, review replies, website copy, social captions, and local promotion ideas",
      "Reusable local post, review response, website copy, and social caption templates",
      "Visibility setup checklist for GA4, Search Console, Meta Pixel, and profile basics as guided steps",
      "30-day local visibility plan plus final owner review checklist",
    ],
    modules: [
      {
        title: "Business Input Worksheet",
        detail:
          "Collect the business facts, service area, customer type, offers, tone, and restrictions before generating anything.",
      },
      {
        title: "Google Business Profile Post System",
        detail:
          "Create updates, offers, event-style posts, local promotion ideas, CTAs, and owner review notes.",
      },
      {
        title: "Review Response Pack",
        detail:
          "Draft respectful review replies without inventing customer details, refunds, promises, or private information.",
      },
      {
        title: "Local Website Copy Pack",
        detail:
          "Build homepage, service page, FAQ, and location-focused copy from verified business details.",
      },
      {
        title: "Social Content Pack",
        detail:
          "Turn local offers, seasonal updates, and service notes into Instagram and Facebook captions.",
      },
      {
        title: "Visibility Setup Checklist",
        detail:
          "Use guided setup steps for Google Business Profile basics, GA4, Search Console, Meta Pixel, and profile review.",
      },
      {
        title: "30-Day Local Visibility Plan",
        detail:
          "Plan a month of repeatable local updates, review response checks, service copy improvements, and social posts.",
      },
      {
        title: "Final Review Checklist",
        detail:
          "Check prices, dates, certifications, hours, offers, review language, and claims before publishing.",
      },
    ],
    sampleItems: [
      "Input: local dog grooming salon in Austin, summer de-shedding appointments, busy pet owners",
      "Output: Google Business Profile update, short social caption, CTA, and owner review checklist",
      "Review: confirm offer details, appointment availability, pricing, dates, and any claims before publishing",
    ],
    priceLabel: localBusinessKitCheckoutUrl ? "Paid kit" : "Early access",
    ctaLabel: localBusinessKitCheckoutUrl ? "Get the kit" : "Get early access",
    checkoutUrlEnvKey: "NEXT_PUBLIC_LOCAL_BUSINESS_KIT_CHECKOUT_URL",
    checkoutUrl: localBusinessKitCheckoutUrl,
    relatedShortcutSlugs: ["how-to-write-google-business-profile-posts-with-ai"],
    safetyNotes: [
      "No guaranteed rankings, leads, sales, customers, income, or business growth.",
      "No fake reviews, review manipulation, fake testimonials, or invented customer stories.",
      "No invented discounts, prices, certifications, hours, availability, or service details.",
      "Setup checklists are guidance only; the kit does not automatically install analytics, pixels, or business tools.",
    ],
    faq: [
      {
        question: "Does this guarantee more customers?",
        answer:
          "No. It helps you create and review local marketing assets, but results depend on your business, market, execution, and many factors outside the kit.",
      },
      {
        question: "Does it write Google Business Profile posts?",
        answer:
          "Yes. The kit includes prompts and templates for Google Business Profile updates, offers, event-style posts, CTAs, and owner review checklists.",
      },
      {
        question: "Can I use it in Korea and globally?",
        answer:
          "Yes. The workflow can be used in English, Korean, or another language if your AI tool supports it. You should still review local wording, compliance, platform rules, and business details.",
      },
      {
        question: "Does it work for Naver Place or Instagram?",
        answer:
          "The kit is structured around local visibility assets and can help draft copy for platforms such as Naver Place, Instagram, Facebook, and Google Business Profile. It does not automatically publish or configure those platforms.",
      },
      {
        question: "Is this a marketing agency service?",
        answer:
          "No. It is a self-serve AI workflow kit. It gives you worksheets, prompts, templates, and checklists so you can create and review your own assets.",
      },
      {
        question: "What do I receive?",
        answer:
          "The intended kit includes a business input worksheet, prompt sequence library, local post templates, review response templates, website copy builder, social caption builder, visibility setup checklist, 30-day plan, and final review checklist.",
      },
      {
        question: "Which AI tools can I use?",
        answer:
          "Use it with ChatGPT, Claude, Gemini, Copilot, or another AI chat tool that can work from pasted business details and instructions.",
      },
      {
        question: "Can I edit everything?",
        answer:
          "Yes. The workflow is built for owner review and editing. You should adjust every asset for your real business details before publishing.",
      },
    ],
  },
  {
    slug: "job-application-ai-kit",
    title: "Job Application AI Kit",
    shortTitle: "Job Application Kit",
    status: "active",
    isFeatured: false,
    productLabel: "Secondary kit",
    audience:
      "Job seekers, career switchers, students, freelancers, and people applying to multiple roles.",
    outcome:
      "Turn a job post and real experience notes into application materials you can review, edit, and send.",
    pain:
      "Job applications ask for specific evidence, but generic AI prompts often create vague bullets, invented experience, or cover letters that sound detached from the role.",
    oneLinePromise:
      "Turn job posts and real experience notes into application drafts you can review and edit.",
    whatIsInside: [
      "Input worksheet for job posts, experience notes, role requirements, and tone",
      "Prompt sequence for resume bullets, cover letters, LinkedIn About copy, interview answers, and follow-up emails",
      "Example inputs and outputs so you can see the workflow before using it",
      "Revision prompts for tightening, changing tone, and removing unsupported claims",
      "Final application checklist for facts, dates, claims, and missing details",
    ],
    modules: [
      {
        title: "Job post analyzer",
        detail:
          "Extract responsibilities, required skills, keywords, risks, and evidence gaps from the role description.",
      },
      {
        title: "Resume bullet builder",
        detail:
          "Turn real experience notes into stronger bullets without inventing metrics, titles, tools, or outcomes.",
      },
      {
        title: "Skills match prompt",
        detail:
          "Map your actual skills to the role and flag any missing proof before you apply.",
      },
      {
        title: "Cover letter builder",
        detail:
          "Draft a focused cover letter that connects your experience to the job instead of sounding generic.",
      },
      {
        title: "LinkedIn About rewrite",
        detail:
          "Create a profile summary that supports the direction of your search without overstating experience.",
      },
      {
        title: "Interview answer builder",
        detail:
          "Prepare role-specific answers from your real examples, constraints, and accomplishments.",
      },
      {
        title: "Recruiter follow-up email",
        detail:
          "Write concise follow-ups for after applying, after interviews, and after sending materials.",
      },
      {
        title: "Final application checklist",
        detail:
          "Review every generated output for accuracy, unsupported claims, dates, names, and fit.",
      },
    ],
    sampleItems: [
      "Input: a pasted job post, 5-8 experience notes, target tone, and details to avoid",
      "Output: tailored resume bullet options, a cover letter outline, and a review checklist",
      "Review: confirm every claim, remove invented metrics, and mark weak evidence before sending",
    ],
    priceLabel: jobKitCheckoutUrl ? "Paid kit" : "Early access",
    ctaLabel: jobKitCheckoutUrl ? "Get the kit" : "Get early access",
    checkoutUrlEnvKey: "NEXT_PUBLIC_JOB_KIT_CHECKOUT_URL",
    checkoutUrl: jobKitCheckoutUrl,
    relatedShortcutSlugs: [],
    safetyNotes: [
      "Does not guarantee interviews, hiring, ATS ranking, salary increases, or recruiter responses.",
      "Uses do-not-invent rules for job titles, dates, metrics, credentials, tools, and experience.",
      "Requires human review before sending any application material.",
    ],
    faq: [
      {
        question: "Which AI tools can I use?",
        answer:
          "Use the kit with ChatGPT, Claude, Gemini, Copilot, or another AI chat tool that can work from pasted job posts and experience notes.",
      },
      {
        question: "Is this a resume writing service?",
        answer:
          "No. It is a self-serve AI workflow kit. It gives you prompts, examples, checklists, and revision steps so you can create and review your own materials.",
      },
      {
        question: "Does this guarantee a job?",
        answer:
          "No. The kit helps you structure and review application materials, but it cannot guarantee interviews, offers, recruiter responses, ATS results, or hiring outcomes.",
      },
      {
        question: "Can I use it in Korean and English?",
        answer:
          "Yes. The prompts can ask your AI tool to draft in English, Korean, or both. You should still review tone, facts, and role-specific wording before sending.",
      },
      {
        question: "What do I receive after purchase?",
        answer:
          "The intended kit includes an input worksheet, prompt sequence, example inputs and outputs, revision prompts, and final review checklists.",
      },
      {
        question: "Can I edit the outputs?",
        answer:
          "Yes. The workflow is built for editing. The kit should help you get a safer first draft, then revise it until it sounds accurate and specific to you.",
      },
    ],
  },
  {
    slug: "dating-profile-rewrite-kit",
    title: "Dating Profile Rewrite Kit",
    shortTitle: "Dating Profile Kit",
    status: "coming-soon",
    isFeatured: false,
    audience:
      "People who want a more natural dating profile without sounding generic or AI-written.",
    outcome:
      "Create bio options, prompt answers, opening-line ideas, and a review checklist from real personal details.",
    pain:
      "Generic AI dating copy can sound polished but false, awkward, desperate, or detached from the person using it.",
    oneLinePromise:
      "Turn real personal details into profile options that sound natural, specific, and editable.",
    whatIsInside: [
      "Input worksheet for personality, interests, tone, boundaries, and things to avoid",
      "Prompt sequence for bios, app prompts, opening lines, and tone revisions",
      "Cliche filter and truth-check checklist",
      "Example options that are specific without promising dating results",
    ],
    modules: [
      {
        title: "Profile input worksheet",
        detail: "Collect real details before asking AI to draft anything.",
      },
      {
        title: "Bio option builder",
        detail: "Generate natural options in different tones without invented traits.",
      },
      {
        title: "Cliche and truth check",
        detail: "Remove generic lines and anything that does not sound like the user.",
      },
    ],
    sampleItems: [
      "Input: interests, personality, app style, relationship goal, and boundaries",
      "Output: bio options, prompt answers, and a does-this-sound-like-me checklist",
    ],
    priceLabel: "Coming soon",
    ctaLabel: "View details",
    relatedShortcutSlugs: [
      "how-to-write-a-dating-app-bio-with-ai-without-sounding-generic",
    ],
    safetyNotes: [
      "No guaranteed matches, dates, romantic success, or engagement claims.",
      "No invented personality, lifestyle, job, income, height, or relationship goals.",
    ],
    faq: [
      {
        question: "Will this write a fake profile?",
        answer:
          "No. The intended workflow is built around real details and review prompts so users can remove anything untrue.",
      },
    ],
  },
  {
    slug: "content-repurposing-kit",
    title: "Content Repurposing Kit",
    shortTitle: "Content Repurposing Kit",
    status: "coming-soon",
    isFeatured: false,
    audience:
      "Creators, consultants, and small teams turning one source into multiple content assets.",
    outcome:
      "A repeatable workflow for turning one source into captions, post outlines, newsletter ideas, and review-ready snippets.",
    pain:
      "Repurposing often turns into scattered drafts, repeated phrasing, or platform copy that does not fit the original source.",
    oneLinePromise:
      "Turn one article, transcript, or idea into multiple platform-ready drafts with review steps.",
    whatIsInside: [
      "Source input worksheet",
      "Prompt sequence for summaries, captions, newsletter angles, and post ideas",
      "Platform-fit checklist",
      "Revision prompts for tone, length, and audience",
    ],
    modules: [
      {
        title: "Source Input Worksheet",
        detail: "Capture the original source, audience, claims, and sections to avoid.",
      },
      {
        title: "Repurposing Prompt Sequence",
        detail: "Draft multiple asset types without losing the source meaning.",
      },
      {
        title: "Platform Review Checklist",
        detail: "Check each draft for fit, accuracy, length, and repeated wording.",
      },
    ],
    sampleItems: [
      "Input: article, transcript, or long post plus audience and platforms",
      "Output: caption options, post ideas, newsletter angle, and review checklist",
    ],
    priceLabel: "Coming soon",
    ctaLabel: "View details",
    relatedShortcutSlugs: [],
    safetyNotes: [
      "No guaranteed follower, engagement, traffic, or sales claims.",
      "No invented source facts, quotes, examples, or metrics.",
    ],
    faq: [
      {
        question: "Will this auto-publish content?",
        answer:
          "No. It is planned as a drafting and review workflow, not an automatic publishing system.",
      },
    ],
  },
  {
    slug: "study-notes-ai-kit",
    title: "Study Notes AI Kit",
    shortTitle: "Study Notes Kit",
    status: "coming-soon",
    isFeatured: false,
    audience:
      "Students and self-learners who want structured notes, quizzes, and review checklists from source material.",
    outcome:
      "A study workflow for turning source notes or readings into summaries, quiz questions, and review plans.",
    pain:
      "Generic AI study prompts can skip important details, invent facts, or produce notes that are too broad to review.",
    oneLinePromise:
      "Turn class notes or readings into structured study notes, quiz questions, and review prompts.",
    whatIsInside: [
      "Source input worksheet",
      "Prompt sequence for study notes, quizzes, flashcards, and weak-area review",
      "Do-not-invent source rules",
      "Final study checklist",
    ],
    modules: [
      {
        title: "Source Input Worksheet",
        detail: "Capture the lecture notes, reading sections, exam scope, and unclear topics.",
      },
      {
        title: "Study Notes Builder",
        detail: "Create structured notes from only the provided source material.",
      },
      {
        title: "Quiz and Review Builder",
        detail: "Generate practice questions and review prompts for weak areas.",
      },
    ],
    sampleItems: [
      "Input: class notes, reading sections, exam scope, and weak topics",
      "Output: study notes, quiz questions, and review checklist",
    ],
    priceLabel: "Coming soon",
    ctaLabel: "View details",
    relatedShortcutSlugs: [],
    safetyNotes: [
      "No guaranteed grades, exam scores, or academic outcomes.",
      "No invented facts, citations, assignments, or instructor expectations.",
    ],
    faq: [
      {
        question: "Can it replace studying?",
        answer:
          "No. It is planned as a structured study aid that still requires source review and practice.",
      },
    ],
  },
];

export function getKits(): readonly AteFloKit[] {
  return kits;
}

export function getActiveKits(): readonly AteFloKit[] {
  return kits.filter((kit) => kit.status === "active");
}

export function getFeaturedKit(): AteFloKit {
  const featured = kits.find((kit) => kit.isFeatured) ?? kits[0];

  if (!featured) {
    throw new Error("At least one AteFlo kit is required.");
  }

  return featured;
}

export function getKitBySlug(slug: string): AteFloKit | undefined {
  return kits.find((kit) => kit.slug === slug);
}

export function getKitHref(kit: AteFloKit): string {
  if (
    kit.slug === "local-business-ai-visibility-kit" ||
    kit.slug === "job-application-ai-kit"
  ) {
    return `/kits/${kit.slug}`;
  }

  return `/kits#${kit.slug}`;
}

export function getKitCtaHref(kit: AteFloKit): string {
  if (kit.checkoutUrl) {
    return kit.checkoutUrl;
  }

  if (
    kit.slug === "local-business-ai-visibility-kit" ||
    kit.slug === "job-application-ai-kit"
  ) {
    return `/kits/${kit.slug}#early-access`;
  }

  return `/kits#${kit.slug}`;
}

export function kitHasCheckout(kit: AteFloKit): boolean {
  return Boolean(kit.checkoutUrl);
}
