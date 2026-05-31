import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AlternativeTools from "@/components/AlternativeTools";
import Logo from "@/components/Logo";
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

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = toolsBySlug.get(slug as ToolSlug);

  if (!tool) {
    return { title: "Tool Not Found" };
  }

  return {
    title: `${tool.name} | AI Tool`,
    description: `${tool.description} Compare fit, pricing notes, and alternatives for AI shortcut workflows.`,
    keywords: [
      tool.name,
      tool.category,
      ...tool.primaryTags,
      ...tool.personas,
      "AI tools",
      "AteFlo",
    ],
    alternates: {
      canonical: `/tools/${tool.slug}`,
    },
    openGraph: {
      title: `${tool.name} | AteFlo`,
      description: tool.description,
      url: `/tools/${tool.slug}`,
    },
    twitter: {
      card: "summary",
      title: `${tool.name} | AteFlo`,
      description: tool.description,
    },
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
  const visitUrl = tool.affiliateUrl ?? tool.officialUrl;

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
              Shortcuts
            </Link>
          </div>
          <Link
            href="/finder"
            className="rounded-full border border-teal-200 px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
          >
            Use Finder
          </Link>
        </nav>

        <ToolDetailHeader tool={tool} />

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm comparavy-reveal sm:p-8">
              <SectionHeading
                eyebrow="What this tool is best for"
                marker="✅"
                description="Start here if you want the shortest path to deciding whether this tool belongs in your workflow."
              >
                Best fit and tradeoffs
              </SectionHeading>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-teal-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">Best for</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {tool.bestFor.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-teal-700">+</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-amber-50/60 p-4">
                  <p className="text-sm font-semibold text-slate-900">Avoid if</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {tool.avoidIf.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-amber-600">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">Strengths</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {tool.primaryTags.slice(0, 4).map((tag) => (
                      <li key={tag} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                        <span>{formatLabel(tag)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">Limitations</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {tool.notFor.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
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

              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
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
            </section>

          </div>

          <aside className="space-y-6">
            <AlternativeTools currentTool={tool} alternatives={alternatives} />

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm comparavy-reveal">
              <SectionHeading eyebrow="Quick context" marker="📌">
                Why this page exists
              </SectionHeading>
              <p className="mt-5 text-sm leading-7 text-slate-700">
                This page is built for fast reading: the summary sits at the top,
                the decision factors are grouped into compact cards, and the main
                actions stay visible so you can move on quickly.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm comparavy-reveal">
              <SectionHeading eyebrow="Next step" marker="➡️">
                Use the right CTA
              </SectionHeading>
              <p className="mt-5 text-sm leading-7 text-slate-700">
                If you are ready to test the product, open the official site. If
                you are still comparing, jump to Finder or open a related shortcut.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={visitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  Visit Official Site
                </a>
                <Link
                  href="/finder"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
                >
                  Use Finder
                </Link>
                <Link
                  href="/guides"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
                >
                  Browse Shortcuts
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </article>
    </main>
  );
}
