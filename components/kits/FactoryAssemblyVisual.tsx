const inputCards = ["Business details", "Main offer", "Customer type"];
const outputCards = ["GBP post", "Social caption", "Review checklist"];
const lockedModules = ["30-day plan", "Website copy", "Setup checklist"];

export default function FactoryAssemblyVisual() {
  return (
    <div
      aria-label="AteFlo kit assembly interface"
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="absolute inset-x-6 top-16 h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Kit assembly interface
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Input {"->"} assembly {"->"} packaged workflow
          </p>
        </div>
        <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          온라인 영업 세팅
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.82fr_0.72fr_1fr] lg:items-stretch">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Input cards
          </p>
          <div className="mt-3 grid gap-3">
            {inputCards.map((item, index) => (
              <div
                key={item}
                className={`ateflo-factory-card ateflo-factory-delay-${index + 1} rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex min-h-44 flex-col justify-between rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
            Assembly
          </p>
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-x-0 top-1/2 h-px bg-teal-200" aria-hidden="true" />
            <div className="ateflo-factory-pulse relative flex h-20 w-20 items-center justify-center rounded-2xl border border-teal-200 bg-white text-sm font-semibold text-teal-800 shadow-sm">
              Build
            </div>
          </div>
          <p className="text-xs leading-5 text-teal-900">
            AteFlo organizes the facts into a repeatable kit flow.
          </p>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Sample kit output
          </p>
          <div className="mt-3 grid gap-3">
            {outputCards.map((item, index) => (
              <div
                key={item}
                className={`ateflo-factory-card ateflo-factory-delay-${index + 2} rounded-2xl border border-teal-100 bg-teal-50 p-3 text-sm font-semibold text-teal-900`}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Locked full kit box
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
