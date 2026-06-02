import { permanentRedirect } from "next/navigation";

interface ShortcutRedirectPageProps {
  readonly params: Promise<{ slug: string }>;
}

function shortcutRedirectDestination(slug: string): string {
  if (slug === "how-to-write-google-business-profile-posts-with-ai") {
    return "/kits/local-business-ai-visibility-kit";
  }

  if (slug === "how-to-write-a-dating-app-bio-with-ai-without-sounding-generic") {
    return "/kits#dating-profile-rewrite-kit";
  }

  return "/kits";
}

export default async function ShortcutRedirectPage({
  params,
}: ShortcutRedirectPageProps) {
  const { slug } = await params;

  permanentRedirect(shortcutRedirectDestination(slug));
}
