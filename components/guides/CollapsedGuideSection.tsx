interface CollapsedGuideSectionProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description?: string;
  readonly children: React.ReactNode;
}

export default function CollapsedGuideSection({
  eyebrow,
  title,
  description,
  children,
}: CollapsedGuideSectionProps) {
  return (
    <details className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            {eyebrow}
          </span>
          <span className="mt-2 block text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </span>
          {description && (
            <span className="mt-2 block max-w-2xl text-sm leading-7 text-slate-600">
              {description}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-normal text-teal-700 transition group-open:rotate-45 group-open:bg-teal-50"
        >
          +
        </span>
      </summary>
      <div className="mt-5 border-t border-slate-100 pt-5">{children}</div>
    </details>
  );
}
