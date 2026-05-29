import SectionHeading from "@/components/SectionHeading";

interface QuickAnswerBoxProps {
  readonly eyebrow?: string;
  readonly title?: string;
  readonly answer?: string;
  readonly fallback: string;
}

export default function QuickAnswerBox({
  eyebrow = "Quick answer",
  title = "Start with this",
  answer,
  fallback,
}: QuickAnswerBoxProps) {
  const text = answer?.trim() || fallback;

  return (
    <section className="rounded-3xl border border-teal-100 bg-teal-50/80 p-5 shadow-sm sm:p-6">
      <SectionHeading eyebrow={eyebrow}>{title}</SectionHeading>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-800 sm:text-lg sm:leading-8">
        {text}
      </p>
    </section>
  );
}
