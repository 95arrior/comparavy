import type { AiTool } from "@/types/tool";

export interface Badge {
  readonly label: string;
  readonly tone?: "teal" | "slate" | "amber";
}

interface BadgeRowProps {
  readonly badges: readonly Badge[];
}

const TONE_CLASSES = {
  teal: "bg-teal-50 text-teal-800 ring-teal-100",
  slate: "bg-slate-50 text-slate-700 ring-slate-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
} as const;

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

  if (tool.freePlan && tool.qualityScore >= 8) {
    badges.push({ label: "Best value", tone: "amber" });
  }

  return badges;
}

export default function BadgeRow({ badges }: BadgeRowProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[badge.tone ?? "slate"]}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
