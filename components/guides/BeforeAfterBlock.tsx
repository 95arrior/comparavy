interface BeforeAfterBlockProps {
  readonly title?: string;
  readonly before: string;
  readonly after: string;
}

export default function BeforeAfterBlock({
  title = "Before and after",
  before,
  after,
}: BeforeAfterBlockProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
        Contrast
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
        {title}
      </h3>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <p className="text-sm font-semibold text-amber-900">Before</p>
          <p className="mt-2 text-sm leading-7 text-amber-950/80">{before}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-sm font-semibold text-emerald-900">After</p>
          <p className="mt-2 text-sm leading-7 text-emerald-950/80">{after}</p>
        </div>
      </div>
    </section>
  );
}
