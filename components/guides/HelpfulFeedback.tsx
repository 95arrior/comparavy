"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface HelpfulFeedbackProps {
  readonly guideSlug: string;
  readonly guideTitle: string;
  readonly topicCluster?: string;
}

type HelpfulChoice = "yes" | "no";

const choiceMessages: Record<HelpfulChoice, string> = {
  yes: "You marked this shortcut as helpful. Thanks — this helps us improve AteFlo shortcuts.",
  no: "Thanks — we'll use this signal to improve the shortcut.",
};

export default function HelpfulFeedback({
  guideSlug,
  guideTitle,
  topicCluster,
}: HelpfulFeedbackProps) {
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const storageKey = useMemo(
    () => `ateflo:helpful-feedback:${guideSlug}`,
    [guideSlug],
  );

  useEffect(() => {
    try {
      const savedChoice = window.localStorage.getItem(storageKey);

      if (savedChoice === "yes" || savedChoice === "no") {
        setChoice(savedChoice);
      }
    } catch {
      // Local storage can be unavailable in private or restricted contexts.
    }
  }, [storageKey]);

  function handleChoice(nextChoice: HelpfulChoice) {
    setChoice(nextChoice);

    try {
      window.localStorage.setItem(storageKey, nextChoice);
    } catch {
      // Feedback should still work visually if local storage is blocked.
    }

    trackEvent(nextChoice === "yes" ? "helpful_yes_click" : "helpful_no_click", {
      guide_slug: guideSlug,
      guide_title: guideTitle,
      topic_cluster: topicCluster,
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Was this helpful?
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Mark whether this shortcut matched the job you came to finish.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={choice === "yes"}
            data-event="helpful_yes_click"
            data-event-name="helpful_yes_click"
            data-guide-slug={guideSlug}
            data-guide-title={guideTitle}
            onClick={() => handleChoice("yes")}
            className={`min-h-11 rounded-full border px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
              choice === "yes"
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-teal-200 bg-teal-50 text-teal-900 hover:border-teal-300 hover:bg-teal-100"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            aria-pressed={choice === "no"}
            data-event="helpful_no_click"
            data-event-name="helpful_no_click"
            data-guide-slug={guideSlug}
            data-guide-title={guideTitle}
            onClick={() => handleChoice("no")}
            className={`min-h-11 rounded-full border px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
              choice === "no"
                ? "border-slate-700 bg-slate-800 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            Not yet
          </button>
        </div>
      </div>
      {choice && (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
        >
          {choiceMessages[choice]}
        </p>
      )}
    </section>
  );
}
