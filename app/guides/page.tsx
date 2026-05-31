import type { Metadata } from "next";
import Link from "next/link";
import ActionLinks from "@/components/ActionLinks";
import BadgeRow from "@/components/BadgeRow";
import SiteHeader from "@/components/SiteHeader";
import ToolIcon from "@/components/ToolIcon";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import { formatGuideLayoutLabel, resolveGuideLayoutType } from "@/lib/guideTypes";
import { getPublishedGuides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "AI Shortcuts",
  description:
    "Practical AI shortcuts and workflows for turning messy inputs into finished outputs.",
};

export default function GuidesPage() {
  const guides = getPublishedGuides();

  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="shortcuts" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm ateflo-reveal sm:px-10 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            AI Shortcuts
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Practical workflows for finishing real work with AI.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Start with notes, documents, ideas, or business tasks and follow a
            clear shortcut toward a finished output.
          </p>
          <ActionLinks
            className="mt-9"
            items={[
              { href: "/finder", label: "Use Finder", tone: "primary" },
              { href: "/tools", label: "Browse Tools" },
            ]}
          />
          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-slate-700">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Fast path
            </p>
            <p className="mt-2 max-w-xl text-sm leading-7">
              Answer a few questions in Finder, then jump into the shortcut that
              matches what you are trying to finish.
            </p>
          </div>
        </header>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">Published shortcuts</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Start with the work
              </h2>
            </div>
            <p className="hidden text-sm text-slate-500 sm:block">
              {guides.length} shortcuts available
            </p>
          </div>

          {guides.length === 0 ? (
            <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm ateflo-reveal sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                Shortcuts are being updated
              </p>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                AteFlo is preparing practical AI shortcuts based on search
                intent, real workflows, and useful finished outputs.
              </p>
              <ActionLinks
                className="mt-7"
                items={[
                  { href: "/guides", label: "Browse Shortcuts", tone: "primary" },
                  { href: "/finder", label: "Use Finder" },
                ]}
              />
            </div>
          ) : (
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {guides.map((guide, index) => {
                const primaryTool = toolsBySlug.get(
                  guide.recommendedToolSlugs[0] as ToolSlug,
                );

                return (
                  <article
                    key={guide.slug}
                    className={`flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ateflo-card-lift ateflo-reveal ${
                      index % 2 === 1 ? "ateflo-reveal-delay-1" : ""
                    }`}
                  >
                    <BadgeRow
                      badges={[
                        {
                          label: formatGuideLayoutLabel(resolveGuideLayoutType(guide.guideType)),
                          tone: "slate",
                        },
                        { label: guide.category, tone: "teal" },
                        { label: guide.skillLevel },
                      ]}
                    />
                    <h3 className="ateflo-clamp-3 mt-5 text-2xl font-semibold leading-8 tracking-tight text-slate-900 md:min-h-24">
                      <Link
                        href={`/guides/${guide.slug}`}
                        className="transition hover:text-teal-700"
                      >
                        {guide.title}
                      </Link>
                    </h3>
                    <p className="ateflo-clamp-4 mt-3 text-sm leading-7 text-slate-600">
                      {guide.quickAnswer ?? guide.quickVerdict}
                    </p>
                    <dl className="mt-5 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm md:min-h-[12rem]">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          For
                        </dt>
                        <dd className="mt-1 font-medium text-slate-800">
                          {guide.persona}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Use case
                        </dt>
                        <dd className="mt-1 leading-6 text-slate-700">
                          {guide.useCase}
                        </dd>
                      </div>
                    </dl>
                    {primaryTool && (
                      <div className="mt-5 flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                        <ToolIcon
                          {...primaryTool}
                          size={28}
                          loading={index < 2 ? "eager" : "lazy"}
                        />
                        <div className="min-w-0">
                          <p className="truncate whitespace-nowrap text-sm font-semibold leading-none text-slate-900">
                            {primaryTool.name}
                          </p>
                        </div>
                      </div>
                    )}
                    <ActionLinks
                      className="mt-auto border-t border-slate-100 pt-5"
                      items={[
                        {
                          href: `/guides/${guide.slug}`,
                          label: "Read Shortcut",
                          tone: "primary",
                        },
                        { href: "/finder", label: "Use Finder" },
                      ]}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
