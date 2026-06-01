"use client";

import { useEffect, useId, useRef, useState } from "react";
import AteFloIcon from "@/components/AteFloIcon";

interface CopyPromptCardProps {
  readonly prompt: string;
  readonly title?: string;
  readonly description?: string;
  readonly buttonLabel?: string;
}

export default function CopyPromptCard({
  prompt,
  title = "Start with this prompt",
  description = "Copy this prompt, replace the source material, and review the output before using it.",
  buttonLabel = "Copy Prompt",
}: CopyPromptCardProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const statusId = useId();
  const resetTimer = useRef<number | undefined>(undefined);
  const sectionId = `copy-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "prompt"}`;

  useEffect(() => {
    return () => {
      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");

      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }

      resetTimer.current = window.setTimeout(() => setCopyState("idle"), 3200);
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section id={sectionId} className="scroll-mt-6 rounded-3xl border border-teal-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Copy prompt
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            {description}
          </p>
        </div>
        <div className="sm:max-w-xs">
          <button
            type="button"
            onClick={copyPrompt}
            aria-describedby={statusId}
            className="ateflo-copy-button inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-base font-semibold text-white shadow-sm transition duration-150 hover:bg-teal-800 hover:shadow-md active:translate-y-px active:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:w-auto sm:text-sm"
          >
            <AteFloIcon
              name={copyState === "copied" ? "productivity" : "copy"}
              className="h-4 w-4"
            />
            {copyState === "copied" ? "Copied!" : buttonLabel}
          </button>
          <p
            id={statusId}
            role="status"
            aria-live="polite"
            className="mt-2 min-h-5 text-sm leading-5 text-slate-600"
          >
            {copyState === "copied"
              ? "Prompt copied — paste it into ChatGPT, Claude, Gemini, Copilot, or another AI chat tool."
              : copyState === "failed"
                ? "Copy failed. Select the prompt text below and copy it manually."
                : ""}
          </p>
        </div>
      </div>
      <pre className="mt-5 max-w-full whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-7 text-slate-100 [overflow-wrap:anywhere]">
        {prompt}
      </pre>
    </section>
  );
}
