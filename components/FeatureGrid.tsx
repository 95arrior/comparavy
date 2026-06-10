import Reveal from "@/components/Reveal";

const BRAND = "#3f91ff";

function I({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const FEATURES = [
  { t: "유형·문체 선택", d: "하우투·리스트·비교… 원하는 톤으로 골라서.", d2: "M4 6h16M4 12h10M4 18h13" },
  { t: "글감 추천", d: "뭘 쓸지 막막할 때, 경쟁 낮은 키워드를 추천해요.", d2: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.7 10.7c.5.4.7.9.7 1.3v.5h6v-.5c0-.4.2-.9.7-1.3A6 6 0 0 0 12 3Z" },
  { t: "이미지·구조 편집", d: "원하는 이미지를 넣고, 문단·제목을 직접 손질해요.", d2: "M3 4h18v14H3zM3 14l5-5 4 4 3-3 6 6" },
  { t: "목차 자동 생성", d: "긴 글도 목차가 알아서 만들어져요.", d2: "M4 6h16M4 12h16M4 18h10" },
  { t: "AI 태그 추천", d: "글에 맞는 태그를 추천하고, 쓰던 태그도 재사용해요.", d2: "M20.6 13.4 12 22l-9-9V4h9zM7 7h.01" },
  { t: "카테고리 관리", d: "직접 만들고 골라서, 분류까지 깔끔하게.", d2: "M3 7h7l2 2h9v9H3z" },
  { t: "예약 발행 · 캘린더", d: "캘린더로 미리 짜두면 정해둔 시간에 알아서 올라가요.", d2: "M8 2v4M16 2v4M3 9h18M5 5h14v15H5z" },
  { t: "원클릭 발행·내리기", d: "버튼 하나로 워드프레스에 올리고, 다시 내릴 수도 있어요.", d2: "M12 19V5M5 12l7-7 7 7" },
];

/** "이런 것까지 자동" — 빠짐없이 보여주되 한눈에. 아이콘 + 한 줄, 가볍게 등장. */
export default function FeatureGrid() {
  return (
    <section className="border-t border-neutral-200/70 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
        <Reveal>
          <p className="text-center text-sm font-semibold tracking-tight" style={{ color: BRAND }}>이런 것까지, 알아서</p>
          <h2 className="mt-3 text-center text-3xl font-bold leading-[1.2] tracking-tight sm:text-4xl">
            글쓰기부터 발행·관리까지,<br />이 안에서 다 돼요
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center text-base leading-relaxed text-neutral-500">
            도구 여기저기 옮겨다닐 필요 없어요. 키워드만 넣으면 나머지는 AteFlo가 해요.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={(i % 4) * 70}>
              <div className="h-full rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3f91ff]/10 text-[#3f91ff]">
                  <I d={f.d2} />
                </span>
                <p className="mt-4 text-sm font-semibold tracking-tight text-neutral-900">{f.t}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
