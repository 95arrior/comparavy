import Link from "next/link";
import BadgeRow from "@/components/BadgeRow";
import type { Guide } from "@/lib/guides";

interface RelatedShortcutsProps {
  readonly guides: readonly Guide[];
}

export default function RelatedShortcuts({ guides }: RelatedShortcutsProps) {
  if (guides.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
        Related shortcuts
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
        Keep going with a similar workflow
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {guides.map((guide) => (
          <article key={guide.slug} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <BadgeRow badges={[{ label: guide.category, tone: "teal" }]} />
            <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">
              <Link href={`/guides/${guide.slug}`} className="transition hover:text-teal-700">
                {guide.title}
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {guide.metaDescription}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
