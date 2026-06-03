import Link from "next/link";
import Logo from "@/components/Logo";
const mainLinks = [
  { href: "/kits", label: "실행 패키지" },
  {
    href: "/kits/online-sales-setup-kit",
    label: "온라인 영업 세팅",
  },
  {
    href: "/kits/job-application-ai-kit",
    label: "취업 준비",
  },
  { href: "/tools", label: "도구" },
] as const;

const policyLinks = [
  { href: "/about", label: "소개" },
  { href: "/contact", label: "문의" },
  { href: "/privacy", label: "개인정보" },
  { href: "/affiliate-disclosure", label: "제휴 고지" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <Logo variant="footer" />
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            지금 막힌 일을 선택하면 먼저 챙기면 좋은 세팅을 진단하고,
            필요한 실행 패키지를 안내합니다.
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
