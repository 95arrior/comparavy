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

interface ShortcutPageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPublishedGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: ShortcutPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getPublishedGuideBySlug(slug);

  if (!guide) {
    return { title: "Shortcut Not Found" };
  }

  return {
    title: {
      absolute: guide.metaTitle,
    },
    description: guide.metaDescription,
    keywords: [guide.primaryKeyword, ...guide.secondaryKeywords],
    alternates: {
      canonical: `/shortcuts/${guide.slug}`,
    },
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      url: `/shortcuts/${guide.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: guide.metaTitle,
      description: guide.metaDescription,
    },
  };
}

export default async function ShortcutDetailPage({ params }: ShortcutPageProps) {
  const { slug } = await params;
  const guide = getPublishedGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  return (
    <main className="ateflo-page-shell min-h-screen bg-[#F7F9FC] px-4 py-6 sm:px-6 sm:py-10">
      <article className="mx-auto max-w-6xl">
        <nav className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Logo />
            <Link
              href="/tools"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              Tools
            </Link>
            <Link
              href="/shortcuts"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              Shortcuts
            </Link>
          </div>
        </nav>

        <EditorialHero guide={guide} />

        <GuideDetailRenderer guide={guide} />
      </article>
    </main>
  );
}
