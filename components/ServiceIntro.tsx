import Link from "next/link";
import { PLANS, formatKRW } from "@/lib/plans";
import Reveal from "@/components/Reveal";

const BRAND = "#4B5FE1";

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
          <p className="text-sm font-semibold tracking-tight" style={{ color: BRAND }}>✶ {eyebrow}</p>
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

export default function ServiceIntro() {
  return (
    <>
      <Section
        id="how"
        eyebrow="AI 글, 다 똑같다는 분들께"
        title={<>1분이면 쓰지만,<br />검색엔 안 잡히죠.</>}
        sub="ChatGPT로 천 단어는 누구나 1분이면 뽑아요. 근데 다 비슷하게 생겨서 묻혀요. 우리가 신경 쓴 건 속도가 아니라 ‘어떻게 쓰느냐’예요."
        visual={<BuriedResults />}
        tint
      />
      <Section
        id="features"
        eyebrow="구조 다양성"
        title={<>같은 키워드,<br />매번 다른 글.</>}
        sub="남들과 같은 키워드로 써도 글 구조가 안 겹치게 만들었어요. 복붙한 듯한 양산글이 안 나와요."
        visual={<StructureCompare />}
        flip
      />
      <Section
        eyebrow="사람이 쓴 것처럼"
        title={<>AI 티 빼고,<br />없는 얘긴 안 지어내요.</>}
        sub="‘알아보겠습니다’ 같은 말투·번역투를 걸러내고, 가짜 통계·후기는 만들지 않도록 규칙을 박아뒀어요. 그대로 올려도 탈 안 나게요."
        visual={<CleanCheck />}
        tint
      />
      <Section
        eyebrow="쓰고 끝이 아니에요"
        title={<>제목·메타·FAQ까지,<br />워드프레스에 한 번에.</>}
        sub="한국 구글에 맞춘 SEO 기본기를 자동으로 갖추고, 버튼 하나로 내 워드프레스에 발행해요. (프로 플랜)"
        visual={<PublishCard />}
        flip
      />

      {/* 요금 */}
      <section id="pricing" className="scroll-mt-16 border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">요금</h2>
            <p className="mt-3 text-neutral-500">무료 3편 먼저 써보세요. 괜찮으면 그때 프로. 외주 글 한 편 값이면 한 달 50편입니다.</p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-12 grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2">
              {[PLANS.free, PLANS.pro].map((plan) => (
                <div key={plan.key} className="flex flex-col bg-white p-8">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-medium tracking-tight">{plan.name}</h3>
                    {plan.highlight && <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: `${BRAND}1a`, color: BRAND }}>가장 인기</span>}
                  </div>
                  <p className="mt-3">
                    <span className="text-4xl font-semibold tracking-tight">{plan.price === 0 ? "무료" : formatKRW(plan.price)}</span>
                    {plan.price !== 0 && <span className="text-sm text-neutral-400">/월</span>}
                  </p>
                  <p className="mt-3 text-sm text-neutral-500">월 {plan.articles}편 · 글당 최대 {plan.maxWords.toLocaleString()}자{plan.wordpress ? " · 워드프레스 자동발행" : ""}</p>
                  <Link
                    href="/pricing"
                    className={`mt-8 rounded-full px-5 py-2.5 text-center text-sm font-medium transition ${
                      plan.highlight ? "bg-neutral-900 text-white hover:bg-neutral-700" : "border border-neutral-300 text-neutral-900 hover:border-neutral-900"
                    }`}
                  >
                    {plan.price === 0 ? "무료로 시작" : "프로 선택"}
                  </Link>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
