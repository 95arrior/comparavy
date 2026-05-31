import CopyPromptCard from "@/components/guides/CopyPromptCard";
import HelpfulFeedback from "@/components/guides/HelpfulFeedback";
import HowToGuideLayout from "@/components/guides/HowToGuideLayout";
import IncomeGuideLayout from "@/components/guides/IncomeGuideLayout";
import RelatedShortcuts from "@/components/guides/RelatedShortcuts";
import ShareGuideButton from "@/components/guides/ShareGuideButton";
import ShortcutBrief from "@/components/guides/ShortcutBrief";
import ToolDecisionGuideLayout from "@/components/guides/ToolDecisionGuideLayout";
import TrendDecisionGuideLayout from "@/components/guides/TrendDecisionGuideLayout";
import { resolveGuideLayoutType } from "@/lib/guideTypes";
import { getPublishedGuides, type Guide } from "@/lib/guides";

interface GuideDetailRendererProps {
  readonly guide: Guide;
}

function starterPrompt(guide: Guide): string {
  const copiedStep = guide.steps?.find((step) => /(?:Copy|Paste) this prompt/i.test(step.detail));
  const quotedPrompt = copiedStep?.detail.match(/(?:Copy|Paste) this prompt[^:]*:\s*"([^"]+)"/i)?.[1];
  const inputLines = Array.isArray(guide.whatYouNeed)
    ? guide.whatYouNeed.slice(0, 3)
    : typeof guide.whatYouNeed === "string"
      ? [guide.whatYouNeed]
      : [guide.userPain];
  const finishLine =
    guide.steps
      ?.filter((step) => step.output?.trim())
      .at(-1)
      ?.output ??
    guide.exampleResult ??
    `A checked final output for ${guide.useCase}.`;

  return [
    `I want to complete this AteFlo shortcut: ${guide.useCase}.`,
    `Audience/context: ${guide.persona}.`,
    `Finished output I need: ${finishLine}`,
    "",
    "Input I have:",
    ...inputLines.map((item) => `- ${item}`),
    "",
    "Prompt to run:",
    quotedPrompt ??
      "Use my source material below to create the finished output. Keep facts separate from assumptions, preserve important constraints, and flag anything I should verify before using the result.",
    "",
    "My source material:",
  ].join("\n");
}

function relatedGuides(guide: Guide): readonly Guide[] {
  const guides = getPublishedGuides().filter((item) => item.slug !== guide.slug);
  const related = guides.filter(
    (item) => item.category === guide.category || item.skillLevel === guide.skillLevel,
  );

  return (related.length >= 3 ? related : guides).slice(0, 3);
}

export default function GuideDetailRenderer({ guide }: GuideDetailRendererProps) {
  const guideType = resolveGuideLayoutType({
    slug: guide.slug,
    title: guide.title,
    type: guide.type,
    guideType: guide.guideType,
    searchIntent: guide.searchIntent,
    decisionQuestion: guide.decisionQuestion,
    uniqueAngle: guide.uniqueAngle,
    notes: guide.contentGap,
  });

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap justify-end gap-3">
        <ShareGuideButton title={guide.title} />
      </div>

      <ShortcutBrief guide={guide} />
      <CopyPromptCard
        prompt={starterPrompt(guide)}
        title="Copy the shortcut prompt"
        description="Paste this into ChatGPT, Claude, Gemini, Copilot, or another AI chat tool that can handle your input, then replace the source material with your real notes, product facts, transcript, or task details."
      />

      {guideType === "how-to" ? (
        <HowToGuideLayout guide={guide} />
      ) : guideType === "income" ? (
        <IncomeGuideLayout guide={guide} />
      ) : guideType === "trend-led" ? (
        <TrendDecisionGuideLayout guide={guide} />
      ) : (
        <ToolDecisionGuideLayout guide={guide} />
      )}

      <HelpfulFeedback />
      <RelatedShortcuts guides={relatedGuides(guide)} />
    </div>
  );
}
