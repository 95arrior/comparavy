import type { Metadata } from "next";
import Link from "next/link";
import FaqAccordion from "@/components/FaqAccordion";
import KitCtaLink from "@/components/kits/KitCtaLink";
import SiteHeader from "@/components/SiteHeader";
import TrackedLink from "@/components/TrackedLink";
import {
  type AteFloKit,
  getKitBySlug,
  getKitCtaHref,
  kitHasCheckout,
} from "@/data/kits";

const KIT_SLUG = "job-application-ai-kit";
const jobApplicationKit = getKitBySlug(KIT_SLUG);

if (!jobApplicationKit) {
  throw new Error("Job Application AI Kit data is missing.");
}

const kit: AteFloKit = jobApplicationKit;

export const metadata: Metadata = {
  title: "Job Application AI Kit | AteFlo",
  description:
    "Use a structured AI workflow to turn job posts and real experience notes into resume bullets, cover letter drafts, interview answers, and follow-up emails you can review.",
  alternates: {
    canonical: `/kits/${KIT_SLUG}`,
  },
  openGraph: {
    title: "Job Application AI Kit | AteFlo",
    description:
      "A practical AI workflow kit for creating review-ready job application materials from real job posts and experience notes.",
    url: `/kits/${KIT_SLUG}`,
  },
  twitter: {
    card: "summary",
    title: "Job Application AI Kit | AteFlo",
    description:
      "A practical AI workflow kit for creating review-ready job application materials from real job posts and experience notes.",
  },
};

export const revalidate = 0;

const primaryCtaClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2";

const secondaryCtaClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2";

function KitPrimaryCta({ actionLocation }: { readonly actionLocation: string }) {
  return (
    <KitCtaLink
      href={getKitCtaHref(kit)}
      kitSlug={kit.slug}
      sourcePage="job_application_kit"
      actionLocation={actionLocation}
      hasCheckout={kitHasCheckout(kit)}
      className={primaryCtaClass}
    >
      {kit.ctaLabel}
    </KitCtaLink>
  );
}

export default function JobApplicationAiKitPage() {
  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="kits" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                Job Application AI Kit
              </p>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Stop starting every application from a blank page.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                Use a structured AI workflow to turn a job post and your
                experience into resume bullets, a cover letter draft, interview
                answers, and follow-up emails you can review.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <KitPrimaryCta actionLocation="job_kit_hero" />
                <TrackedLink
                  href="/shortcuts"
                  eventName="shortcut_card_click"
                  eventParams={{
                    source_page: "job_application_kit",
                    action_location: "job_kit_try_free_shortcuts",
                  }}
                  className={secondaryCtaClass}
                >
                  Try free shortcuts
                </TrackedLink>
              </div>
            </div>

            <aside className="rounded-3xl border border-teal-100 bg-teal-50 p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
                What you get
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                {kit.whatIsInside.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "The pain",
              copy: "Job descriptions are specific, but generic AI prompts create generic applications.",
            },
            {
              title: "The workflow",
              copy: "Start from the job post, match real experience, draft, revise, and review before sending.",
            },
            {
              title: "The boundary",
              copy: "The kit helps you write from real facts. It does not invent experience or guarantee hiring results.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              What is inside
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              A complete application workflow, not a prompt dump.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Each module is designed to move from messy inputs to a draft you
              can review. The prompts include missing-detail handling and
              do-not-invent rules.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {kit.modules.map((module) => (
              <article
                key={module.title}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <h3 className="text-base font-semibold text-slate-950">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {module.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              Free sample
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              One small workflow preview.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This is the kind of structure the kit uses. The paid kit expands
              this into a full prompt sequence with revision and review steps.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-4">
              {kit.sampleItems.map((item) => {
                const [label, detail] = item.split(": ");

                return (
                  <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {detail ?? item}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                Why this is different
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                It gives you a review path, not just prompts.
              </h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
                {[
                  "Organize inputs before drafting.",
                  "Generate drafts from real experience notes.",
                  "Check for invented details before using the output.",
                  "Revise tone and specificity.",
                  "Review everything before sending.",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
              <p className="text-sm font-semibold text-teal-900">
                Safety notes
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                {kit.safetyNotes.map((note) => (
                  <li key={note} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              Who it is for
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              {[
                "Job seekers applying to roles with detailed job descriptions.",
                "Career switchers who need to connect older experience to a new direction.",
                "Students turning projects, internships, or coursework into application material.",
                "Freelancers applying to contracts or client-facing roles.",
                "People applying to multiple roles who need a repeatable workflow.",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Who it is not for
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              {[
                "People who want to invent experience, credentials, or metrics.",
                "People looking for guaranteed interviews or hiring outcomes.",
                "People who want to skip reviewing AI output before sending.",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="early-access"
          className="mt-8 rounded-3xl border border-teal-100 bg-teal-50 p-5 shadow-sm sm:p-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
                Ready when the checkout is connected
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Get the workflow instead of starting from scratch.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
                If checkout is not configured yet, this action records early
                interest without sending any personal application details.
              </p>
            </div>
            <KitPrimaryCta actionLocation="job_kit_bottom_cta" />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            FAQ
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Questions before using the kit
          </h2>
          <div className="mt-6">
            <FaqAccordion items={kit.faq} />
          </div>
        </section>

        <div className="mt-8">
          <Link
            href="/kits"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Back to all kits
          </Link>
        </div>
      </div>
    </main>
  );
}
