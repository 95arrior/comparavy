import type { Metadata } from "next";
import StaticPageShell from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Simple privacy information for AteFlo, including analytics, cookies, and data questions.",
};

export default function PrivacyPage() {
  return (
    <StaticPageShell
      eyebrow="Privacy"
      title="A simple privacy summary."
      intro="This page explains how AteFlo may collect basic usage data and how you can contact us with privacy questions."
    >
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Analytics and cookies
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            AteFlo may use analytics and cookies or similar tools to
            understand which pages are useful and to improve the experience.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Personal information
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            We do not sell personal information.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Third-party sites
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            Links to other sites may have their own privacy policies, cookies,
            and data practices. Please review those policies separately.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Questions
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            If you have a privacy question or request, contact us and we will
            review it.
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-teal-100 bg-teal-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Keep exploring
            </p>
            <p className="mt-2 text-base leading-7 text-slate-700">
              Browse the shortcuts if you want to compare workflows before
              you leave the site.
            </p>
          </div>
          <a
            href="/guides"
            className="inline-flex shrink-0 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Browse shortcuts
          </a>
        </div>
      </section>
    </StaticPageShell>
  );
}
