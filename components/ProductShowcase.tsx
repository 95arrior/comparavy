import Reveal from "@/components/Reveal";

const BRAND = "#3182F6";

/** 앱 화면처럼 보이는 프레임(상단 점 3개 + 라벨). */
function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        <span className="ml-2 text-xs font-medium text-neutral-400">{label}</span>
      </div>
      <div className="flex h-[256px] flex-col p-5 [&>p:last-child]:mt-auto [&>p:last-child]:pt-4">{children}</div>
    </div>
  );
}

function Bar({ w, c = "bg-neutral-200", delay }: { w: string; c?: string; delay?: number }) {
  const animated = delay !== undefined;
  return (
    <div
      className={`h-2 rounded-full ${c} ${animated ? "mock-gen-bar" : ""}`}
      style={{ width: w, animationDelay: animated ? `${delay}s` : undefined }}
    />
  );
}

// 마우스 커서 + 클릭 링 (버튼 위에서 '톡' 누르는 연출). gen=초반 클릭, 기본=후반 클릭
function Cursor({ className = "", gen = false }: { className?: string; gen?: boolean }) {
  return (
    <span className={`pointer-events-none absolute z-10 ${className}`}>
      <span className={`absolute -left-2 -top-2 h-7 w-7 rounded-full bg-[#3f91ff]/30 ${gen ? "mock-gen-ring" : "mock-ring"}`} />
      <svg className={`relative drop-shadow ${gen ? "mock-gen-tap" : "mock-tap"}`} width="18" height="18" viewBox="0 0 24 24">
        <path d="M5 3l6 16 2-6 6-2z" fill="#191F28" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const ImgIcon = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5L5 20" /></svg>
);

// 1. 글 생성 — 커서가 '글 생성'을 누르면 줄이 쭈루룩 생겼다 사라짐(루프)
function MockGenerate() {
  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5">
        <span className="flex-1 text-sm text-neutral-700">강아지 분리불안 해결 방법</span>
        <span className="relative rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">
          글 생성
          <Cursor gen className="-bottom-2 right-1" />
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        <Bar w="100%" delay={0.15} />
        <Bar w="95%" delay={0.4} />
        <Bar w="88%" delay={0.65} />
        <Bar w="60%" delay={0.9} />
      </div>
      <p className="mt-5 text-center text-xs font-medium text-[#3f91ff]">키워드 하나로, 글이 써져요</p>
    </div>
  );
}

// 2. 글 편집 — 커서가 '이미지 추가'를 누르면 이미지가 들어옴
function MockEdit() {
  return (
    <div>
      <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-1.5 text-neutral-400">
        {["B", "H", "≡"].map((t) => (
          <span key={t} className="flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold">{t}</span>
        ))}
        <span className="flex h-6 w-6 items-center justify-center rounded"><ImgIcon s={13} /></span>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-2.5 w-3/5 rounded bg-neutral-800" />
        <Bar w="100%" />
        <Bar w="88%" />
      </div>
      {/* 이미지 추가 버튼 + 커서 */}
      <div className="relative mt-3 inline-block">
        <span className="flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-2.5 py-1.5 text-[11px] font-medium text-neutral-500">
          <ImgIcon s={13} /> 이미지 추가
        </span>
        <Cursor className="-bottom-1 right-1" />
      </div>
      {/* 들어오는 이미지 (클릭 후 떠오름) */}
      <div className="mock-reveal-img mt-3 flex h-14 items-center justify-center rounded-lg bg-neutral-100 text-neutral-300">
        <ImgIcon s={26} />
      </div>
      <p className="mt-3 text-center text-xs font-medium text-[#3f91ff]">이미지 넣고 직접 손질해요</p>
    </div>
  );
}

// 3. 워드프레스 발행 — 글 미리보기 위, 발행 버튼은 아래. 버튼 클릭 시 원형 체크
function MockPublish() {
  return (
    <div>
      {/* 위: 발행 결과(클릭 후 떠오름) */}
      <div className="mock-reveal flex flex-col items-center py-2 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: "#2fd07a" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="mt-2.5 text-sm font-semibold">올렸어요</p>
        <p className="mt-0.5 text-xs text-neutral-400">myblog.com/dog-anxiety</p>
      </div>
      {/* 아래: 발행 버튼 + 커서 */}
      <div className="relative mt-3">
        <span className="block rounded-xl py-2.5 text-center text-sm font-semibold text-white" style={{ background: BRAND }}>워드프레스에 발행</span>
        <Cursor className="-bottom-2 right-6" />
      </div>
      <p className="mt-4 text-center text-xs font-medium text-[#3f91ff]">버튼 하나로 발행돼요</p>
    </div>
  );
}

// 4. 내 글 관리 — 예약했던 글이 시간 되면 '예약됨 → 발행됨'으로 자동 전환(루프)
function MockArticles() {
  return (
    <div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">강아지 분리불안 해결 방법</span>
          <span className="shrink-0 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white">발행됨</span>
        </div>
        {/* 예약됨 → 발행됨 자동 전환 */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">노령견 사료 고르는 기준</span>
          <span className="relative inline-flex h-[18px] w-[44px] shrink-0 items-center justify-center">
            <span className="mock-chip-sched absolute inset-0 flex items-center justify-center rounded-md bg-[#3f91ff]/10 text-[10px] font-medium text-[#2f7fe6]">예약됨</span>
            <span className="mock-chip-pub absolute inset-0 flex items-center justify-center rounded-md bg-emerald-600 text-[10px] font-medium text-white">발행됨</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">강아지 슬개골 초기 증상</span>
          <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">초안</span>
        </div>
      </div>
      <p className="mt-4 text-center text-xs font-medium text-[#3f91ff]">예약한 글이 시간 되면 알아서 발행돼요</p>
    </div>
  );
}

const PANELS = [
  { label: "글 생성", node: <MockGenerate /> },
  { label: "글 편집", node: <MockEdit /> },
  { label: "워드프레스 발행", node: <MockPublish /> },
  { label: "내 글 관리", node: <MockArticles /> },
];

export default function ProductShowcase() {
  return (
    <section className="border-t border-neutral-200/70">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-28">
        <Reveal>
          <p className="text-center text-sm font-semibold tracking-tight" style={{ color: BRAND }}>실제 화면</p>
          <h2 className="mt-3 text-center font-bold tracking-tight" style={{ fontSize: "clamp(24px, 5vw, 40px)", lineHeight: 1.3 }}>말보다, 직접 보세요</h2>
          <p className="mx-auto mt-4 max-w-md text-center text-base text-neutral-500" style={{ lineHeight: 1.6 }}>
            키워드부터 발행까지, 여기서 다 끝나요.
          </p>
        </Reveal>

        {/* 데스크탑: 2×2 그리드 */}
        <div className="mt-12 hidden gap-4 sm:grid sm:grid-cols-2">
          {PANELS.map((p, i) => (
            <Reveal key={p.label} delay={i * 80}>
              <Frame label={p.label}>{p.node}</Frame>
            </Reveal>
          ))}
        </div>

        {/* 모바일: 옆으로 스와이프(터치 스크롤·스냅) */}
        <div className="no-scrollbar -mx-5 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:hidden">
          {PANELS.map((p) => (
            <div key={p.label} className="w-[86%] shrink-0 snap-center">
              <Frame label={p.label}>{p.node}</Frame>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-neutral-400 sm:hidden">← 옆으로 밀어보세요 →</p>
      </div>
    </section>
  );
}
