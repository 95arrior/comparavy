import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const steps = ["상황 확인", "필요한 세팅 찾기", "전체 패키지 열기"] as const;

export const revalidate = 0;

export default function OnlineSalesSetupAssemblyPage() {
  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <SiteHeader active="online-sales-kit" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            AI 온라인 영업 세팅 키트
          </p>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            온라인 영업 세팅을 같이 정리해볼게요
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            다음 단계에서 채팅형 진단 화면으로 필요한 세팅을 하나씩
            골라드릴 예정이에요.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-sm font-semibold text-teal-800">
                  {index + 1}
                </span>
                <h2 className="mt-3 text-sm font-semibold text-slate-950">
                  {step}
                </h2>
              </article>
            ))}
          </div>

          <p className="mt-7 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm leading-7 text-slate-700">
            이 화면은 다음 단계에서 채팅형 진단으로 완성됩니다.
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            홈으로 돌아가기
          </Link>
        </section>
      </div>
    </main>
  );
}

