import type { Metadata } from "next";
import StaticPageShell from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "About Comparavy",
  description:
    "Learn how Comparavy helps people compare AI tools by use case, budget, skill level, setup difficulty, and practical fit.",
};

export default function AboutPage() {
  return (
    <StaticPageShell
      eyebrow="About Comparavy"
      title="Comparavy helps people choose the right AI tool for the job."
      intro="The site focuses on clear, practical comparisons so readers can narrow options quickly instead of sorting through hype."
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-4 text-base leading-8 text-slate-700">
          <p>
            Comparavy helps people find the right AI tool for their workflow.
            It compares tools by use case, budget, skill level, setup difficulty,
            and practical fit.
          </p>
          <p>
            The site is built for creators, freelancers, solopreneurs, students,
            consultants, and small business owners who want a straightforward
            starting point before they subscribe or spend time testing options.
          </p>
          <p>
            Comparavy is designed to be useful rather than dramatic. The focus is
            on clear recommendations, obvious tradeoffs, and enough context to
            help a reader choose with confidence.
          </p>
          <p>
            We do not claim to personally test every tool. Instead, we organize
            the catalog around practical decision signals and current product
            positioning so the comparisons stay readable and actionable.
          </p>
        </div>
      </section>
    </StaticPageShell>
  );
}
