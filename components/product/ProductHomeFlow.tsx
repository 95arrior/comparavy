import ProductChoiceCard from "@/components/product/ProductChoiceCard";
import ProductShell from "@/components/product/ProductShell";

const choices = [
  {
    label: "가게 홍보",
    title: "손님이 우리 가게를 더 쉽게 찾게 하고 싶어요",
    subtitle:
      "홍보 문구부터 결제·도메인·분석·SEO 세팅까지 필요한 순서를 정리해드릴게요.",
    action: "세팅 확인하기",
    href: "/assemble/online-sales-setup-kit",
    selectedPath: "online-sales-setup-kit",
    kitSlug: "online-sales-setup-kit",
    featured: true,
    actionLocation: "home_primary_online_sales_setup",
  },
  {
    label: "취업 준비",
    title: "이력서·자소서, 오늘 안에 정리하고 싶어요",
    subtitle:
      "채용공고에 맞춰 내 경험을 문장, 자기소개서, 면접 답변으로 정리해드릴게요.",
    action: "지원서 샘플 보기",
    href: "/kits/job-application-ai-kit",
    selectedPath: "job-application-ai-kit",
    kitSlug: "job-application-ai-kit",
    actionLocation: "home_job_application",
  },
  {
    label: "SNS 판매",
    title: "올리는 글을 문의나 구매로 이어지게 만들고 싶어요",
    subtitle:
      "인스타, 블로그, SNS 글을 판매 흐름과 CTA까지 함께 정리해드릴게요.",
    action: "판매 흐름 보기",
    href: "/kits/online-sales-setup-kit",
    selectedPath: "sns-sales-flow",
    kitSlug: "online-sales-setup-kit",
    actionLocation: "home_sns_sales",
  },
  {
    label: "상품 만들기",
    title: "내가 할 줄 아는 걸 돈 받는 상품으로 만들고 싶어요",
    subtitle:
      "재능, 노하우, 서비스를 패키지, 가격표, 소개 문구로 바꿔드릴게요.",
    action: "상품 구조 보기",
    href: "/kits",
    selectedPath: "offer-packaging",
    actionLocation: "home_offer_packaging",
  },
] as const;

export default function ProductHomeFlow() {
  return (
    <ProductShell>
      <section className="flex min-h-[calc(100svh-8rem)] flex-col justify-center py-6 sm:py-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-teal-700">
            AteFlo 실행 패키지
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-6xl">
            지금 막힌 일을 골라보세요
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            몇 가지만 선택하면, 지금 먼저 챙기면 좋은 세팅을 보여드릴게요.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {choices.map((choice) => (
            <ProductChoiceCard key={choice.title} {...choice} />
          ))}
        </div>

        <div className="mt-4">
          <ProductChoiceCard
            label="쉬운 시작"
            title="뭘 해야 할지 모르겠어요"
            subtitle="지금 가진 것만 보고 가장 쉬운 시작점을 추천해드릴게요."
            action="추천받기"
            href="/assemble/online-sales-setup-kit"
            selectedPath="unknown-start"
            kitSlug="online-sales-setup-kit"
            actionLocation="home_unknown_start"
            variant="helper"
          />
        </div>
      </section>
    </ProductShell>
  );
}
