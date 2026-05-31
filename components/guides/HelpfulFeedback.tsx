"use client";

import { useState } from "react";

export default function HelpfulFeedback() {
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Was this helpful?
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This saves feedback locally for now while the site stays database-free.
          </p>
        </div>
        <div className="flex gap-2">
          {(["yes", "no"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={choice === value}
              onClick={() => setChoice(value)}
              className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                choice === value
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50"
              }`}
            >
              {value === "yes" ? "Yes" : "Not Yet"}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
