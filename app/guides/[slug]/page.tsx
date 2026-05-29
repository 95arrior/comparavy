import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionLinks from "@/components/ActionLinks";
import GuideDetailRenderer from "@/components/guides/GuideDetailRenderer";
import Logo from "@/components/Logo";
import ToolIcon from "@/components/ToolIcon";
import { formatGuideLayoutLabel, resolveGuideLayoutType } from "@/lib/guideTypes";
import {
  getPublishedGuideBySlug,
  getPublishedGuides,
  type Guide,
} from "@/lib/guides";
import { resolveGuideTool } from "@/lib/guideTools";

interface GuidePageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPublishedGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getPublishedGuideBySlug(slug);

  if (!guide) {
    return { title: "Guide Not Found | Comparavy" };
  }

  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    keywords: [guide.primaryKeyword, ...guide.secondaryKeywords],
  };
}

function getPrimaryTool(guide: Guide) {
  const primaryRecommendation = guide.recommendedTools[0];
  return resolveGuideTool(
    primaryRecommendation?.toolSlug ?? guide.recommendedToolSlugs[0],
    primaryRecommendation?.toolName,
  );
}

export default async function GuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getPublishedGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const primaryTool = getPrimaryTool(guide);
  const guideType = resolveGuideLayoutType({
    slug: guide.slug,
    title: guide.title,
    type: guide.type,
    guideType: guide.guideType,
    searchIntent: guide.searchIntent,
    decisionQuestion: guide.decisionQuestion,
    uniqueAngle: guide.uniqueAngle,
    notes: guide.contentGap,
  });

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-6 sm:px-6 sm:py-10">
      <article className="mx-auto max-w-6xl">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
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
            Use Finder
          </Link>
        </nav>

        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm comparavy-reveal sm:px-10 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            {formatGuideLayoutLabel(guideType)}
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {guide.quickAnswer ?? guide.quickVerdict}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
              {guide.persona}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {guide.skillLevel}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {guide.deviceIntent ?? "both"}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {primaryTool ? primaryTool.setupDifficulty : "Setup varies"}
            </span>
          </div>

          {primaryTool && (
            <div className="mt-6 flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <ToolIcon {...primaryTool} size={28} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Primary tool</p>
                <p className="truncate whitespace-nowrap text-base font-semibold text-slate-900">
                  <Link href={`/tools/${primaryTool.slug}`} className="transition hover:text-teal-700">
                    {primaryTool.name}
                  </Link>
                </p>
              </div>
            </div>
          )}

          <ActionLinks
            className="mt-6"
            items={[
              { href: "/finder", label: "Use Finder", tone: "primary" },
              { href: "/tools", label: "View Tools" },
            ]}
          />
        </header>

        <GuideDetailRenderer guide={guide} />
      </article>
    </main>
  );
}
