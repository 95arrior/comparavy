"use client";

import { useState } from "react";

interface CopyPromptCardProps {
  readonly prompt: string;
  readonly title?: string;
  readonly description?: string;
}

export default function CopyPromptCard({
  prompt,
  title = "Start with this prompt",
  description = "Copy this prompt, replace the source material, and review the output before using it.",
}: CopyPromptCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="copy-prompt" className="scroll-mt-6 rounded-3xl border border-teal-200 bg-white p-5 shadow-sm sm:p-6">
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
        <button
          type="button"
          onClick={copyPrompt}
          className="min-h-11 rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          {copied ? "Copied" : "Copy Prompt"}
        </button>
      </div>
      <pre className="mt-5 max-w-full whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-7 text-slate-100 [overflow-wrap:anywhere]">
        {prompt}
      </pre>
    </section>
  );
}
