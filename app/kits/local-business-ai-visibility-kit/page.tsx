import type { Metadata } from "next";
import Link from "next/link";
import FaqAccordion from "@/components/FaqAccordion";
import FactoryAssemblyVisual from "@/components/kits/FactoryAssemblyVisual";
import KitPreviewBuilder from "@/components/kits/KitPreviewBuilder";
import KitCtaLink from "@/components/kits/KitCtaLink";
import SiteHeader from "@/components/SiteHeader";
import {
  type AteFloKit,
  getKitBySlug,
  getKitCtaHref,
  kitHasCheckout,
} from "@/data/kits";

const KIT_SLUG = "local-business-ai-visibility-kit";
const localBusinessKit = getKitBySlug(KIT_SLUG);

if (!localBusinessKit) {
  throw new Error("Local Business AI Visibility Kit data is missing.");
}

const kit: AteFloKit = localBusinessKit;

export const metadata: Metadata = {
  title: "Local Business AI Visibility Kit | AteFlo",
  description:
    "Create review-ready Google Business Profile posts, review replies, website copy, social captions, and visibility checklists from real business details.",
  alternates: {
    canonical: `/kits/${KIT_SLUG}`,
  },
  openGraph: {
    title: "Local Business AI Visibility Kit | AteFlo",
    description:
      "A practical AI workflow kit for local business owners who need review-ready visibility assets without starting from a blank page.",
    url: `/kits/${KIT_SLUG}`,
  },
  twitter: {
    card: "summary",
    title: "Local Business AI Visibility Kit | AteFlo",
    description:
      "Create review-ready local posts, website copy, review replies, social captions, and visibility checklists from real business details.",
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
      sourcePage="local_business_kit"
      actionLocation={actionLocation}
      hasCheckout={kitHasCheckout(kit)}
      className={primaryCtaClass}
    >
      {kit.ctaLabel}
    </KitCtaLink>
  );
}

export default function LocalBusinessAiVisibilityKitPage() {
  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="kits" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                Local Business AI Visibility Kit
              </p>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Turn your local business details into posts, page copy, and
                visibility assets you can actually use.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                A practical AI workflow kit for creating Google Business Profile
                posts, review replies, website copy, social captions, setup
                checklists, and a 30-day local visibility plan.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <KitPrimaryCta actionLocation="local_business_kit_hero" />
                <a
                  href="#build-sample-kit"
                  className={secondaryCtaClass}
                >
                  Build a sample
                </a>
              </div>
              <p className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm leading-6 text-slate-700">
                No ranking or sales guarantees. Built for review-ready assets
                you can edit before publishing.
              </p>
            </div>

            <FactoryAssemblyVisual />
          </div>
        </section>

        <KitPreviewBuilder
          kitSlug={kit.slug}
          ctaHref={getKitCtaHref(kit)}
          hasCheckout={kitHasCheckout(kit)}
          sourcePage="local_business_kit"
          variant="full"
          title="Build a sample visibility kit"
        />

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            What you unlock
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Google Business Profile posts",
              "Review response workflows",
              "Website and service page copy",
              "Instagram and Facebook captions",
              "Visibility setup checklist",
              "30-day local visibility plan",
            ].map((item) => (
              <article
                key={item}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <h2 className="text-base font-semibold text-slate-950">
                  {item}
                </h2>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "The problem",
              copy: "Local owners do not just need AI copy. They need posts, answers, review replies, page copy, and setup steps in the right order.",
            },
            {
              title: "The risk",
              copy: "Generic AI prompts can invent discounts, hours, services, certifications, availability, or claims that the owner has not approved.",
            },
            {
              title: "The outcome",
              copy: "The kit helps create review-ready assets and checklists for owner editing before anything is published.",
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

        <section
          id="whats-inside"
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              What comes in the box
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              A local visibility workflow, boxed into reusable modules.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Each module starts from real business details, creates a specific
              asset, and includes review rules before publishing or setup.
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
              Sample workflow
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              One practical local-business example.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              The full kit expands this into repeatable prompts, templates, and
              review checklists for weekly local visibility work.
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
                It organizes the work a busy owner would otherwise forget.
              </h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
                {[
                  "Organize business details before drafting.",
                  "Avoid invented claims, offers, prices, and availability.",
                  "Generate review-ready local assets.",
                  "Check before publishing or replying.",
                  "Reuse the workflow weekly.",
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
                "Local service businesses.",
                "Salons, spas, and appointment-based businesses.",
                "Clinics and regulated businesses that need careful wording.",
                "Pet services and home services.",
                "Restaurants, cafes, solo operators, and small teams.",
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
                "People looking for guaranteed rankings, leads, sales, or customers.",
                "People trying to fake reviews or manipulate review language.",
                "People who want AI to invent business claims.",
                "People expecting automatic ad, analytics, or pixel installation without setup.",
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
                Use it with your AI chat tool
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Get the complete workflow.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
                <span className="font-semibold text-teal-900">{kit.priceLabel}.</span>{" "}
                Use it with ChatGPT, Claude, Gemini, Copilot, or another AI chat
                tool. If checkout is not configured yet, the CTA records early
                interest without sending business details.
              </p>
            </div>
            <KitPrimaryCta actionLocation="local_business_kit_bottom_cta" />
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
