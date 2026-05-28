import type { Metadata } from "next";
import StaticPageShell from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Affiliate Disclosure | Comparavy",
  description:
    "Affiliate disclosure for Comparavy, including commission relationships and pricing reminders.",
};

export default function AffiliateDisclosurePage() {
  return (
    <StaticPageShell
      eyebrow="Affiliate disclosure"
      title="Some links on Comparavy may be affiliate links."
      intro="This page explains how affiliate relationships may affect certain links without changing how recommendations are made."
    >
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Affiliate links
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            Some links on Comparavy may be affiliate links. If you sign up
            through certain links, Comparavy may earn a commission.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            How we choose links
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            Recommendations are based on fit, not commission. We organize tools
            around practical value for the reader first.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Check the source
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            Pricing and availability can change, so please check the official
            site before subscribing or purchasing.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Why it matters
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            Transparency helps readers understand how Comparavy works while
            keeping the comparison process direct and easy to trust.
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-teal-100 bg-teal-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Ready to compare tools?
            </p>
            <p className="mt-2 text-base leading-7 text-slate-700">
              Use the finder to get a practical shortlist before you check any
              provider's pricing page.
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
