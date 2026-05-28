import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AlternativeTools from "@/components/AlternativeTools";
import Logo from "@/components/Logo";
import MetricBars from "@/components/MetricBars";
import SectionHeading from "@/components/SectionHeading";
import ToolDetailHeader from "@/components/ToolDetailHeader";
import { tools, toolsBySlug, type ToolSlug } from "@/data/tools";
import type { AiTool } from "@/types/tool";

interface ToolPageProps {
  readonly params: Promise<{ slug: string }>;
}

function formatLabel(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function humanizeList(items: readonly string[] | undefined): readonly string[] {
  return items ?? [];
}

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = toolsBySlug.get(slug as ToolSlug);

  if (!tool) {
    return { title: "Tool Not Found | Comparavy" };
  }

  return {
    title: `${tool.name} | Comparavy AI Tools`,
    description: `${tool.description} Compare fit, pricing notes, and alternatives in the Comparavy tools directory.`,
    keywords: [
      tool.name,
      tool.category,
      ...tool.primaryTags,
      ...tool.personas,
      "AI tools",
      "Comparavy",
    ],
  };
}

export default async function ToolDetailPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = toolsBySlug.get(slug as ToolSlug);

  if (!tool) {
    notFound();
  }

  const resolvedAlternatives = tool.alternatives
    .map((altSlug) => toolsBySlug.get(altSlug as ToolSlug))
    .filter(Boolean) as AiTool[];
  const alternatives = resolvedAlternatives.filter(
    (alternative) => alternative.slug !== tool.slug,
  );
  const destination = tool.affiliateUrl ?? tool.officialUrl;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <article className="mx-auto max-w-6xl">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Logo />
            <Link
              href="/tools"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              Tools
            </Link>
            <Link
              href="/guides"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              Guides
            </Link>
          </div>
          <Link
            href="/finder"
            className="rounded-full border border-teal-200 px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
          >
            Find my tool
          </Link>
        </nav>

        <ToolDetailHeader tool={tool} />

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <SectionHeading eyebrow="What this tool is good for" marker="✅">
              Best fit and tradeoffs
            </SectionHeading>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-teal-50/70 p-4">
                <p className="text-sm font-semibold text-slate-900">Best for</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {humanizeList(tool.bestFor).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-teal-700">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Not for</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {humanizeList(tool.notFor).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-amber-50/60 p-4 md:col-span-2">
                <p className="text-sm font-semibold text-slate-900">Avoid if</p>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700 sm:grid-cols-2">
                  {humanizeList(tool.avoidIf).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-amber-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                  <p className="text-sm font-semibold text-slate-900">Use cases</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tool.useCases.map((useCase) => (
                  <span
                    key={useCase}
                    className="rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200"
                  >
                    {useCase}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <p className="text-sm font-semibold text-slate-900">Personas</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tool.personas.map((persona) => (
                  <span
                    key={persona}
                    className="rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200"
                  >
                    {formatLabel(persona)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeading eyebrow="Scores" marker="📊">
                Fit signals
              </SectionHeading>
              <div className="mt-6">
                <MetricBars tool={tool} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeading eyebrow="Pricing" marker="💸">
                Read before subscribing
              </SectionHeading>
              <p className="mt-5 text-sm leading-7 text-slate-700">
                {tool.pricingNote}
              </p>
              <dl className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Budget level
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {tool.budgetLevel === "free"
                      ? "Free"
                      : tool.budgetLevel === "premium"
                        ? "Premium"
                        : tool.budgetLevel === "under20"
                          ? "Under $20"
                          : "Under $50"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pricing checked
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {tool.pricingLastChecked}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeading eyebrow="Setup" marker="🛠️">
                What to expect
              </SectionHeading>
              <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Setup difficulty
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {tool.setupDifficulty}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Free plan
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {tool.freePlan ? "Available" : "Not listed"}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SectionHeading eyebrow="Next steps" marker="➡️">
            Compare with similar tools
          </SectionHeading>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={destination}
              target="_blank"
              rel={
                tool.affiliateUrl
                  ? "noopener noreferrer sponsored nofollow"
                  : "noopener noreferrer"
              }
              className="inline-flex items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Visit official site
            </a>
            <Link
              href="/finder"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              Use AI Tool Finder
            </Link>
            <Link
              href="#alternatives"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              Compare alternatives
            </Link>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Some links may be affiliate links. We recommend tools based on fit,
            not commission.
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Looking for a broader comparison? Browse the{" "}
            <Link href="/tools" className="font-semibold text-teal-700 hover:text-teal-900">
              tools directory
            </Link>{" "}
            or read the{" "}
            <Link href="/guides" className="font-semibold text-teal-700 hover:text-teal-900">
              guides
            </Link>
            .
          </p>
        </section>

        <div className="mt-6">
          <AlternativeTools currentTool={tool} alternatives={alternatives} />
        </div>
      </article>
    </main>
  );
}
