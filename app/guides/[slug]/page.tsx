import { permanentRedirect } from "next/navigation";

interface LegacyGuidePageProps {
  readonly params: Promise<{ slug: string }>;
}

function legacyGuideDestination(slug: string): string {
  if (slug === "how-to-write-google-business-profile-posts-with-ai") {
    return "/kits/online-sales-setup-kit";
  }

  if (slug === "how-to-write-a-dating-app-bio-with-ai-without-sounding-generic") {
    return "/kits#dating-profile-rewrite-kit";
  }

  return "/kits";
}

export default async function LegacyGuideRedirectPage({
  params,
}: LegacyGuidePageProps) {
  const { slug } = await params;

  permanentRedirect(legacyGuideDestination(slug));
}
