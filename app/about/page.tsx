import type { Metadata } from "next";
import StaticPageShell from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how AteFlo helps people turn messy inputs into finished outputs with AI shortcuts.",
};

export default function AboutPage() {
  return (
    <StaticPageShell
      eyebrow="About AteFlo"
      title="AteFlo helps people finish real work faster with AI."
      intro="The site focuses on practical shortcuts that turn notes, documents, ideas, and business tasks into useful outputs."
    >
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            What it does
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            AteFlo organizes AI workflows around the outputs people actually
            need: summaries, drafts, plans, recaps, content, and business assets.
            Tool choice matters, but the shortcut starts with the work.
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
            Recommendations are based on fit, not hype. AteFlo groups tools
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
              Start with the finder if you want a short list matched to what you
              are trying to finish, your budget, and your experience level.
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
