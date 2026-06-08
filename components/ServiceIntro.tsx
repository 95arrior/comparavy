import Reveal from "@/components/Reveal";
import PricingCards from "@/components/PricingCards";
import type { PlanKey } from "@/lib/plans";

const BRAND = "#4B5FE1";

// 로고 마크(파비콘과 동일한 입 벌린 원) — 작게 써도 안 깨지는 인라인 SVG
function LogoMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path fill={BRAND} d="M16 16 L28.99 8.5 A15 15 0 1 0 28.99 23.5 Z" />
    </svg>
  );
}

function Check({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

// 좌: 텍스트(라벨+큰 헤드라인+설명) / 우: 시각 — 토스식 교차 배치
function Section({
  id,
  eyebrow,
  title,
  sub,
  visual,
  flip = false,
  tint = false,
}: {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
  visual: React.ReactNode;
  flip?: boolean;
  tint?: boolean;
}) {
  return (
    <section id={id} className={`scroll-mt-16 border-t border-neutral-200/70 ${tint ? "bg-neutral-50" : ""}`}>
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-24 sm:py-28 lg:grid-cols-2 lg:gap-16">
        <Reveal className={flip ? "lg:order-2" : ""}>
          <p className="flex items-center gap-1.5 text-sm font-semibold tracking-tight" style={{ color: BRAND }}>
            <LogoMark />
            {eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-[1.22] tracking-tight sm:text-[2.5rem] sm:leading-[1.18]">{title}</h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-neutral-500">{sub}</p>
        </Reveal>
        <Reveal delay={120} className={flip ? "lg:order-1" : ""}>
          {visual}
        </Reveal>
      </div>
    </section>
  );
}

// 우측 목업 카드들 (실제 스크린샷 없이 CSS로)
function BuriedResults() {
  const Row = () => (
    <div className="opacity-45">
      <div className="h-2.5 w-3/4 rounded-full bg-neutral-300" />
      <div className="mt-2 h-1.5 w-2/3 rounded-full bg-neutral-200" />
      <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-neutral-200" />
    </div>
  );
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm text-neutral-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-3.5-3.5" />
        </svg>
        강아지 분리불안 해결 방법
      </div>
      <div className="mt-5 space-y-4">
        <Row />
        <Row />
        <Row />
      </div>
      <p className="mt-5 text-center text-xs text-neutral-400">다 비슷한 글… 내 글은 어디에 있죠?</p>
    </div>
  );
}

function PromptHassle() {
  const msgs = ["톤을 더 자연스럽게 바꿔줘", "FAQ도 넣어줘", "너무 기네, 좀 줄여줘", "음… 처음 게 더 나았는데"];
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium text-neutral-400">직접 프롬프트로 쓰면</p>
      <div className="mt-4 space-y-2.5">
        {msgs.map((m, i) => (
          <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-neutral-100 px-3.5 py-2 text-sm text-neutral-600">{m}</div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-neutral-400">원하는 글까지 몇 번이나 다시…</p>
    </div>
  );
}

function CostCompare() {
  return (
    <div className="mx-auto max-w-sm space-y-3">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-neutral-500">외주 글 1편</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-500">보통 ₩30,000~</p>
      </div>
      <div className="flex items-center justify-center text-neutral-300">↓</div>
      <div className="rounded-2xl border-2 bg-white p-5 shadow-sm" style={{ borderColor: BRAND }}>
        <p className="text-sm font-medium" style={{ color: BRAND }}>AteFlo 프로</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">
          월 ₩29,900 <span className="text-base font-medium text-neutral-400">/ 50편</span>
        </p>
      </div>
    </div>
  );
}

function StructureCompare() {
  const lines = (pattern: number[]) => (
    <div className="mt-3 space-y-2">
      {pattern.map((w, i) => (
        <div key={i} className={`h-2 rounded-full ${i === 0 ? "bg-neutral-800" : "bg-neutral-200"}`} style={{ width: `${w}%` }} />
      ))}
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <span className="text-xs font-medium text-neutral-400">구조 A</span>
        {lines([70, 95, 60, 90])}
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <span className="text-xs font-medium text-neutral-400">구조 B</span>
        {lines([55, 85, 100, 65])}
      </div>
    </div>
  );
}

function CleanCheck() {
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ background: BRAND }}>
        <Check />
      </div>
      <p className="mt-5 text-center text-base font-semibold">사람이 쓴 글처럼</p>
      <div className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <span className="text-neutral-500">AI 상투어</span>
          <span className="font-semibold" style={{ color: BRAND }}>0개</span>
        </div>
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <span className="text-neutral-500">번역투</span>
          <span className="font-semibold" style={{ color: BRAND }}>0개</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">지어낸 통계·후기</span>
          <span className="font-semibold" style={{ color: BRAND }}>없음</span>
        </div>
      </div>
    </div>
  );
}

function PublishCard() {
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white" style={{ background: BRAND }}>
        <Check size={32} />
      </div>
      <p className="mt-5 text-lg font-semibold">워드프레스에 게시됐어요</p>
      <p className="mt-1.5 text-sm text-neutral-400">myblog.com/dog-separation-anxiety</p>
      <div className="mt-5 rounded-xl bg-neutral-50 px-4 py-3 text-sm font-medium" style={{ color: BRAND }}>
        제목 · 메타 · FAQ까지 자동으로 ✓
      </div>
    </div>
  );
}

export default function ServiceIntro({ loggedIn = false, currentPlan = "free" }: { loggedIn?: boolean; currentPlan?: PlanKey }) {
  return (
    <>
      <Section
        id="how"
        eyebrow="AI 글, 다 똑같다는 분들께"
        title={<>1분이면 쓰지만,<br />검색엔 안 잡히죠.</>}
        sub="글 한 편, ChatGPT로 1분이면 나오죠. 근데 다 비슷해서 묻혀요. 우린 ‘빨리’가 아니라 ‘검색에 걸리게’ 씁니다."
        visual={<BuriedResults />}
        tint
      />
      <Section
        id="features"
        eyebrow="구조 다양성"
        title={<>같은 키워드,<br />매번 다른 글.</>}
        sub="옆 블로그랑 같은 키워드로 써도, 글 생김새가 안 겹쳐요. 복붙한 듯한 양산글처럼 안 보입니다."
        visual={<StructureCompare />}
        flip
      />
      <Section
        eyebrow="한 번에 끝나요"
        title={<>프롬프트 다시,<br />또 고치고… 그만.</>}
        sub="‘이렇게 써줘’ 시키고, 또 고치고… 그 왕복을 우리가 미리 다 해뒀어요. 키워드만 넣으세요. 한 번에 나옵니다."
        visual={<PromptHassle />}
        tint
      />
      <Section
        eyebrow="사람이 쓴 것처럼"
        title={<>AI가 쓴 티 빼고,<br />없는 얘긴 안 지어내요.</>}
        sub="‘알아보겠습니다’ 같은 AI 글 특유의 말투, 다 걸러요. 안 해본 얘기·없는 통계는 안 만들고요. 그대로 올려도 돼요."
        visual={<CleanCheck />}
        flip
      />
      <Section
        eyebrow="쓰고 끝이 아니에요"
        title={<>제목·메타·FAQ까지,<br />워드프레스에 한 번에.</>}
        sub="제목·메타·FAQ까지 알아서 챙기고, 버튼 하나로 내 워드프레스에 올라가요. 복붙은 이제 그만. (프로 플랜)"
        visual={<PublishCard />}
        tint
      />
      <Section
        eyebrow="외주 한 편 값"
        title={<>외주 글 한 편이면,<br />여기선 한 달 50편.</>}
        sub="외주 글 한 편 값이면, 여기선 한 달 50편. 직접 쓰고, 바로 올려요."
        visual={<CostCompare />}
        flip
      />

      {/* 요금 */}
      <section id="pricing" className="scroll-mt-16 border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">요금</h2>
            <p className="mt-3 text-neutral-500">무료 3편 먼저 써보세요. 괜찮으면 그때 프로. 외주 글 한 편 값이면 한 달 50편입니다.</p>
          </Reveal>
          <Reveal delay={120} className="mt-12">
            <PricingCards loggedIn={loggedIn} currentPlan={currentPlan} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
