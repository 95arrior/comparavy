import Link from "next/link";
import Logo from "@/components/Logo";
import { SITE_TAGLINE } from "@/lib/site";

const mainLinks = [
  { href: "/kits", label: "Kits" },
  { href: "/shortcuts", label: "Free Shortcuts" },
  { href: "/tools", label: "Tools" },
  { href: "/finder", label: "Finder" },
] as const;

const policyLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/affiliate-disclosure", label: "Affiliate disclosure" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <Logo variant="footer" />
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            {SITE_TAGLINE} Practical AI workflows for turning messy inputs into
            finished outputs.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-sm sm:flex-row sm:flex-wrap sm:gap-8">
          <nav aria-label="Footer primary navigation" className="flex flex-wrap gap-5">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-slate-600 transition hover:text-teal-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Footer policy navigation" className="flex flex-wrap gap-5">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-slate-500 transition hover:text-teal-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
