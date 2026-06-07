import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const productLinks = [
  { href: "/#how", label: "작동 방식" },
  { href: "/#features", label: "기능" },
  { href: "/pricing", label: "요금" },
] as const;

const legalLinks = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund", label: "환불정책" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm space-y-3">
          <span className="text-lg font-semibold tracking-tight">{SITE_NAME}</span>
          <p className="text-sm leading-6 text-neutral-500">
            드디어 발행할 가치가 있는 AI 글 — 진짜 통찰로 쓰고, SEO에 최적화하고, 워드프레스에 바로 발행합니다.
          </p>
        </div>

        <div className="flex gap-12 text-sm">
          <nav aria-label="제품" className="flex flex-col gap-3">
            <span className="font-medium text-white">제품</span>
            {productLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-neutral-500 transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="법적 고지" className="flex flex-col gap-3">
            <span className="font-medium text-white">법적 고지</span>
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-neutral-500 transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-white/[0.06] pt-6 text-xs text-neutral-600">
        © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
