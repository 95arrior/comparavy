import type { Metadata } from "next";
import StaticPageShell from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | Comparavy",
  description:
    "Simple privacy information for Comparavy, including analytics, cookies, and data requests.",
};

export default function PrivacyPage() {
  return (
    <StaticPageShell
      eyebrow="Privacy"
      title="A simple privacy summary."
      intro="This page explains how Comparavy may collect basic usage data and how you can contact us about privacy requests."
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-4 text-base leading-8 text-slate-700">
          <p>
            Comparavy may use analytics to understand which pages are helpful
            and to improve the site.
          </p>
          <p>
            We do not sell personal information.
          </p>
          <p>
            We may use cookies or similar analytics tools to measure traffic and
            improve the experience.
          </p>
          <p>
            If you have a privacy request, contact us and we will review it.
          </p>
        </div>
      </section>
    </StaticPageShell>
  );
}
