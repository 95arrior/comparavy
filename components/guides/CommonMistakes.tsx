import SectionHeading from "@/components/SectionHeading";

interface CommonMistakesProps {
  readonly mistakes?: readonly string[];
  readonly fallback: readonly string[];
  readonly eyebrow?: string;
  readonly title?: string;
}

export default function CommonMistakes({
  mistakes,
  fallback,
  eyebrow = "Common mistakes",
  title = "Avoid these",
}: CommonMistakesProps) {
  const items = mistakes && mistakes.length > 0 ? mistakes : fallback;

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading eyebrow={eyebrow}>{title}</SectionHeading>
      <ul className="mt-5 grid gap-3 text-sm leading-7 text-slate-700 lg:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
