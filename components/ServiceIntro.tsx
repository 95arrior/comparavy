import Link from "next/link";
import { PLANS, formatKRW } from "@/lib/plans";

// 서비스 소개 (선언문 + 사용법 + 기능 + 가격). 비로그인 홈과 로그인 새 글 화면 양쪽에서 재사용.

const STEPS = [
  { n: "01", title: "키워드랑 내 생각 입력", body: "쓰고 싶은 키워드를 넣으세요. 내 경험이나 의견이 있으면 한 줄 보태면 됩니다. 그게 남들 글이랑 갈리는 지점입니다." },
  { n: "02", title: "써지는 걸 실시간으로", body: "글이 한 줄씩 써지는 걸 그대로 봅니다. 구조는 매번 바뀌고, 없는 정보는 안 넣습니다." },
  { n: "03", title: "워드프레스에 바로", body: "보고 고친 다음 버튼 하나로 내 사이트에 올립니다. 복사해서 붙여넣는 일 없습니다." },
];

const FEATURES = [
  { title: "그냥 껍데기 도구가 아닙니다", body: "키워드 넣으면 글 뱉는 도구는 많습니다. AteFlo는 글을 어떻게 쓰는지부터 직접 짰습니다. 구조도, 관점도, 정직함도 거기서 나옵니다." },
  { title: "같은 키워드, 매번 다른 글", body: "남들이랑 같은 키워드로 써도 글 구조가 안 겹칩니다. 복붙한 듯한 양산글이 안 나옵니다." },
  { title: "없는 얘기 안 지어냅니다", body: "가짜 통계나 후기, 안 해본 경험을 만들지 않습니다. 내 블로그에 그대로 올려도 탈 없습니다." },
  { title: "AI 티 안 나는 한국어", body: "'알아보겠습니다' 같은 뻔한 말투랑 번역투를 뺍니다. 읽는 사람은 AI가 썼는지 모릅니다." },
  { title: "SEO는 알아서 잡아줍니다", body: "제목, 메타, FAQ, 소제목까지 한국 구글에 맞게 자동으로. SEO 따로 공부 안 해도 됩니다." },
  { title: "쓰는 걸로 안 끝납니다", body: "워드프레스에 버튼 하나로 발행까지. 글 만들어 놓고 올리느라 고생하는 일 없습니다." },
];

export default function ServiceIntro() {
  return (
    <>
      {/* Manifesto — 한 줄씩 리듬, 핵심구절 강조 */}
      <section className="border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-3xl px-6 py-24 sm:py-28">
          <p className="text-sm font-medium text-neutral-400">“AI로 쓰면 다 똑같은 거 아니에요?”</p>
          <div className="mt-6 space-y-3 text-2xl font-semibold leading-snug tracking-tight sm:text-[2rem]">
            <p className="text-neutral-900">맞아요. 글 한 편 쓰는 거, 이제 1분이면 해요.</p>
            <p className="text-neutral-400">
              근데 다 비슷하게 나와서, <span className="text-neutral-900">검색에 안 잡히는 게 문제죠.</span>
            </p>
            <p className="text-neutral-900">
              우리가 신경 쓴 건 속도가 아니라 <span className="text-[#4B5FE1]">어떻게 쓰느냐</span>입니다.
            </p>
            <p className="text-neutral-900">
              올렸을 때 사람이 끝까지 읽고, <span className="text-[#4B5FE1]">구글이 띄워주는 글.</span>
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 border-t border-neutral-200/70">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">이렇게 씁니다</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-white p-8">
                <span className="text-lg font-bold text-[#4B5FE1]">{s.n}</span>
                <h3 className="mt-3 text-lg font-medium tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 border-t border-neutral-200/70 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">왜 그냥 ChatGPT 안 쓰고요?</h2>
          <div className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <div className="h-1 w-8 rounded-full bg-[#4B5FE1]/80" />
                <h3 className="mt-4 text-base font-medium tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-t border-neutral-200/70">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">요금</h2>
          <p className="mt-3 text-neutral-500">무료 3편 먼저 써보세요. 괜찮으면 그때 프로. 외주 글 한 편 값이면 한 달 50편입니다.</p>
          <div className="mt-12 grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2">
            {[PLANS.free, PLANS.pro].map((plan) => (
              <div key={plan.key} className="flex flex-col bg-white p-8">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-medium tracking-tight">{plan.name}</h3>
                  {plan.highlight && <span className="rounded-full bg-[#4B5FE1]/10 px-2.5 py-0.5 text-xs font-medium text-[#4B5FE1]">가장 인기</span>}
                </div>
                <p className="mt-3">
                  <span className="text-4xl font-semibold tracking-tight">
                    {plan.price === 0 ? "무료" : formatKRW(plan.price)}
                  </span>
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
        </div>
      </section>
    </>
  );
}
