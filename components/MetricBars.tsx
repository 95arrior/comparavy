"use client";

import { useEffect, useRef, useState } from "react";
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

export default function MetricBars({
  tool,
  metrics = DEFAULT_METRICS,
  compact = false,
}: MetricBarsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={compact ? "space-y-2.5" : "grid gap-4 sm:grid-cols-2"}
    >
      {metrics.map((metric, index) => {
        const value = tool[metric];
        const width = `${value * 10}%`;

        return (
          <div key={metric}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">{METRIC_LABELS[metric]}</span>
              <span className="font-semibold text-slate-800">{value}/10</span>
            </div>
            <div className="ateflo-metric-bar__track h-1.5 rounded-full bg-slate-100">
              <div
                className="ateflo-metric-bar h-full rounded-full bg-teal-600"
                style={{
                  width,
                  transform: isVisible ? "scaleX(1)" : "scaleX(0)",
                  transitionDelay: `${index * 70}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
