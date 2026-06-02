"use client";

import { useEffect, useRef, useState } from "react";

interface BeforeAfterProofCardProps {
  readonly before?: string;
  readonly after?: string;
}

interface LabeledSegment {
  readonly label: string;
  readonly value: string;
}

function cleanExampleText(value?: string): string {
  return (value ?? "")
    .trim()
    .replace(/^Example (input|output):\s*/i, "")
    .trim();
}

function splitLabeledSegments(value: string): readonly LabeledSegment[] {
  const labeledPattern =
    /(^|[\n.]\s+)(?:([A-Z][A-Za-z /-]{1,42}):\s*|(Deadline not specified|Owner not specified)\.?)/g;
  const matches = Array.from(value.matchAll(labeledPattern));
  const segments: LabeledSegment[] = [];

  if (matches.length === 0) {
    return [];
  }

  let lastIndex = 0;

  matches.forEach((match, index) => {
    const matchIndex = match.index ?? 0;
    const leadingText = value
      .slice(lastIndex, matchIndex)
      .replace(/^\.\s*/, "")
      .trim();

    if (leadingText) {
      segments.push({ label: "Item", value: leadingText });
    }

    const phraseLabel = match[3];

    if (phraseLabel) {
      const label = phraseLabel.startsWith("Deadline") ? "Deadline" : "Owner";
      segments.push({ label, value: "Not specified" });
      lastIndex = matchIndex + match[0].length;
      return;
    }

    const label = match[2]?.trim();
    const contentStart = matchIndex + match[0].length;
    const nextMatch = matches[index + 1];
    const contentEnd = nextMatch?.index ?? value.length;

    if (label) {
      const valueText = value
        .slice(contentStart, contentEnd)
        .replace(/^\.\s*/, "")
        .trim();

      if (valueText) {
        segments.push({ label, value: valueText });
      }
    }

    lastIndex = contentEnd;
  });

  const trailingText = value
    .slice(lastIndex)
    .replace(/^\.\s*/, "")
    .trim();

  if (trailingText) {
    segments.push({ label: "Item", value: trailingText });
  }

  return segments;
}

function AfterRows({ text }: { readonly text: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const segments = splitLabeledSegments(text);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const node = containerRef.current;

    if (!node) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (segments.length === 0) {
    return (
      <div ref={containerRef}>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">
          {text}
        </pre>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mt-3 space-y-2">
      {segments.map((segment, index) => (
        <div
          key={`${segment.label}-${segment.value}`}
          className={`rounded-2xl border border-teal-100 bg-white px-3 py-2 transition duration-500 ease-out ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
          style={{ transitionDelay: isVisible ? `${index * 70}ms` : "0ms" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            {segment.label}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{segment.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function BeforeAfterProofCard({
  before,
  after,
}: BeforeAfterProofCardProps) {
  const beforeText = cleanExampleText(before);
  const afterText = cleanExampleText(after);

  if (!beforeText || !afterText) {
    return null;
  }

  return (
    <section
      aria-labelledby="before-after-proof-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            Before and after
          </p>
          <h2
            id="before-after-proof-heading"
            className="mt-2 text-xl font-semibold tracking-tight text-slate-950"
          >
            See what the prompt changes
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-600">
          Use this as the shape check before you paste your own details.
        </p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-slate-900">Before</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{beforeText}</p>
        </div>

        <div
          aria-hidden="true"
          className="flex items-center justify-center text-sm font-semibold text-teal-700 lg:hidden"
        >
          ↓
        </div>

        <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
          <p className="text-sm font-semibold text-teal-900">After</p>
          <AfterRows text={afterText} />
        </div>
      </div>
    </section>
  );
}
