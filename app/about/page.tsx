import type { Metadata } from "next";
import StaticPageShell from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "About Comparavy | AI Tool Comparison",
  description:
    "Learn what Comparavy does, who it is for, and how recommendations are organized.",
};

export default function AboutPage() {
  return (
    <StaticPageShell
      eyebrow="About Comparavy"
      title="Comparavy helps people choose the right AI tool for the job."
      intro="The site focuses on clear, practical comparisons so readers can narrow options quickly without sorting through hype."
    >
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            What it does
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            Comparavy organizes AI tools around the decisions people actually
            make: use case, budget, skill level, setup difficulty, and practical
            fit. The goal is to help you narrow choices quickly and understand
            the tradeoffs before you spend time or money.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Who it is for
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            The site is built for creators, freelancers, solopreneurs, students,
            consultants, and small business owners who want a straightforward
            starting point before they try a new tool or subscribe.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            How recommendations work
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            Recommendations are based on fit, not hype. Comparavy groups tools
            by the kind of work they support, what they tend to cost, how much
            setup they usually require, and how well they suit a given skill
            level or workflow.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            What we do not claim
          </p>
          <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
            <p>
              We do not claim to personally test every AI tool. We also do not
              claim exact real-time pricing, since pricing and availability can
              change.
            </p>
            <p>
              Instead, we keep the site practical and readable so you can compare
              options with enough context to make a confident first choice.
            </p>
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-teal-100 bg-teal-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Next step
            </p>
            <p className="mt-2 text-base leading-7 text-slate-700">
              Start with the finder if you want a short list matched to your
              workflow, budget, and experience level.
            </p>
          </div>
          <a
            href="/finder"
            className="inline-flex shrink-0 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Use the finder
          </a>
        </div>
      </section>
    </StaticPageShell>
  );
}
