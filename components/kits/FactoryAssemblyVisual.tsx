const inputCards = ["Business details", "Job notes", "Profile notes"];
const outputCards = ["Prompt sequence", "Review checklist", "Action plan"];
const lockedModules = ["30-day plan", "Templates", "Setup steps"];

export default function FactoryAssemblyVisual() {
  return (
    <div
      aria-label="AteFlo workflow kit factory diagram"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
        Workflow kit factory
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_0.7fr_1fr] md:items-stretch">
        <div className="grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Inputs
          </p>
          {inputCards.map((item, index) => (
            <div
              key={item}
              className={`ateflo-factory-card ateflo-factory-delay-${index + 1} rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-sm font-semibold text-slate-700`}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="relative flex min-h-32 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <div className="absolute left-4 right-4 top-1/2 h-px bg-teal-200" aria-hidden="true" />
          <div className="relative rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-800 shadow-sm">
            Assemble
          </div>
        </div>

        <div className="grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Packaged kit
          </p>
          {outputCards.map((item, index) => (
            <div
              key={item}
              className={`ateflo-factory-card ateflo-factory-delay-${index + 2} rounded-2xl border border-teal-100 bg-teal-50 p-3 text-sm font-semibold text-teal-900`}
            >
              {item}
            </div>
          ))}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Locked full kit modules
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {lockedModules.map((module) => (
                <span
                  key={module}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {module}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
