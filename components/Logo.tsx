import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export default function Logo() {
  return (
    <Link href="/" aria-label={`${SITE_NAME} home`} className="ateflo-logo-link">
      <span className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
          A
        </span>
        {SITE_NAME}
      </span>
    </Link>
  );
}
