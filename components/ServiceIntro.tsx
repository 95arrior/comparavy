import Reveal from "@/components/Reveal";
import PricingCards from "@/components/PricingCards";
import type { PlanKey } from "@/lib/plans";

const BRAND = "#3f91ff";

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
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-400">
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
        <p className="text-sm font-medium" style={{ color: BRAND }}>에이트플로 프로</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">
          월 ₩29,900 <span className="text-base font-medium text-neutral-400">/ 30편</span>
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
      <p className="mt-5 text-lg font-semibold">워드프레스에 올렸어요</p>
      <p className="mt-1.5 text-sm text-neutral-400">myblog.com/dog-separation-anxiety</p>
      <div className="mt-5 rounded-xl bg-neutral-50 px-4 py-3 text-sm font-medium" style={{ color: BRAND }}>
        제목 · 메타 · FAQ까지 자동으로 ✓
      </div>
    </div>
  );
}

function MobilePublish() {
  return (
    <div className="mx-auto w-56">
      <div className="relative rounded-[2.6rem] border-[9px] border-neutral-900 bg-white p-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-neutral-200" />
        <p className="text-[11px] font-medium text-neutral-400">키워드</p>
        <div className="mt-1.5 rounded-xl bg-neutral-50 px-3 py-2.5 text-[13px] font-medium text-neutral-700">강아지 분리불안</div>
        <button className="mt-3 w-full rounded-xl py-2.5 text-[13px] font-semibold text-white" style={{ background: BRAND }}>
          워드프레스에 발행
        </button>
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check size={15} />
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-emerald-700">게시 완료</p>
            <p className="text-[11px] text-emerald-600/80">지하철에서 1분 만에</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceIntro({ loggedIn = false, currentPlan = "free", waitlist = false }: { loggedIn?: boolean; currentPlan?: PlanKey; waitlist?: boolean }) {
  return (
    <>
      <Section
        id="how"
        eyebrow="“AI로 쓰면 다 똑같은 거 아니에요?”"
        title={<>다 비슷하게 나와서,<br />검색에 안 잡혀요.</>}
        sub="글 한 편 쓰는 거, 이제 1분이면 해요. 우리가 신경 쓴 건 속도가 아니라 어떻게 쓰느냐예요. 사람이 끝까지 읽고, 구글이 좋아하는 구조로 쓴 글."
        visual={<BuriedResults />}
        tint
      />
      <Section
        id="features"
        eyebrow="구조 다양성"
        title={<>같은 키워드,<br />매번 다른 글.</>}
        sub="옆 블로그와 같은 키워드를 써도 구조가 달라요. 찍어낸 티 안 납니다."
        visual={<StructureCompare />}
        flip
      />
      <Section
        eyebrow="한 번에 끝나요"
        title={<>프롬프트 다시,<br />또 고치고… 그만.</>}
        sub="‘이렇게 써줘, 다시 해줘, 좀 줄여줘…’ 그 왔다갔다, 우리가 미리 다 해뒀어요. 키워드만 넣으세요. 한 번에 나옵니다."
        visual={<PromptHassle />}
        tint
      />
      <Section
        eyebrow="사람이 쓴 것처럼"
        title={<>AI 티 빼고,<br />없는 말은 안 해요.</>}
        sub="그대로 올려도 돼요."
        visual={<CleanCheck />}
        flip
      />
      <Section
        eyebrow="쓰고 끝이 아니에요"
        title={<>제목·메타·FAQ까지,<br />워드프레스에 한 번에.</>}
        sub="제목·메타·FAQ까지 알아서 챙기고 버튼 하나로 워드프레스에 올라가요. 복붙, 이제 안 하셔도 돼요. (프로 플랜)"
        visual={<PublishCard />}
        tint
      />
      <Section
        eyebrow="노트북, 안 챙겨도 돼요"
        title={<>휴대폰만 있으면,<br />어디서든 발행.</>}
        sub="출퇴근 지하철에서, 여행지에서, 카페에서. 노트북 없이 휴대폰으로 키워드만 넣으면 바로 글이 만들어지고 블로그에 올라가요. 블로그 운영이 손안에서 끝나요."
        visual={<MobilePublish />}
        flip
      />
      <Section
        eyebrow="외주 한 편 값"
        title={<>외주 글 한 편이면,<br />여기선 한 달 30편.</>}
        sub="외주 글 한 편 값이면, 여기선 한 달 30편. 키워드만 넣고, 바로 올려요."
        visual={<CostCompare />}
        tint
      />

      {/* 요금 */}
      <section id="pricing" className="scroll-mt-16 border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">요금</h2>
            <p className="mt-3 text-neutral-500">
              {waitlist ? "외주 글 한 편 값이면 한 달 30편. 곧 만나요." : "외주 글 한 편 값이면 한 달 30편. 무료 3편으로 먼저 확인하고 정하세요."}
            </p>
          </Reveal>
          {waitlist ? (
            <Reveal delay={120} className="mt-8">
              <div className="rounded-2xl border-2 bg-white p-6 text-center shadow-sm" style={{ borderColor: BRAND }}>
                <p className="text-2xl font-bold tracking-tight">월 ₩29,900 <span className="text-base font-medium text-neutral-400">/ 30편</span></p>
                <p className="mt-2 text-sm text-neutral-500">아직 오픈 전이에요. 위에서 사전 등록하면 가장 먼저 알려드릴게요.</p>
              </div>
            </Reveal>
          ) : (
            <Reveal delay={120} className="mt-12">
              <PricingCards loggedIn={loggedIn} currentPlan={currentPlan} />
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
