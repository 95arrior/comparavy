"use client";

import { useEffect, useRef, useState } from "react";
import AteFloIcon from "@/components/AteFloIcon";

const detailFields = [
  ["Task", "Meeting notes"],
  ["Client/project", "Homepage refresh"],
  ["Deadline", "Friday"],
  ["Output", "Client recap email"],
] as const;

export default function HomePreviewMockup() {
  const previewRef = useRef<HTMLElement | null>(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const previewElement = previewRef.current;

    if (!previewElement) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPrefersReducedMotion(reducedMotion);

    if (reducedMotion || !("IntersectionObserver" in window)) {
      setHasEnteredView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHasEnteredView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.2,
      },
    );

    observer.observe(previewElement);
    return () => observer.disconnect();
  }, []);

  const isVisible = prefersReducedMotion || hasEnteredView;

  return (
    <section
      ref={previewRef}
      aria-labelledby="home-preview-heading"
      className="px-4 pb-12 sm:px-6 sm:pb-14"
    >
      <div
        className={`mx-auto max-w-6xl transform-gpu transition-[opacity,transform] duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-6 scale-[0.965] opacity-0"
        }`}
      >
        <div className="relative overflow-hidden rounded-[2rem] border border-teal-100 bg-[#F7FBF7] p-3 shadow-[0_26px_80px_rgba(15,23,42,0.13)] sm:rounded-[2.25rem] sm:p-4">
          <div className="rounded-[1.55rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[1.85rem] sm:p-6 lg:p-8">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                  Product preview
                </p>
                <h2
                  id="home-preview-heading"
                  className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
                >
                  From task details to a usable AI result.
                </h2>
              </div>
              <span className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 text-sm font-semibold text-teal-900">
                <AteFloIcon name="meetings" className="h-4 w-4" />
                Meeting notes shortcut
              </span>
            </div>

            <div className="relative mt-6 lg:min-h-[28rem]">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)] sm:p-5 lg:pl-20">
                  <div className="flex items-center gap-2 text-slate-400" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b5f]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f6c85f]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#39c277]" />
                  </div>
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">
                        Generated prompt
                      </p>
                      <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-teal-400 px-3 text-xs font-semibold text-slate-950">
                        <AteFloIcon name="copy" className="h-3.5 w-3.5" />
                        Copy Prompt
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-100">
                      Turn these meeting notes into a client-ready recap and
                      follow-up email. Use only the information provided. Do not
                      invent deadlines, owners, or promises.
                    </p>
                    <div className="mt-4 grid gap-2 text-xs font-medium text-slate-300 sm:grid-cols-2">
                      <span className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2">
                        Include decisions
                      </span>
                      <span className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2">
                        Include open questions
                      </span>
                      <span className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2">
                        Assign owners
                      </span>
                      <span className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2">
                        Draft follow-up
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-teal-100 bg-[#FCFBF7] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                        Finished output
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">
                        Subject: Recap and next steps
                      </h3>
                    </div>
                    <span className="hidden rounded-full border border-teal-100 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 sm:inline-flex">
                      Review-ready
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
                        Decisions
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        Homepage draft is the next priority.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
                        Action items
                      </p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                        <li className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                          <span>Sarah will send logo files.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                          <span>Team prepares homepage draft by Friday.</span>
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Open questions
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        Pricing page copy still needs a decision.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.09)] lg:absolute lg:left-0 lg:top-9 lg:mt-0 lg:w-60">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                  Fill in details
                </p>
                <dl className="mt-3 grid gap-2">
                  {detailFields.map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {label}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-950">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-4 inline-flex w-full items-center gap-3 rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:w-auto lg:absolute lg:bottom-7 lg:right-6 lg:mt-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
                  <AteFloIcon name="structured" className="h-4 w-4" />
                </span>
                <span>Structured prompt in, useful result out.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
