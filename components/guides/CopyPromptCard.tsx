"use client";

import { useState } from "react";

interface CopyPromptCardProps {
  readonly prompt: string;
}

export default function CopyPromptCard({ prompt }: CopyPromptCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Copy prompt
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Start with this prompt
          </h2>
        </div>
        <button
          type="button"
          onClick={copyPrompt}
          className="rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          {copied ? "Copied" : "Copy Prompt"}
        </button>
      </div>
      <pre className="mt-5 whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        {prompt}
      </pre>
    </section>
  );
}
