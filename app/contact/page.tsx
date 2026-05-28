import type { Metadata } from "next";
import StaticPageShell from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Contact Comparavy | Support and Corrections",
  description:
    "Contact Comparavy for tool suggestions, corrections, partnership inquiries, and privacy questions.",
};

export default function ContactPage() {
  return (
    <StaticPageShell
      eyebrow="Contact"
      title="Get in touch with Comparavy."
      intro="Use this page for tool suggestions, corrections, partnership inquiries, or privacy questions."
    >
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Email
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            Reach us at{" "}
            <a
              href="mailto:hello@comparavy.com"
              className="font-semibold text-teal-700 transition hover:text-teal-900"
            >
              hello@comparavy.com
            </a>
            .
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Tool corrections
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            Send updates if a tool description, category, or comparison detail
            looks off. We review correction requests and keep the site focused
            on practical accuracy.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Suggestions
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            We welcome tool listing suggestions, partnership inquiries, and
            editorial feedback from people who use these tools in real workflows.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Privacy requests
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700">
            If your message is about privacy, include the page or request details
            so we can review it quickly and respond with the right context.
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-teal-100 bg-teal-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Prefer to browse first?
            </p>
            <p className="mt-2 text-base leading-7 text-slate-700">
              You can also start with the finder or browse the guides before
              reaching out.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/finder"
              className="inline-flex shrink-0 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Use the finder
            </a>
            <a
              href="/guides"
              className="inline-flex shrink-0 rounded-full border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-100"
            >
              Browse guides
            </a>
          </div>
        </div>
      </section>
    </StaticPageShell>
  );
}
