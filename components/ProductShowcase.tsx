import Reveal from "@/components/Reveal";

const BRAND = "#3f91ff";

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
      <div className="p-5">{children}</div>
    </div>
  );
}

function Bar({ w, c = "bg-neutral-200", delay }: { w: string; c?: string; delay?: number }) {
  const animated = delay !== undefined;
  return (
    <div
      className={`h-2 rounded-full ${c} ${animated ? "mock-fade-line" : ""}`}
      style={{ width: w, animationDelay: animated ? `${delay}s` : undefined }}
    />
  );
}

// 마우스 커서 + 클릭 링 (버튼 위에 올려두고 '톡' 누르는 연출)
function Cursor({ className = "" }: { className?: string }) {
  return (
    <span className={`pointer-events-none absolute z-10 ${className}`}>
      <span className="mock-ring absolute -left-2 -top-2 h-7 w-7 rounded-full bg-[#3f91ff]/30" />
      <svg className="mock-tap relative drop-shadow" width="18" height="18" viewBox="0 0 24 24">
        <path d="M5 3l6 16 2-6 6-2z" fill="#191F28" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const ImgIcon = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5L5 20" /></svg>
);

// 1. 글 생성 — 제목이 한 자씩 써지고 본문이 페이드로 나타남
function MockGenerate() {
  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5">
        <span className="flex-1 text-sm text-neutral-700">강아지 분리불안 해결 방법</span>
        <span className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">글 생성</span>
      </div>
      <div className="mt-4">
        <span className="mock-type-title text-sm font-semibold text-neutral-900">분리불안, 이렇게 해결하세요</span>
        <span className="ateflo-caret ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 bg-[#3f91ff]" />
      </div>
      <div className="mt-3 space-y-2.5">
        <Bar w="100%" delay={0.2} />
        <Bar w="95%" delay={0.5} />
        <Bar w="70%" delay={0.8} />
      </div>
      <p className="mt-4 text-center text-xs font-medium text-[#3f91ff]">키워드 하나로, 글이 써져요</p>
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

// 3. 워드프레스 발행 — 커서가 발행 버튼을 누르면 원형 체크
function MockPublish() {
  return (
    <div className="text-center">
      <div className="relative inline-block">
        <span className="block rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: BRAND }}>워드프레스에 발행</span>
        <Cursor className="-bottom-1.5 right-3" />
      </div>
      <div className="mock-reveal mt-5">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: "#2fd07a" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="mt-2.5 text-sm font-semibold">올렸어요</p>
        <p className="mt-0.5 text-xs text-neutral-400">myblog.com/dog-anxiety</p>
      </div>
      <p className="mt-4 text-center text-xs font-medium text-[#3f91ff]">버튼 하나로 발행돼요</p>
    </div>
  );
}

// 4. 내 글 관리 — 정적(반복 없음)
function MockArticles() {
  const rows = [
    { t: "강아지 분리불안 해결 방법", s: "발행됨", c: "bg-emerald-600 text-white" },
    { t: "노령견 사료 고르는 기준", s: "예약됨", c: "bg-[#3f91ff]/10 text-[#2f7fe6]" },
    { t: "강아지 슬개골 초기 증상", s: "초안", c: "bg-neutral-100 text-neutral-500" },
  ];
  return (
    <div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.t} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">{r.t}</span>
            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${r.c}`}>{r.s}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs font-medium text-[#3f91ff]">발행·예약을 한눈에</p>
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
      <div className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
        <Reveal>
          <p className="text-center text-sm font-semibold tracking-tight" style={{ color: BRAND }}>실제 화면</p>
          <h2 className="mt-3 text-center text-3xl font-bold leading-[1.2] tracking-tight sm:text-4xl">말보다, 직접 보세요</h2>
          <p className="mx-auto mt-4 max-w-md text-center text-base leading-relaxed text-neutral-500">
            키워드 입력부터 워드프레스 발행까지, 이 안에서 다 끝나요.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {PANELS.map((p, i) => (
            <Reveal key={p.label} delay={i * 80}>
              <Frame label={p.label}>{p.node}</Frame>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
