export type GuideLayoutType = "tool-decision" | "how-to" | "income" | "trend-led";
export type LegacyGuideLayoutType = "practical" | "evergreen";
export type GuideLayoutSourceType = GuideLayoutType | LegacyGuideLayoutType | undefined;

export type GuideDeviceIntent = "desktop" | "mobile" | "both";

export interface GuideTypeSource {
  readonly slug?: string;
  readonly title?: string;
  readonly type?: string;
  readonly guideType?: string;
  readonly searchIntent?: string;
  readonly decisionQuestion?: string;
  readonly uniqueAngle?: string;
  readonly notes?: string;
}

const HOW_TO_PATTERN =
  /\b(turning|rewriting|summarizing|summarise|making|organizing|organising|translating|cleaning|building|writing|finding|creating|drafting|polishing|repurposing|converting|extracting|digesting|preparing|editing|reformatting|explaining)\b/i;

const TOOL_DECISION_PATTERN =
  /\b(compare|comparison|choose|choosing|which ai tool|best ai tools|vs\.?|versus|researching a client industry|decision|tool decision)\b/i;

export function isGuideLayoutType(value: string | undefined): value is GuideLayoutType {
  return (
    value === "tool-decision" ||
    value === "how-to" ||
    value === "income" ||
    value === "trend-led"
  );
}

export function resolveGuideLayoutType(
  source: GuideLayoutSourceType | GuideTypeSource,
): GuideLayoutType {
  if (!source) {
    return "tool-decision";
  }

  const rawGuideType = typeof source === "string" ? source : source.guideType;

  if (isGuideLayoutType(rawGuideType)) {
    return rawGuideType;
  }

  const legacyType = typeof source === "string" ? source : source.type;

  if (legacyType === "income" || legacyType === "trend-led") {
    return legacyType;
  }

  return "tool-decision";
}

export function inferGuideLayoutTypeFromTopic(source: GuideTypeSource): GuideLayoutType {
  if (!source) {
    return "tool-decision";
  }

  const explicitType = source.type;

  if (explicitType === "income" || explicitType === "trend-led") {
    return explicitType;
  }

  if (explicitType === "how-to" || explicitType === "tool-decision") {
    return explicitType;
  }

  const text = [source.slug, source.title, source.searchIntent, source.decisionQuestion, source.uniqueAngle, source.notes]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  if (HOW_TO_PATTERN.test(text)) {
    return "how-to";
  }

  if (TOOL_DECISION_PATTERN.test(text)) {
    return "tool-decision";
  }

  if (/\b(income|earn|sell|clients|freelance|revenue|money|pricing|offer)\b/i.test(text)) {
    return "income";
  }

  if (/\b(trend|trending|latest|new|update|wave)\b/i.test(text)) {
    return "trend-led";
  }

  return "tool-decision";
}

export function formatGuideLayoutLabel(value: GuideLayoutType): string {
  switch (value) {
    case "how-to":
      return "How-to";
    case "income":
      return "Income";
    case "trend-led":
      return "Trend-led";
    default:
      return "Tool decision";
  }
}
