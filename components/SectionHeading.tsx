interface SectionHeadingProps {
  readonly eyebrow: string;
  readonly marker?: string;
  readonly children: React.ReactNode;
  readonly description?: string;
}

export default function SectionHeading({
  eyebrow,
  marker,
  children,
  description,
}: SectionHeadingProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
        {marker && (
          <span aria-hidden="true" className="mr-2 normal-case tracking-normal">
            {marker}
          </span>
        )}
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {children}
      </h2>
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          {description}
        </p>
      )}
    </div>
  );
}
