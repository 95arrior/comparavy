import SectionHeading from "@/components/SectionHeading";

interface ExampleResultBlockProps {
  readonly before?: string;
  readonly result?: string;
  readonly fallback: string;
}

export default function ExampleResultBlock({
  before,
  result,
  fallback,
}: ExampleResultBlockProps) {
  const output = result?.trim() || fallback;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading eyebrow="Example result">What a useful output can look like</SectionHeading>
      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-7 text-amber-950/80">
          <p className="font-semibold text-amber-900">Before</p>
          <p className="mt-2">{before?.trim() || "Messy source material, loose notes, or a rough draft."}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm leading-7 text-emerald-950/80">
          <p className="font-semibold text-emerald-900">After</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-7">{output}</pre>
        </div>
      </div>
    </section>
  );
}
