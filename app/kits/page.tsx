import type { Metadata } from "next";
import KitCard from "@/components/kits/KitCard";
import SiteHeader from "@/components/SiteHeader";
import { getKits } from "@/data/kits";

export const metadata: Metadata = {
  title: "AteFlo Kits | AI Workflow Kits for Real Work",
  description:
    "Explore AteFlo paid AI workflow kits for high-value tasks that need prompts, examples, revision steps, and review checklists.",
  alternates: {
    canonical: "/kits",
  },
  openGraph: {
    title: "AteFlo Kits | AI Workflow Kits for Real Work",
    description:
      "Complete AI workflows for people who need structured results, not another vague prompt pack.",
    url: "/kits",
  },
  twitter: {
    card: "summary",
    title: "AteFlo Kits | AI Workflow Kits for Real Work",
    description:
      "Complete AI workflows for people who need structured results, not another vague prompt pack.",
  },
};

export const revalidate = 0;

export default function KitsPage() {
  const kits = getKits();
  const activeKits = kits.filter((kit) => kit.status === "active");
  const comingSoonKits = kits.filter((kit) => kit.status === "coming-soon");

  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="kits" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />

        <header className="rounded-3xl border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            AteFlo Kits
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            AI workflow kits for tasks that need more than one prompt.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            AteFlo kits are complete AI workflows for people who need the
            result, not another vague prompt. Use them when a high-value task
            needs inputs, prompt sequence, examples, revision steps, and a final
            review checklist.
          </p>
        </header>

        <section className="mt-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">Available</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Paid kit foundation
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600">
              Free shortcuts remain samples. Kits are the full repeatable
              workflow for bigger jobs.
            </p>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {activeKits.map((kit) => (
              <KitCard key={kit.slug} kit={kit} sourcePage="kits" />
            ))}
          </div>
        </section>

        <section className="mt-9">
          <div>
            <p className="text-sm font-semibold text-teal-700">Coming soon</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Future workflow kits
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              These are planned only if the workflow can be specific, useful,
              and safer than a generic prompt pack.
            </p>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {comingSoonKits.map((kit) => (
              <KitCard key={kit.slug} kit={kit} sourcePage="kits" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
