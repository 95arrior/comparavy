import HomeDiagnosticCta from "@/components/product/HomeDiagnosticCta";
import ProductShell from "@/components/product/ProductShell";

const steps = [
  {
    title: "상황을 답해요",
    description: "하고 있는 일과 지금 쓰는 채널을 간단히 고릅니다.",
  },
  {
    title: "빠진 세팅을 확인해요",
    description: "먼저 챙기면 좋은 온라인 영업 세팅 3가지를 봅니다.",
  },
  {
    title: "전체 실행 패키지를 열어요",
    description: "홈페이지, 채널, 리뷰, 결제 준비를 이어서 정리합니다.",
  },
] as const;

const outcomeGroups = [
  {
    title: "첫인상 만들기",
    description: "홈페이지 첫 문장, 네이버플레이스 소개, SEO 제목/설명",
  },
  {
    title: "문의로 연결하기",
    description: "문의 버튼 문구, 카카오채널/DM 응대, 예약 안내",
  },
  {
    title: "신뢰 쌓기",
    description: "리뷰 답변, FAQ, 위험 표현 체크",
  },
  {
    title: "7일 실행하기",
    description: "SNS 홍보, 이벤트 문구, 결제·도메인·분석·SEO 체크리스트",
  },
] as const;

export default function ProductHomeFlow() {
  return (
    <ProductShell minimalHeader>
      <section className="flex min-h-[calc(100svh-8rem)] flex-col justify-center py-8 text-center sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-teal-700">
            AI 온라인 영업 세팅 키트
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-6xl">
            가게 홍보, 어디서부터 시작해야 할지 모르겠나요?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            몇 가지 질문에 답하면 지금 먼저 챙기면 좋은 온라인 영업 세팅
            3가지를 보여드려요.
          </p>
          <div className="mt-8">
            <HomeDiagnosticCta actionLocation="home_hero" />
          </div>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-500">
            진단은 무료예요. 전체 실행 패키지는 사전 신청 후 열릴 예정이에요.
          </p>
        </div>
      </section>

      <section className="pb-10">
        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 text-sm font-semibold text-teal-800 sm:mx-0">
                {index + 1}
              </span>
              <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-12 sm:pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            전체 패키지에서는 이런 흐름을 이어서 만들 수 있어요
          </h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {outcomeGroups.map((group) => (
            <article
              key={group.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  {group.title}
                </h3>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  잠금 미리보기
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {group.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-16 text-center sm:pb-20">
        <div className="rounded-[1.75rem] border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            지금 빠진 세팅부터 확인해보세요
          </h2>
          <div className="mt-6">
            <HomeDiagnosticCta actionLocation="home_final_cta" />
          </div>
        </div>
      </section>
    </ProductShell>
  );
}
