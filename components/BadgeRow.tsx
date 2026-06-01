import type { AiTool } from "@/types/tool";

export interface Badge {
  readonly label: string;
  readonly tone?: "teal" | "slate" | "amber";
}

interface BadgeRowProps {
  readonly badges: readonly Badge[];
  readonly maxVisible?: number;
  readonly className?: string;
}

const TONE_CLASSES = {
  teal: "bg-teal-50 text-teal-800 ring-teal-100",
  slate: "bg-slate-50 text-slate-700 ring-slate-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
} as const;

function formatCategory(category: AiTool["category"]): string {
  return category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatBudgetLabel(budgetLevel: AiTool["budgetLevel"]): string {
  switch (budgetLevel) {
    case "free":
      return "Free plan";
    case "under20":
      return "Under $20";
    case "under50":
      return "Under $50";
    case "premium":
      return "Premium";
    default:
      return budgetLevel;
  }
}

function normalizeBadgeKey(label: string): string {
  const normalized = label.trim().toLowerCase();

  if (normalized === "free" || normalized === "free plan") {
    return "free plan";
  }

  return normalized;
}

function dedupeBadges(badges: readonly Badge[]): Badge[] {
  const seen = new Set<string>();

  return badges.filter((badge) => {
    const key = normalizeBadgeKey(badge.label);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getToolBadges(
  tool: Pick<AiTool, "freePlan" | "beginnerScore" | "speedScore" | "qualityScore">,
  _bestFirstChoice = false,
): Badge[] {
  const badges: Badge[] = [];

  if (tool.freePlan) {
    badges.push({ label: "Free plan", tone: "slate" });
  }

  if (tool.beginnerScore >= 8) {
    badges.push({ label: "Beginner-friendly", tone: "slate" });
  }

  if (tool.speedScore >= 9) {
    badges.push({ label: "Fast", tone: "slate" });
  }

  return dedupeBadges(badges);
}

export function getToolCardBadges(
  tool: Pick<
    AiTool,
    | "category"
    | "budgetLevel"
    | "freePlan"
    | "setupDifficulty"
    | "beginnerScore"
    | "speedScore"
    | "qualityScore"
  >,
): Badge[] {
  return dedupeBadges([
    { label: formatCategory(tool.category), tone: "teal" },
    {
      label: tool.freePlan ? "Free plan" : formatBudgetLabel(tool.budgetLevel),
      tone: "slate",
    },
    ...getToolBadges(tool),
    { label: `${tool.setupDifficulty} setup`, tone: "slate" },
  ]);
}

export default function BadgeRow({
  badges,
  maxVisible = 3,
  className,
}: BadgeRowProps) {
  const uniqueBadges = dedupeBadges(badges);
  const visibleBadges = uniqueBadges.slice(0, maxVisible);
  const hiddenCount = Math.max(0, uniqueBadges.length - visibleBadges.length);

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {visibleBadges.map((badge) => (
        <span
          key={badge.label}
          className={`inline-flex min-h-7 items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset ${TONE_CLASSES[badge.tone ?? "slate"]}`}
        >
          {badge.label}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="inline-flex min-h-7 items-center justify-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold leading-none text-slate-500 ring-1 ring-inset ring-slate-200">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
