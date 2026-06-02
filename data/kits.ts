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
  readonly audience: string;
  readonly outcome: string;
  readonly pain: string;
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

export const kits: readonly AteFloKit[] = [
  {
    slug: "job-application-ai-kit",
    title: "Job Application AI Kit",
    shortTitle: "Job Application Kit",
    status: "active",
    audience:
      "Job seekers, career switchers, students, freelancers, and people applying to multiple roles.",
    outcome:
      "Turn a job post and real experience notes into application materials you can review, edit, and send.",
    pain:
      "Job applications ask for specific evidence, but generic AI prompts often create vague bullets, invented experience, or cover letters that sound detached from the role.",
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
    slug: "local-business-ai-marketing-kit",
    title: "Local Business AI Marketing Kit",
    shortTitle: "Local Business Kit",
    status: "coming-soon",
    audience: "Local business owners and managers who need practical marketing drafts.",
    outcome:
      "Create review-ready posts, offers, FAQs, service descriptions, and local updates without unsupported claims.",
    pain:
      "Local marketing tasks pile up, and generic AI drafts can invent discounts, guarantees, hours, testimonials, or service details.",
    whatIsInside: [
      "Input worksheet for business facts, service area, offers, restrictions, and tone",
      "Prompt sequence for Google Business Profile posts, service pages, captions, and FAQs",
      "Examples for updates, promotions, events, and seasonal messages",
      "Owner review checklist for pricing, availability, claims, and dates",
    ],
    modules: [
      {
        title: "Business facts worksheet",
        detail: "Collect details AI must use and details it must not invent.",
      },
      {
        title: "Local update builder",
        detail: "Draft Google Business Profile and local posts for owner review.",
      },
      {
        title: "Service description builder",
        detail: "Create clear service copy with restrictions and review notes.",
      },
    ],
    sampleItems: [
      "Input: business type, location, offer, customer, dates, and restrictions",
      "Output: local post options, CTA ideas, and an owner review checklist",
    ],
    priceLabel: "Coming soon",
    ctaLabel: "View details",
    relatedShortcutSlugs: ["how-to-write-google-business-profile-posts-with-ai"],
    safetyNotes: [
      "No guaranteed rankings, leads, sales, or growth claims.",
      "No invented prices, reviews, testimonials, certifications, or availability.",
    ],
    faq: [
      {
        question: "Will this replace a marketer?",
        answer:
          "No. It is intended to help owners draft and review routine local marketing materials more clearly.",
      },
    ],
  },
  {
    slug: "dating-profile-rewrite-kit",
    title: "Dating Profile Rewrite Kit",
    shortTitle: "Dating Profile Kit",
    status: "coming-soon",
    audience:
      "People who want a more natural dating profile without sounding generic or AI-written.",
    outcome:
      "Create bio options, prompt answers, opening-line ideas, and a review checklist from real personal details.",
    pain:
      "Generic AI dating copy can sound polished but false, awkward, desperate, or detached from the person using it.",
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
];

export function getKits(): readonly AteFloKit[] {
  return kits;
}

export function getActiveKits(): readonly AteFloKit[] {
  return kits.filter((kit) => kit.status === "active");
}

export function getKitBySlug(slug: string): AteFloKit | undefined {
  return kits.find((kit) => kit.slug === slug);
}

export function getKitHref(kit: AteFloKit): string {
  if (kit.slug === "job-application-ai-kit") {
    return `/kits/${kit.slug}`;
  }

  return `/kits#${kit.slug}`;
}

export function getKitCtaHref(kit: AteFloKit): string {
  if (kit.checkoutUrl) {
    return kit.checkoutUrl;
  }

  if (kit.slug === "job-application-ai-kit") {
    return `/kits/${kit.slug}#early-access`;
  }

  return `/kits#${kit.slug}`;
}

export function kitHasCheckout(kit: AteFloKit): boolean {
  return Boolean(kit.checkoutUrl);
}
