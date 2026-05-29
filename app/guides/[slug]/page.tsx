import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditorialHero from "@/components/guides/EditorialHero";
import GuideDetailRenderer from "@/components/guides/GuideDetailRenderer";
import Logo from "@/components/Logo";
import {
  getPublishedGuideBySlug,
  getPublishedGuides,
} from "@/lib/guides";

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

export default async function GuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getPublishedGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

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

        <EditorialHero guide={guide} />

        <GuideDetailRenderer guide={guide} />
      </article>
    </main>
  );
}
