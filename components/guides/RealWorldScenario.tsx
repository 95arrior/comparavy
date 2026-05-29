import SectionHeading from "@/components/SectionHeading";

interface RealWorldScenarioProps {
  readonly scenario?: string;
  readonly audience: string;
  readonly useCase: string;
  readonly userPain: string;
}

export default function RealWorldScenario({
  scenario,
  audience,
  useCase,
  userPain,
}: RealWorldScenarioProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading eyebrow="Real-world scenario">Who this is for</SectionHeading>
      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-slate-900">Reader</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {audience} trying to handle {useCase}.
          </p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Situation</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {scenario?.trim() || userPain}
          </p>
        </div>
      </div>
    </section>
  );
}
