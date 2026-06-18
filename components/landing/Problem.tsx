import Reveal from "@/components/Reveal";

// [2] 문제 공감 — 토스톤: 짧은 호흡·여백. 고민 3개(공감) → "그래서 다 해드려요"(전환).
const CONCERNS: { text: string; icon: React.ReactNode }[] = [
  {
    text: "대행사는 비싸고",
    icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>,
  },
  {
    text: "직접 하자니 막막하고",
    icon: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  },
  {
    text: "시작해도 며칠 못 가 멈추고",
    icon: <><circle cx="12" cy="12" r="10" /><line x1="10" y1="15" x2="10" y2="9" /><line x1="14" y1="15" x2="14" y2="9" /></>,
  },
];

export default function Problem() {
  return (
    <section className="mx-auto max-w-2xl px-6 pb-28 pt-14 text-center sm:pb-32 sm:pt-16">
      <Reveal>
        <h2 className="font-pretendard text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          블로그, 해야 하는 건 알죠.
        </h2>
      </Reveal>

      <div className="mx-auto mt-12 max-w-md space-y-3 text-left sm:mt-14">
        {CONCERNS.map((c, i) => (
          <Reveal key={c.text} delay={120 + i * 110}>
            <div className="flex items-center gap-3.5 rounded-2xl border border-neutral-100 bg-neutral-50/70 px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-400 shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
              </span>
              <p className="text-[15px] text-neutral-600 sm:text-base">{c.text}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={520}>
        <div className="mt-16 sm:mt-20">
          <p className="font-pretendard text-[1.7rem] font-bold leading-snug tracking-tight sm:text-[2rem]">
            그래서 <span className="text-[#1D75F7]">다 해드려요.</span>
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-500 sm:text-lg">
            오래가는 블로그 운영, 곁에서 도울게요.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
