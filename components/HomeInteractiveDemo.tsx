"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AteFloIcon from "@/components/AteFloIcon";
import CategoryChip from "@/components/CategoryChip";

const stages = [
  "Search",
  "Shortcut",
  "Details",
  "Prompt",
  "Copy",
  "Result",
] as const;

const promptText =
  "Turn these meeting notes into a client-ready recap and follow-up email. Use only the information provided. Do not invent deadlines, owners, or promises.";

function stageLabel(index: number) {
  return stages[index] ?? stages[0];
}

export default function HomeInteractiveDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPrefersReducedMotion(reducedMotion);

    if (reducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % stages.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  function demoStepClass(step: number) {
    if (prefersReducedMotion) {
      return "border-teal-100 bg-white";
    }

    return activeStep === step
      ? "border-teal-300 bg-teal-50/50 shadow-[0_16px_36px_rgba(15,118,110,0.10)]"
      : "border-slate-200 bg-white";
  }

  function handleCopyDemo() {
    setCopied(true);
    setActiveStep(4);

    if (resetTimer.current !== undefined) {
      window.clearTimeout(resetTimer.current);
    }

    resetTimer.current = window.setTimeout(() => setCopied(false), 2400);
  }

  const currentStage = useMemo(
    () => (prefersReducedMotion ? "Full demo" : stageLabel(activeStep)),
    [activeStep, prefersReducedMotion],
  );

  return (
    <section className="px-4 pb-12 sm:px-6 sm:pb-14" aria-labelledby="home-demo-heading">
      <div className="mx-auto max-w-6xl rounded-3xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              See the flow
            </p>
            <h2
              id="home-demo-heading"
              className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
            >
              Search, fill in details, and copy a better prompt.
            </h2>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">
            <span className="h-2 w-2 rounded-full bg-teal-600" aria-hidden="true" />
            {currentStage}
          </div>
        </div>

        <div
          className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6"
          aria-label="Demo stages"
        >
          {stages.map((stage, index) => (
            <button
              key={stage}
              type="button"
              className={`inline-flex min-h-9 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                activeStep === index || prefersReducedMotion
                  ? "border-teal-200 bg-teal-50 text-teal-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50"
              }`}
              onClick={() => setActiveStep(index)}
            >
              {stage}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <section
              className={`rounded-3xl border p-4 transition duration-300 ${demoStepClass(0)}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                Search
              </p>
              <div className="ateflo-home-search-box mt-3 flex items-center gap-3 rounded-[2rem] border border-teal-200 bg-white px-4 py-3 shadow-[0_18px_55px_rgba(15,118,110,0.10)]">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700"
                  aria-hidden="true"
                >
                  <AteFloIcon name="search" className="h-5 w-5" />
                </span>
                <p className="flex min-h-10 flex-1 items-center text-base font-medium text-slate-950">
                  meeting notes
                </p>
              </div>
            </section>

            <section
              className={`rounded-3xl border p-4 transition duration-300 ${demoStepClass(1)}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <CategoryChip label="Work" />
                <span className="text-xs font-medium text-slate-500">
                  AI shortcut · 10 min
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-950">
                Meeting Notes to Client Recap Email
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Turn rough call notes into decisions, action items, and a short follow-up.
              </p>
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Works with
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Otter.ai", "ChatGPT", "Claude"].map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section
            className={`rounded-3xl border p-5 shadow-sm transition duration-300 sm:p-6 ${demoStepClass(2)}`}
          >
            <div className="grid gap-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                  Add details
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  A mini prompt builder.
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-900">
                    Client/project
                  </span>
                  <span className="mt-2 flex min-h-12 w-full items-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm">
                    Homepage refresh
                  </span>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-900">
                    Deadline
                  </span>
                  <span className="mt-2 flex min-h-12 w-full items-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm">
                    Friday
                  </span>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-slate-900">Notes</span>
                <span className="mt-2 block min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-950 shadow-sm">
                  Sarah sends logo files. Pricing page copy is still open.
                </span>
              </label>

              <div
                className={`rounded-3xl border p-4 transition duration-300 ${demoStepClass(3)}`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                  Use this prompt
                </p>
                <pre className="mt-3 max-w-full whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-7 text-slate-100 [overflow-wrap:anywhere]">
                  {promptText}
                </pre>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleCopyDemo}
                    className="ateflo-primary-copy-button inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:w-auto sm:text-sm"
                  >
                    <span className="relative z-10 inline-flex items-center gap-2">
                      <AteFloIcon
                        name={copied ? "productivity" : "copy"}
                        className="h-4 w-4"
                      />
                      {copied ? "Copied!" : "Copy Prompt"}
                    </span>
                  </button>
                  <p role="status" aria-live="polite" className="min-h-5 text-sm text-slate-600">
                    {copied ? "Demo copied state shown." : ""}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section
          className={`mt-4 rounded-3xl border p-5 transition duration-300 sm:p-6 ${demoStepClass(5)}`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                Result
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                Recap and next steps
              </h3>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-teal-100 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800">
              Review before sending
            </span>
          </div>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-3">
            {[
              "Homepage draft is the next priority.",
              "Sarah sends logo files.",
              "Pricing page copy remains open.",
            ].map((item) => (
              <li key={item} className="rounded-2xl border border-teal-100 bg-white p-4">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
