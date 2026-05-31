import { permanentRedirect } from "next/navigation";

interface LegacyGuidePageProps {
  readonly params: Promise<{ slug: string }>;
}

export default async function LegacyGuideRedirectPage({
  params,
}: LegacyGuidePageProps) {
  const { slug } = await params;

  permanentRedirect(`/shortcuts/${slug}`);
}
