import type { Metadata } from "next";
import KitCard from "@/components/kits/KitCard";
import SiteHeader from "@/components/SiteHeader";
import { getFeaturedKit, getKits } from "@/data/kits";

export const metadata: Metadata = {
  title: "AteFlo Kits | AI Workflow Kits for Real Work",
  description:
    "Browse AteFlo paid AI workflow kits with packaged prompts, templates, examples, checklists, and action plans for tasks worth finishing.",
  alternates: {
    canonical: "/kits",
  },
  openGraph: {
    title: "AteFlo Kits | AI Workflow Kits for Real Work",
    description:
      "Packaged prompts, templates, examples, checklists, and action plans for tasks worth finishing.",
    url: "/kits",
  },
  twitter: {
    card: "summary",
    title: "AteFlo Kits | AI Workflow Kits for Real Work",
    description:
      "Packaged prompts, templates, examples, checklists, and action plans for tasks worth finishing.",
  },
};

export const revalidate = 0;

const workflowSteps = [
  "Input worksheet",
  "Prompt sequence",
  "Example output",
  "Review checklist",
  "Final action plan",
] as const;

const storeFaq = [
  {
    question: "What do I receive?",
    answer:
      "Each kit is designed as a workflow product with worksheets, prompt sequences, examples, templates, review checklists, and an action plan. Exact modules vary by kit.",
  },
  {
    question: "How is the kit delivered?",
    answer:
      "When checkout is connected, the purchase flow should explain delivery clearly before payment. Until then, early-access CTAs do not collect payment.",
  },
  {
    question: "Which AI tools can I use?",
    answer:
      "Use AteFlo kits with ChatGPT, Claude, Gemini, Copilot, or another AI chat tool that can work from pasted instructions and details.",
  },
  {
    question: "Can I use the kits in another language?",
    answer:
      "Yes, if your AI tool supports that language. You should still review wording, facts, local context, and platform rules before using the output.",
  },
  {
    question: "Do kits guarantee results?",
    answer:
      "No. AteFlo does not guarantee sales, leads, rankings, hiring, income, dating success, or business growth. Kits help you structure and review the work.",
  },
  {
    question: "What is the refund policy?",
    answer:
      "Refund terms should be shown in the checkout flow when paid checkout is live. AteFlo should not imply a refund policy until the payment provider and terms are configured.",
  },
] as const;

export default function KitsPage() {
  const kits = getKits();
  const featuredKit = getFeaturedKit();

  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="kits" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />

        <header className="rounded-3xl border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            AteFlo Product Shelf
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            AI workflow kits for real work.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Packaged prompts, templates, examples, checklists, and action plans
            for tasks worth finishing.
          </p>
        </header>

        <section className="mt-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">Featured product shelf</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                온라인 영업 세팅부터 시작하세요
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600">
              AteFlo의 flagship product는 AI 온라인 영업 세팅 키트입니다.
              홈페이지, 네이버플레이스, SNS, 리뷰 답변, 결제·도메인·분석·SEO
              체크리스트를 순서대로 정리합니다.
            </p>
          </div>
          <div className="mt-5">
            <KitCard kit={featuredKit} sourcePage="kits" />
          </div>
        </section>

        <section id="kit-boxes" className="mt-9">
          <div>
            <p className="text-sm font-semibold text-teal-700">Kit boxes</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Choose the workflow closest to the result you need.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              AI 온라인 영업 세팅 키트가 flagship product입니다. 다른 키트는
              secondary 또는 coming soon 상태로 유지합니다.
            </p>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {kits.map((kit) => (
              <KitCard key={kit.slug} kit={kit} sourcePage="kits" />
            ))}
          </div>
        </section>

        <section className="mt-9 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            How kits work
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            From messy details to reviewed output.
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {workflowSteps.map((step, index) => (
              <article
                key={step}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-sm font-semibold text-teal-800">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-slate-950">
                  {step}
                </h3>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-9 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            FAQ
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Before choosing a kit
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {storeFaq.map((item) => (
              <article
                key={item.question}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <h3 className="text-base font-semibold text-slate-950">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
