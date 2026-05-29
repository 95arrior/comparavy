import Link from "next/link";

interface GuideToolActionsProps {
  readonly slug?: string;
  readonly name: string;
  readonly officialUrl?: string;
  readonly affiliateUrl?: string;
  readonly showViewToolPage?: boolean;
  readonly className?: string;
}

const BASE_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-full px-3.5 py-2 text-xs font-semibold tracking-wide transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:text-sm";

const PRIMARY_CLASSES = "bg-teal-700 text-white hover:bg-teal-800";
const SECONDARY_CLASSES =
  "border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50";

export default function GuideToolActions({
  slug,
  name,
  officialUrl,
  affiliateUrl,
  showViewToolPage = true,
  className,
}: GuideToolActionsProps) {
  const visitUrl = affiliateUrl ?? officialUrl;

  return (
    <div className={`flex flex-wrap gap-2.5 ${className ?? ""}`}>
      {visitUrl && (
        <a
          href={visitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BASE_BUTTON_CLASSES} ${PRIMARY_CLASSES}`}
          aria-label={`Visit ${name} site`}
        >
          Visit Site
        </a>
      )}
      {showViewToolPage && slug && (
        <Link
          href={`/tools/${slug}`}
          className={`${BASE_BUTTON_CLASSES} ${SECONDARY_CLASSES}`}
          aria-label={`View ${name} tool page`}
        >
          View Tool Page
        </Link>
      )}
    </div>
  );
}
