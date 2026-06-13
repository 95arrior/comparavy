import Reveal from "@/components/Reveal";

const BRAND = "#3f91ff";
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// 예시 스케줄: 날짜 → 상태(발행/예약)
const PUBLISHED = [3, 6, 9];
const SCHEDULED = [13, 16, 20, 24, 27];
const TODAY = 11;
const FIRST_DOW = 6; // 1일이 시작하는 요일(토) — 목업용
const DAYS = 30;

function CalendarMock() {
  const cells: (number | null)[] = [...Array(FIRST_DOW).fill(null), ...Array.from({ length: DAYS }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
        <p className="text-sm font-bold tracking-tight">6월</p>
        <div className="flex items-center gap-3 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#3f91ff]" /> 예약</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> 발행</span>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-px">
          {WEEK.map((w, i) => (
            <div key={w} className={`pb-2 text-center text-[11px] font-medium ${i === 0 ? "text-rose-400" : i === 6 ? "text-[#3f91ff]" : "text-neutral-400"}`}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} className="aspect-square" />;
            const pub = PUBLISHED.includes(d);
            const sch = SCHEDULED.includes(d);
            const today = d === TODAY;
            return (
              <div key={d} className="flex aspect-square flex-col items-center justify-start rounded-lg pt-1">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${today ? "bg-neutral-900 font-bold text-white" : "text-neutral-500"}`}>{d}</span>
                {(pub || sch) && (
                  <span className={`mt-1 h-1 w-4/5 rounded-full ${pub ? "bg-emerald-500" : "bg-[#3f91ff]"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarShowcase() {
  return (
    <section className="border-t border-neutral-200/70">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-24 sm:py-28 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <p className="flex items-center gap-1.5 text-sm font-semibold tracking-tight" style={{ color: BRAND }}>예약 발행</p>
          <h2 className="mt-4 text-3xl font-bold leading-[1.22] tracking-tight sm:text-[2.5rem] sm:leading-[1.18]">
            미리 써두면,<br />알아서 올라가요.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-neutral-500">
            매일 붙잡고 있지 않아도, 블로그가 꾸준히 채워져요.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <CalendarMock />
        </Reveal>
      </div>
    </section>
  );
}
