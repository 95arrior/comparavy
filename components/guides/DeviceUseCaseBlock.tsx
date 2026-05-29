interface DeviceUseCaseBlockProps {
  readonly desktopUseCase?: string;
  readonly mobileUseCase?: string;
  readonly desktopSearchAngle?: string;
  readonly mobileSearchAngle?: string;
  readonly desktopFallback?: string;
  readonly mobileFallback?: string;
}

export default function DeviceUseCaseBlock({
  desktopUseCase,
  mobileUseCase,
  desktopSearchAngle,
  mobileSearchAngle,
  desktopFallback,
  mobileFallback,
}: DeviceUseCaseBlockProps) {
  const desktop = desktopUseCase?.trim() || desktopFallback;
  const mobile = mobileUseCase?.trim() || mobileFallback;

  if (!desktop && !mobile) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
        Device fit
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
        Best on desktop or phone
      </h3>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {desktop && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">Best if you are on a computer</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{desktop}</p>
            {desktopSearchAngle && (
              <p className="mt-3 text-xs leading-6 uppercase tracking-[0.14em] text-slate-500">
                {desktopSearchAngle}
              </p>
            )}
          </div>
        )}
        {mobile && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">Best if you are on your phone</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{mobile}</p>
            {mobileSearchAngle && (
              <p className="mt-3 text-xs leading-6 uppercase tracking-[0.14em] text-slate-500">
                {mobileSearchAngle}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
