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
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-4 text-base leading-8 text-slate-700">
          <p>
            Some links on Comparavy may be affiliate links. If you sign up
            through certain links, Comparavy may earn a commission.
          </p>
          <p>
            Recommendations are based on fit, not commission.
          </p>
          <p>
            Pricing and availability can change at any time, so check the official
            site before subscribing.
          </p>
          <p>
            We try to keep comparisons practical and current, but readers should
            always confirm final plan details on the provider's website.
          </p>
        </div>
      </section>
    </StaticPageShell>
  );
}
