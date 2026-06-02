import CollapsedGuideSection from "@/components/guides/CollapsedGuideSection";

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
    <CollapsedGuideSection eyebrow="Real-world scenario" title="Who this is for">
      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-slate-900">Reader</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {audience} who need a clear way to handle {useCase}.
          </p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Situation</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {scenario?.trim() || userPain}
          </p>
        </div>
      </div>
    </CollapsedGuideSection>
  );
}
