import type { AiTool, ToolScore } from "@/types/tool";

export type MetricKey =
  | "easeScore"
  | "speedScore"
  | "qualityScore"
  | "beginnerScore";

interface MetricBarsProps {
  readonly tool: Pick<AiTool, MetricKey>;
  readonly metrics?: readonly MetricKey[];
  readonly compact?: boolean;
}

const METRIC_LABELS: Record<MetricKey, string> = {
  easeScore: "Ease",
  speedScore: "Speed",
  qualityScore: "Quality",
  beginnerScore: "Beginner-friendly",
};

const DEFAULT_METRICS: readonly MetricKey[] = [
  "easeScore",
  "speedScore",
  "qualityScore",
  "beginnerScore",
];

const BAR_WIDTHS: Record<ToolScore, string> = {
  1: "w-[10%]",
  2: "w-[20%]",
  3: "w-[30%]",
  4: "w-[40%]",
  5: "w-[50%]",
  6: "w-[60%]",
  7: "w-[70%]",
  8: "w-[80%]",
  9: "w-[90%]",
  10: "w-full",
};

export default function MetricBars({
  tool,
  metrics = DEFAULT_METRICS,
  compact = false,
}: MetricBarsProps) {
  return (
    <div className={compact ? "space-y-2.5" : "grid gap-4 sm:grid-cols-2"}>
      {metrics.map((metric, index) => {
        const value = tool[metric];

        return (
          <div key={metric}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">{METRIC_LABELS[metric]}</span>
              <span className="font-semibold text-slate-800">{value}/10</span>
            </div>
            <div className="comparavy-metric-bar__track h-1.5 rounded-full bg-slate-100">
              <div
                className={`comparavy-metric-bar h-full rounded-full bg-teal-600 ${BAR_WIDTHS[value]}`}
                style={{ animationDelay: `${index * 90}ms` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
