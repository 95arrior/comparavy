import CopyPromptCard from "@/components/guides/CopyPromptCard";
import type { Guide } from "@/lib/guides";

interface PromptOption {
  readonly title: string;
  readonly buttonLabel: string;
  readonly description: string;
  readonly prompt: string;
}

interface ExecutionShortcutConfig {
  readonly whatYouHave: string;
  readonly whatYouGet: string;
  readonly fillIntro: string;
  readonly fillItems: readonly string[];
  readonly fillNote: string;
  readonly howToUse: readonly string[];
  readonly prompts: readonly PromptOption[];
  readonly exampleInput: string;
  readonly exampleOutput: readonly string[];
  readonly checkBeforeUsing: readonly string[];
}

const etsyQuickPrompt = `Create a simple Etsy product description from the product details below.

Product details:
[PASTE YOUR PRODUCT DETAILS HERE]

Target buyer:
[TARGET BUYER]

Finished output:
- A short buyer-focused opening
- 4 to 6 scannable bullet points
- A mobile-readable product description
- A short Needs seller input section if anything important is missing

Rules:
- Do not invent materials, sizes, shipping times, guarantees, or product claims.
- If a detail is missing, mark it as Needs seller input.
- Keep the copy clear, honest, and easy to read on a phone.`;

const etsyBetterPrompt = `Create an Etsy listing draft from the product details below.

Product details:
[PASTE YOUR PRODUCT DETAILS HERE]

Target buyer:
[TARGET BUYER]

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

const etsyReviewPrompt = `Review this Etsy listing draft before I publish it.

Listing draft:
[PASTE YOUR CURRENT LISTING OR AI DRAFT HERE]

Known product facts:
[PASTE YOUR PRODUCT DETAILS HERE]

Check for:
- Unclear claims
- Missing product details
- Exaggerated language
- Unsupported shipping or guarantee claims
- Anything the seller should verify before publishing

Finished output:
- Safe to keep
- Needs seller input
- Suggested edits
- Final checklist

Rules:
- Do not add new product claims.
- Do not invent missing details.
- If something cannot be verified from the product facts, mark it as Needs seller input.`;

const meetingQuickPrompt = `Turn these meeting notes into a short client recap email.

Meeting notes:
[PASTE MEETING NOTES HERE]

Client or project:
[PASTE CLIENT OR PROJECT NAME HERE]

Finished output:
- A short recap email
- Action items
- Owners
- Deadlines
- Open questions

Rules:
- Use only the information in my notes.
- Do not invent details, decisions, deadlines, or promises.
- If something is unclear, put it under Open Questions.
- Keep the email professional, simple, and easy to scan.`;

const meetingBetterPrompt = `Turn these meeting notes into a client-ready recap and follow-up email.

Meeting notes:
[PASTE MEETING NOTES HERE]

Client or project:
[PASTE CLIENT OR PROJECT NAME HERE]

Known deadlines:
[PASTE KNOWN DEADLINES HERE]

Task owners:
[PASTE TASK OWNERS HERE]

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
- Keep private or sensitive details out of the client email unless they clearly belong there.`;

const meetingReviewPrompt = `Review this client recap email before I send it.

Client recap email:
[PASTE YOUR CLIENT RECAP EMAIL HERE]

Original meeting notes:
[PASTE MEETING NOTES HERE]

Check for:
- Unclear promises
- Missing owners
- Missing deadlines
- Invented details
- Tone problems
- Private details that should be removed

Finished output:
- Safe to send
- Needs review
- Suggested edits
- Open questions to confirm first

Rules:
- Use only the information in the notes and email.
- Do not invent missing details.
- If a promise, owner, or deadline is not clearly supported by the notes, mark it as Needs review.`;

const executionConfigs: Record<string, ExecutionShortcutConfig> = {
  "best-ai-tools-for-etsy-product-descriptions": {
    whatYouHave: "Product facts for an Etsy listing, even if they are messy or incomplete.",
    whatYouGet: "A clear listing draft with a title, opening, bullets, description, keywords, and review notes.",
    fillIntro: "Use short notes. Full sentences are not required.",
    fillItems: [
      "Product:",
      "Material:",
      "Size:",
      "Color:",
      "Personalization:",
      "Care notes:",
      "Shipping limits:",
      "Target buyer:",
      "Occasion or use:",
    ],
    fillNote:
      "If you do not know one of these details, leave it blank. The prompt will ask the AI to mark it as Needs seller input instead of inventing it.",
    howToUse: [
      "Fill in the product details you already know.",
      "Copy the Quick Prompt for a fast draft, or the Better Prompt for a fuller listing.",
      "Paste it into ChatGPT, Claude, Gemini, Copilot, or another AI chat tool.",
      "Review the result before using it in your shop.",
    ],
    prompts: [
      {
        title: "Quick Prompt",
        buttonLabel: "Copy Quick Prompt",
        description: "Use this when you need a simple Etsy description fast.",
        prompt: etsyQuickPrompt,
      },
      {
        title: "Better Prompt",
        buttonLabel: "Copy Better Prompt",
        description: "Use this when you want a fuller listing draft with title, bullets, keywords, and review notes.",
        prompt: etsyBetterPrompt,
      },
      {
        title: "Review Prompt",
        buttonLabel: "Copy Review Prompt",
        description: "Use this after you have a listing draft and want to check it before publishing.",
        prompt: etsyReviewPrompt,
      },
    ],
    exampleInput:
      "Handmade ceramic mug, blue glaze, 12 oz, microwave safe, gift for coffee lovers.",
    exampleOutput: [
      "Title: Handmade Blue Ceramic Mug, 12 oz Coffee Lover Gift",
      "Opening: Give a coffee lover a handmade mug with a calm blue glaze and everyday 12 oz size.",
      "Bullets: handmade ceramic, blue glaze, 12 oz, microwave safe, gift-ready for coffee lovers.",
      "Needs Seller Review: confirm dishwasher safety, processing time, shipping limits, and personalization options.",
    ],
    checkBeforeUsing: [
      "Check every material, size, color, and care detail.",
      "Remove any shipping, guarantee, or safety claim you cannot prove.",
      "Read the first two lines on your phone before publishing.",
      "Keep anything marked Needs seller input out of the live listing until you verify it.",
    ],
  },
  "how-to-turn-meeting-notes-into-a-client-recap-with-ai": {
    whatYouHave: "Rough meeting notes, a transcript, or quick bullets from a client call.",
    whatYouGet: "A client-ready recap with decisions, action items, owners, deadlines, open questions, and a short email.",
    fillIntro: "Remove private details first if they do not need to go into the AI tool.",
    fillItems: [
      "Meeting notes:",
      "Client or project:",
      "Known deadlines:",
      "Task owners:",
      "Open questions:",
    ],
    fillNote:
      "If the notes include private client details, remove anything sensitive before pasting them into an AI tool.",
    howToUse: [
      "Paste in your rough notes or transcript.",
      "Copy the Quick Prompt for a short recap, or the Better Prompt for a fuller follow-up.",
      "Paste it into ChatGPT, Claude, Gemini, Copilot, or another AI chat tool.",
      "Check names, owners, dates, and promises before sending anything to a client.",
    ],
    prompts: [
      {
        title: "Quick Prompt",
        buttonLabel: "Copy Quick Prompt",
        description: "Use this when you need a short client recap email quickly.",
        prompt: meetingQuickPrompt,
      },
      {
        title: "Better Prompt",
        buttonLabel: "Copy Better Prompt",
        description: "Use this when you need decisions, owners, deadlines, risks, open questions, and a polished email.",
        prompt: meetingBetterPrompt,
      },
      {
        title: "Review Prompt",
        buttonLabel: "Copy Review Prompt",
        description: "Use this after you have a recap email and want to check it before sending.",
        prompt: meetingReviewPrompt,
      },
    ],
    exampleInput:
      "Client wants homepage draft by Friday. Sarah sends logo files. Pricing page copy is still open.",
    exampleOutput: [
      "Subject: Recap and next steps",
      "Decisions: Homepage draft is the next priority.",
      "Action items: Sarah sends logo files. Team prepares homepage draft by Friday.",
      "Open questions: Pricing page copy still needs a decision.",
    ],
    checkBeforeUsing: [
      "Confirm every owner, deadline, and promise against your notes.",
      "Remove private details the client should not receive.",
      "Move unclear items into Open Questions instead of guessing.",
      "Read the email once as the client before sending.",
    ],
  },
};

function SimpleCard({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

export default function GuideExecutionShortcut({ guide }: { readonly guide: Guide }) {
  const config = executionConfigs[guide.slug];

  if (!config) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <SimpleCard title="What you have">
          <p className="mt-3 text-base leading-7 text-slate-700">{config.whatYouHave}</p>
        </SimpleCard>
        <SimpleCard title="What you'll get">
          <p className="mt-3 text-base leading-7 text-slate-700">{config.whatYouGet}</p>
        </SimpleCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <SimpleCard title="How to use this shortcut">
          <ol className="mt-4 space-y-3 text-base leading-7 text-slate-700">
            {config.howToUse.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </SimpleCard>

        <SimpleCard title="Fill this in first">
          <p className="mt-3 text-base leading-7 text-slate-700">{config.fillIntro}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {config.fillItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800"
              >
                {item}
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {config.fillNote}
          </p>
        </SimpleCard>
      </div>

      <div className="space-y-5">
        {config.prompts.map((prompt) => (
          <CopyPromptCard
            key={prompt.title}
            title={prompt.title}
            description={prompt.description}
            prompt={prompt.prompt}
            buttonLabel={prompt.buttonLabel}
          />
        ))}
      </div>

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
