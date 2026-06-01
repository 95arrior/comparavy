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
      <SectionHeading eyebrow="Supporting example">Check the shape of the output</SectionHeading>
      <div className="mt-5 grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          <p className="font-semibold text-slate-900">Source context</p>
          <p className="mt-2">{before?.trim() || "Messy source material, loose notes, or a rough draft."}</p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-[#F6FBF8] p-4 text-sm leading-7 text-slate-700">
          <p className="font-semibold text-teal-900">Reviewable result</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-7">{output}</pre>
        </div>
      </div>
    </section>
  );
}
