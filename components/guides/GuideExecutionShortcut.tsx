"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AteFloIcon from "@/components/AteFloIcon";
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

const pdfStudyFields = {
  pdfTopic: "PDF topic or class",
  pdfText: "Pasted PDF text or notes",
  studyGoal: "Study goal",
  extraNotes: "Extra notes",
  confusingSections: "Confusing sections",
  deadline: "Exam date or deadline",
  outputStyle: "Preferred output style",
  keyTerms: "Key terms to focus on",
} as const;

const contentCalendarFields = {
  businessType: "Business type",
  targetCustomer: "Target customer",
  offer: "Offer or service",
  channels: "Content channels",
  extraNotes: "Extra notes",
  postingFrequency: "Posting frequency",
  localArea: "Local area or niche",
  promotionGoal: "Promotion goal",
  tone: "Tone",
  themesToAvoid: "Content themes to avoid",
} as const;

const blogCarouselFields = {
  topic: "Blog post topic",
  sourceText: "Blog post text or summary",
  targetAudience: "Target audience",
  mainTakeaway: "Main takeaway",
  tone: "Tone",
  extraNotes: "Extra notes",
  slideCount: "Number of slides",
  cta: "Call to action",
  brandVoice: "Brand voice",
  visualStyle: "Visual style",
  avoid: "Things to avoid",
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
      "Facts: 12 oz size; handmade ceramic; blue glaze; microwave safe.",
      "Buyer benefits: useful for coffee, tea, desk use, and simple gifting.",
      "Bullets: 12 oz capacity; handmade ceramic; calm blue glaze; gift-ready for coffee lovers.",
      "Description: This handmade blue ceramic mug keeps the listing clear on mobile by leading with size, material, use case, and care facts.",
      "Keyword ideas: handmade mug, blue ceramic mug, coffee lover gift, 12 oz mug.",
      "Needs Seller Review: confirm dishwasher safety, processing time, shipping limits, personalization options, and any claim not listed in the product facts.",
    ],
    checkBeforeUsing: [
      "Check every material, size, color, and care detail.",
      "Remove any shipping, guarantee, or safety claim you cannot prove.",
      "Remove fake urgency, fake reviews, fake discounts, or unsupported product claims.",
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
3. Product facts separated from buyer benefits
4. Scannable bullet points
5. Mobile-readable product description
6. Tag or keyword ideas
7. Short seller review checklist before publishing
8. Needs Seller Review section

Rules:
- Do not invent materials, sizes, shipping times, guarantees, or product claims.
- If a detail is missing, mark it as "Needs seller input."
- Separate buyer benefits from product facts.
- Keep the listing mobile-readable.
- Do not create fake urgency, fake reviews, fake discounts, or unsupported claims.
- Do not treat keyword ideas as verified Etsy search volume.
- Keep claims specific to the product facts I gave you.
- Keep the tone warm, clear, and buyer-friendly.`;
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
      "Hi Sam, thanks for today. Here is the short recap from our homepage call.",
      "Decision: The homepage draft is the next priority.",
      "Action items: Sarah will send logo files. I will prepare the homepage draft by Friday.",
      "Open question: We still need to confirm the pricing page copy.",
      "Risk/blocker: The pricing page may hold up the final homepage copy if it stays unresolved.",
      "Best, [Your name]",
    ],
    checkBeforeUsing: [
      "Confirm every owner, deadline, and promise against your notes.",
      "Remove private details the client should not receive.",
      "Make sure open questions did not become confirmed decisions.",
      "Move unclear items into Open Questions instead of guessing.",
      "Keep the follow-up email short enough to scan.",
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
7. Short client-ready follow-up email with subject line, greeting, recap, action items, open questions, and closing

Rules:
- Use only the information in my notes.
- Do not invent decisions, deadlines, owners, or promises.
- If an owner is not clearly stated, write "Owner not specified."
- If a deadline is not clearly stated, write "Deadline not specified."
- Do not turn open questions into confirmed decisions.
- Put unclear items under Open Questions instead of guessing.
- Remove sensitive client details that should not be included in an email.
- Keep the follow-up email professional, simple, and easy to scan.
- Keep the email under 180 words unless the notes require more detail.`;
    },
  },
  "how-to-summarize-a-pdf-into-study-notes-with-ai": {
    whatYouWillMake:
      "Study notes with key concepts, a bullet summary, quiz questions, flashcards or review prompts, confusing terms to revisit, and a Needs review section.",
    primaryFields: [
      { key: "pdfTopic", label: "PDF topic or class", placeholder: "Example: Economics chapter on supply and demand" },
      {
        key: "pdfText",
        label: "Pasted PDF text or notes",
        placeholder: "Paste the PDF section, class notes, or allowed document text here",
        multiline: true,
      },
      { key: "studyGoal", label: "Study goal", placeholder: "Example: Prepare for a Friday quiz" },
      {
        key: "extraNotes",
        label: "Extra notes",
        placeholder: "Example: Focus on definitions, formulas, and likely test points",
        multiline: true,
      },
    ],
    optionalFields: [
      { key: "confusingSections", label: "Confusing sections", placeholder: "Example: Elasticity formulas and graph labels" },
      { key: "deadline", label: "Exam date or deadline", placeholder: "Example: Quiz on Friday" },
      { key: "outputStyle", label: "Preferred output style", placeholder: "Example: Short bullets, flashcards, or one-page review sheet" },
      { key: "keyTerms", label: "Key terms to focus on", placeholder: "Example: scarcity, demand curve, equilibrium" },
    ],
    privateNote:
      "Do not paste private, confidential, legal, medical, client, or restricted documents into an AI tool.",
    exampleInput:
      "Economics chapter on supply and demand, copied section notes, quiz Friday, focus on formulas and definitions.",
    exampleOutput: [
      "Overview: The section explains how supply and demand interact to set market price.",
      "Study notes: Demand is how much buyers want at different prices; supply is how much sellers offer.",
      "Key concepts: scarcity, demand curve, supply curve, equilibrium, shortage, surplus.",
      "Important term: Equilibrium means the point where quantity supplied equals quantity demanded.",
      "Quiz question: What happens to equilibrium price when demand rises and supply stays the same?",
      "Flashcard: Front: What is equilibrium? Back: The point where quantity supplied equals quantity demanded.",
      "Study plan: Review definitions first, practice graph questions second, then revisit Needs review items.",
      "Needs review: Confirm the exact graph labels and any formulas against the original PDF.",
    ],
    checkBeforeUsing: [
      "Check important facts, definitions, numbers, and formulas against the PDF.",
      "Do not study from invented quotes, citations, page numbers, or claims.",
      "Make sure quiz questions can be answered from the provided text.",
      "Keep unclear items in Needs review until you verify them.",
      "Do not paste restricted or private documents into an AI tool.",
    ],
    buildPrompt(values) {
      return `Create study notes and quiz questions from the PDF text or notes below.

Study details:
${detailLines(values, pdfStudyFields)}

Finished output:
1. Short overview
2. Key concepts
3. Bullet study notes
4. Important terms
5. Quiz questions with answer key
6. Flashcards or review questions if appropriate
7. Confusing sections or Needs review section
8. Short study plan if useful

Rules:
- Use only the text or notes I provide.
- Do not invent facts, quotes, citations, page numbers, authors, or claims.
- If something is unclear, mark it as "Needs review."
- Do not pretend to read a PDF file unless the actual text is provided.
- If I did not provide page numbers, do not create page references.
- Keep the notes easy to study from.
- Make quiz questions answerable from the provided material.
- Do not paste private, confidential, legal, medical, client, or restricted documents into an AI tool.
- Keep the notes clear enough for a beginner to study from.`;
    },
  },
  "best-ai-tools-for-small-business-content-calendars": {
    whatYouWillMake:
      "A small business content plan with content themes, weekly posting ideas, a simple calendar, channel suggestions, post ideas, call-to-action ideas, and a review checklist.",
    primaryFields: [
      { key: "businessType", label: "Business type", placeholder: "Example: Neighborhood bakery" },
      { key: "targetCustomer", label: "Target customer", placeholder: "Example: Busy parents and local office workers" },
      { key: "offer", label: "Offer or service", placeholder: "Example: Custom cakes and weekday lunch boxes" },
      { key: "channels", label: "Content channels", placeholder: "Example: Instagram, Facebook, email" },
      {
        key: "extraNotes",
        label: "Extra notes",
        placeholder: "Example: Seasonal promos, FAQs, customer questions, or posts that worked before",
        multiline: true,
      },
    ],
    optionalFields: [
      { key: "postingFrequency", label: "Posting frequency", placeholder: "Example: 3 posts per week" },
      { key: "localArea", label: "Local area or niche", placeholder: "Example: Downtown Austin" },
      { key: "promotionGoal", label: "Promotion goal", placeholder: "Example: Promote catering orders for June" },
      { key: "tone", label: "Tone", placeholder: "Example: Friendly, practical, local" },
      { key: "themesToAvoid", label: "Content themes to avoid", placeholder: "Example: Discount-heavy posts or health claims" },
    ],
    exampleInput:
      "Neighborhood bakery, busy parents and local office workers, custom cakes and weekday lunch boxes, Instagram and Facebook, 3 posts per week.",
    exampleOutput: [
      "Weekly theme: Easy lunches and weekend celebrations.",
      "Calendar idea: Monday lunch box reminder, Wednesday behind-the-scenes cake prep, Friday weekend order CTA.",
      "Channel plan: Instagram for behind-the-scenes visuals, Facebook for local pickup reminders, email for weekly order deadline.",
      "Post idea: A short Instagram reel showing the lunch box assembly process.",
      "CTA: Message us by Thursday to reserve a weekend cake pickup.",
      "Needs owner input: confirm current prices, pickup times, and photo availability.",
      "Review checklist: Verify dates, availability, prices, claims, and photos before posting.",
    ],
    checkBeforeUsing: [
      "Remove any claim about guaranteed growth, sales, or income.",
      "Do not use invented testimonials, customer results, or fake proof.",
      "Make sure ideas match the business, customer, offer, and channels you entered.",
      "Cut posts that are too hype-driven or unrealistic to create.",
      "Verify dates, offers, prices, capacity, and local details before posting.",
      "Keep anything marked Needs owner input out of the live calendar until reviewed.",
    ],
    buildPrompt(values) {
      return `Create a small business content calendar and social media planning draft from the details below.

Business details:
${detailLines(values, contentCalendarFields)}

Finished output:
1. Content themes
2. Weekly posting ideas
3. Simple content calendar with channel, format, topic, owner, asset needed, and review status
4. Channel suggestions
5. Post ideas
6. Call-to-action ideas
7. Review checklist

Rules:
- Do not claim guaranteed growth, guaranteed sales, or guaranteed income.
- Do not invent customer results, testimonials, or fake proof.
- Keep ideas realistic for a small business owner to review and edit.
- If important details are missing, mark them as "Needs owner input."
- Match ideas to the business type, customer, offer, and channels provided.
- Keep posts practical, not hype-driven.
- Include a simple review checklist before posting.
- Make the calendar practical enough for a busy owner to use.`;
    },
  },
  "how-to-turn-a-blog-post-into-an-instagram-carousel-with-ai": {
    whatYouWillMake:
      "An Instagram carousel draft with a clear hook, slide-by-slide outline, short slide text, visual notes, caption, call to action, and review checklist.",
    primaryFields: [
      { key: "topic", label: "Blog post topic", placeholder: "Example: Five ways small business owners can plan social media content faster" },
      {
        key: "sourceText",
        label: "Blog post text or summary",
        placeholder: "Paste the blog post, section notes, or a short summary here",
        multiline: true,
      },
      { key: "targetAudience", label: "Target audience", placeholder: "Example: Busy small business owners who post on Instagram" },
      { key: "mainTakeaway", label: "Main takeaway", placeholder: "Example: Plan one week of posts from one focused idea" },
      { key: "tone", label: "Tone", placeholder: "Example: Practical, warm, and direct" },
      {
        key: "extraNotes",
        label: "Extra notes",
        placeholder: "Example: Keep it beginner-friendly and avoid hype",
        multiline: true,
      },
    ],
    optionalFields: [
      { key: "slideCount", label: "Number of slides", placeholder: "Example: 7 slides" },
      { key: "cta", label: "Call to action", placeholder: "Example: Save this for your next planning session" },
      { key: "brandVoice", label: "Brand voice", placeholder: "Example: Helpful, calm, and not salesy" },
      { key: "visualStyle", label: "Visual style", placeholder: "Example: Clean Canva carousel with simple icons" },
      { key: "avoid", label: "Things to avoid", placeholder: "Example: Clickbait, fake stats, crowded slides" },
    ],
    exampleInput:
      "A blog post about five ways small business owners can plan social media content faster.",
    exampleOutput: [
      "Slide 1 hook: Plan a week of posts without starting from zero.",
      "Slide 2: Choose one business goal before choosing post ideas.",
      "Slide 3: Pull three useful tips from your blog post.",
      "Slide 4: Turn each tip into one simple slide.",
      "Slide 5: Add one example your audience recognizes.",
      "Slide 6: End with one clear next step.",
      "Caption: Your next content plan can start with one useful article. Pick the main takeaway, turn it into short slides, and review every claim before posting.",
      "Review checklist: Confirm each slide matches the blog post, remove invented claims, shorten crowded text, and check the CTA before designing.",
    ],
    checkBeforeUsing: [
      "Confirm the carousel matches the original blog post.",
      "Remove any statistic, quote, case study, or claim that was not in your source.",
      "Keep slide text short enough to read on a phone.",
      "Make sure each slide has one clear idea.",
      "Confirm the call to action is specific and easy to follow.",
      "Review visual notes before designing in Canva or another design tool.",
      "Make sure the caption matches the carousel.",
    ],
    buildPrompt(values) {
      return `Turn this blog post into an Instagram carousel draft and caption.

Blog post details:
${detailLines(values, blogCarouselFields)}

Finished output:
1. Carousel title or hook
2. Slide-by-slide outline
3. Short text for each slide
4. Visual suggestion for each slide
5. Instagram caption
6. Call to action
7. Hashtag or keyword ideas if appropriate
8. Review checklist before posting

Rules:
- Use only the blog post details I provide.
- Do not invent statistics, quotes, case studies, examples, results, or claims.
- If information is missing, mark it as "Needs input."
- Keep slide text short and mobile-readable.
- Make each slide focused on one idea.
- Avoid clickbait, engagement bait, fake urgency, or unsupported claims.
- Keep the caption clear, useful, and aligned with the carousel.
- Make the final result easy to review before posting.`;
    },
  },
};

promptConfigs["how-to-write-etsy-product-descriptions-with-ai"] =
  promptConfigs["best-ai-tools-for-etsy-product-descriptions"];
promptConfigs["how-to-create-a-content-calendar-for-a-small-business-with-ai"] =
  promptConfigs["best-ai-tools-for-small-business-content-calendars"];

promptConfigs["best-ai-tools-for-etsy-product-descriptions"] = {
  whatYouWillMake:
    "A decision-ready tool recommendation for Etsy listing copy, plus the exact listing output each tool should help you create.",
  primaryFields: [
    { key: "product", label: "Product", placeholder: "Example: Handmade ceramic mug" },
    { key: "material", label: "Material", placeholder: "Example: Ceramic" },
    { key: "targetBuyer", label: "Target buyer", placeholder: "Example: Coffee lovers, gift buyers" },
    { key: "extraNotes", label: "Listing challenge", placeholder: "Example: Need better title, less generic description, or calmer rewrite", multiline: true },
  ],
  optionalFields: [
    { key: "size", label: "Size", placeholder: "Example: 12 oz" },
    { key: "color", label: "Color", placeholder: "Example: Blue glaze" },
    { key: "personalization", label: "Personalization", placeholder: "Example: Name engraving available" },
    { key: "shippingLimits", label: "Shipping limits", placeholder: "Example: US only, ships in 3-5 business days" },
  ],
  exampleInput:
    "Handmade ceramic mug, blue glaze, gift buyers, needs a better title and less generic description.",
  exampleOutput: [
    "Start with: a flexible AI chat tool for the first title, opening, bullets, and review checklist.",
    "Use a calmer rewrite tool if: the first draft sounds too salesy or adds unsupported claims.",
    "Use a design/workflow tool if: copy is already reviewed and the next task is shop visuals or repeatable listing production.",
    "Expected output: title, buyer-focused opening, bullets, tag ideas, and Needs Seller Review.",
    "Review: confirm material, size, care, shipping limits, personalization rules, and any product claim before publishing.",
  ],
  checkBeforeUsing: [
    "Do not treat the tool recommendation as proof that listing details are correct.",
    "Verify every product fact before publishing.",
    "Do not invent pricing, search volume, trademark terms, or seller policies.",
    "Choose the tool based on the work bottleneck: draft, rewrite, design, or workflow.",
    "Keep unsupported claims in Needs Seller Review.",
  ],
  buildPrompt(values) {
    return `Recommend the best AI tool workflow for creating Etsy product descriptions, titles, and listing copy from the details below.

Listing details:
${detailLines(values, etsyFields)}

Finished output:
1. Best starting tool type for this listing job
2. Use this if...
3. Choose another option if...
4. Avoid this approach if...
5. What listing output the tool should produce
6. Seller review checklist before publishing

Rules:
- Do not claim tools were tested unless I provide test data.
- Do not invent pricing, search volume, Etsy ranking claims, seller policies, materials, sizes, shipping times, guarantees, or product claims.
- Base the recommendation on the work I need to finish: title, description, rewrite, tags, visuals, or workflow.
- If important details are missing, write "Needs seller input."
- Keep the output practical for an Etsy seller choosing what to use next.
- Include the listing sections the chosen tool should help produce.`;
  },
};

promptConfigs["best-ai-tools-for-small-business-content-calendars"] = {
  whatYouWillMake:
    "A decision-ready recommendation for choosing the right AI tool workflow for a small business content calendar.",
  primaryFields: [
    { key: "businessType", label: "Business type", placeholder: "Example: Neighborhood bakery" },
    { key: "targetCustomer", label: "Target customer", placeholder: "Example: Busy parents and local office workers" },
    { key: "offer", label: "Offer or service", placeholder: "Example: Custom cakes and weekday lunch boxes" },
    { key: "channels", label: "Content channels", placeholder: "Example: Instagram, Facebook, email" },
    { key: "extraNotes", label: "Planning challenge", placeholder: "Example: Need weekly themes, captions, approvals, or scheduling help", multiline: true },
  ],
  optionalFields: [
    { key: "postingFrequency", label: "Posting frequency", placeholder: "Example: 3 posts per week" },
    { key: "localArea", label: "Local area or niche", placeholder: "Example: Downtown Austin" },
    { key: "promotionGoal", label: "Promotion goal", placeholder: "Example: Promote catering orders for June" },
    { key: "tone", label: "Tone", placeholder: "Example: Friendly, practical, local" },
    { key: "themesToAvoid", label: "Content themes to avoid", placeholder: "Example: Discount-heavy posts or health claims" },
  ],
  exampleInput:
    "Neighborhood bakery, Instagram and Facebook, 3 posts per week, needs weekly themes and a simple approval workflow.",
  exampleOutput: [
    "Start with: an AI chat tool for weekly themes, post angles, caption drafts, and CTA ideas.",
    "Use a workspace tool if: owners, deadlines, approvals, and asset status need to stay visible.",
    "Use a scheduler if: posts are already reviewed and the bottleneck is publishing on time.",
    "Expected output: weekly theme, channel, post idea, format, CTA, owner, asset needed, review status.",
    "Review: confirm dates, offers, availability, prices, claims, and photos before scheduling.",
  ],
  checkBeforeUsing: [
    "Do not choose a scheduler before the calendar is reviewed.",
    "Do not make guaranteed growth, sales, follower, or income claims.",
    "Choose the tool based on bottleneck: planning, design, workflow, or scheduling.",
    "Verify dates, offers, capacity, images, and claims before publishing.",
    "Keep missing business details in Needs owner input.",
  ],
  buildPrompt(values) {
    return `Recommend the best AI tool workflow for planning a small business content calendar from the details below.

Business details:
${detailLines(values, contentCalendarFields)}

Finished output:
1. Best starting tool type for this content calendar job
2. Use this if...
3. Choose another option if...
4. Avoid this approach if...
5. What the finished calendar should include
6. Review checklist before scheduling or publishing

Rules:
- Do not claim tools were tested unless I provide test data.
- Do not invent pricing, guaranteed growth, guaranteed sales, follower gains, income claims, testimonials, or fake proof.
- Base the recommendation on the bottleneck: planning, captions, visuals, team workflow, or scheduling.
- If important details are missing, write "Needs owner input."
- Keep the recommendation realistic for a small business owner.
- Include the calendar fields the chosen tool should help produce.`;
  },
};

const promptConfigAliases: Record<string, string> = {
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
  return <AteFloIcon name={copied ? "productivity" : "copy"} className="h-4 w-4" />;
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
  const config = promptConfigs[guide.slug] ?? promptConfigs[promptConfigAliases[guide.slug] ?? ""];
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
              Fill in details
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Fill in the details you have
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              You can copy the prompt right away, but these fields help the AI return a more useful first draft.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              After copying, paste the prompt into ChatGPT, Claude, Gemini, Copilot, Canva, or another suitable AI tool.
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
              Generated prompt
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
