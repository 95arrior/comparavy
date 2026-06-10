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
      className={`h-2 rounded-full ${c} ${animated ? "ateflo-type" : ""}`}
      style={{ width: w, animationDelay: animated ? `${delay}s` : undefined }}
    />
  );
}

// 1. 글 생성 — 줄이 왼쪽부터 차오르며 써지는 루프
function MockGenerate() {
  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5">
        <span className="flex-1 text-sm text-neutral-700">강아지 분리불안 해결 방법</span>
        <span className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">글 생성</span>
      </div>
      <div className="mt-4 space-y-2.5">
        <Bar w="85%" c="bg-neutral-800" delay={0} />
        <Bar w="100%" delay={0.4} />
        <Bar w="95%" delay={0.8} />
        <div className="flex items-center gap-1">
          <Bar w="60%" delay={1.2} />
          <span className="ateflo-caret inline-block h-3.5 w-0.5 bg-[#3f91ff]" />
        </div>
      </div>
      <p className="mt-4 text-center text-xs font-medium text-[#3f91ff]">키워드 하나로, 글이 써져요</p>
    </div>
  );
}

// 2. 글 편집
function MockEdit() {
  return (
    <div>
      <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-1.5">
        {["B", "H", "≡", "🔗", "▦"].map((t, i) => (
          <span key={i} className="flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold text-neutral-400">{t}</span>
        ))}
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="h-3 w-3/5 rounded bg-neutral-800" />
        <Bar w="100%" />
        <div className="ateflo-edit-pulse rounded-md bg-[#3f91ff]/10 px-1.5 py-1"><Bar w="70%" c="bg-[#3f91ff]/50" /></div>
        <Bar w="90%" />
      </div>
      <p className="mt-4 text-center text-xs font-medium text-[#3f91ff]">마음에 들게 직접 손질해요</p>
    </div>
  );
}

// 3. 워드프레스 발행
function MockPublish() {
  return (
    <div className="text-center">
      <div className="ateflo-pop-loop mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: BRAND }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
      </div>
      <p className="mt-3 text-sm font-semibold">워드프레스에 올렸어요</p>
      <p className="mt-1 text-xs text-neutral-400">myblog.com/dog-anxiety</p>
      <div className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs font-medium" style={{ color: BRAND }}>제목 · 메타 · FAQ 자동 ✓</div>
      <p className="mt-4 text-xs font-medium text-[#3f91ff]">버튼 하나로 발행돼요</p>
    </div>
  );
}

// 4. 내 글 관리
function MockArticles() {
  const rows = [
    { t: "강아지 분리불안 해결 방법", s: "발행됨", c: "bg-emerald-600 text-white" },
    { t: "노령견 사료 고르는 기준", s: "예약됨", c: "bg-[#3f91ff]/10 text-[#2f7fe6]" },
    { t: "강아지 슬개골 초기 증상", s: "초안", c: "bg-neutral-100 text-neutral-500" },
  ];
  return (
    <div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.t} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">{r.t}</span>
            <span className={`ateflo-pop-loop shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${r.c}`} style={{ animationDelay: `${i * 0.35}s` }}>{r.s}</span>
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
