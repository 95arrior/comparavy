"use client";

import { useState } from "react";

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

interface FaqAccordionProps {
  readonly items: readonly FaqItem[];
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const open = openIndex === index;

        return (
          <div
            key={item.question}
            className={`overflow-hidden rounded-2xl border transition ${
              open
                ? "border-teal-200 bg-white shadow-sm"
                : "border-slate-100 bg-slate-50/60"
            }`}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold leading-6 text-slate-900">
                {item.question}
              </span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg font-normal text-teal-700 transition ${
                  open ? "rotate-45 bg-teal-50" : "bg-white"
                }`}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-7 text-slate-600">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
