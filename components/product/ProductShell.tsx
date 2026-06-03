import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

interface ProductShellProps {
  readonly children: ReactNode;
  readonly maxWidth?: "4xl" | "6xl";
}

const maxWidthClassName = {
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
} as const;

export default function ProductShell({
  children,
  maxWidth = "6xl",
}: ProductShellProps) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className={`mx-auto ${maxWidthClassName[maxWidth]}`}>
        <header className="mb-8 flex items-center justify-between gap-4">
          <Logo />
          <nav
            aria-label="제품 흐름"
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/85 p-1 text-sm font-semibold text-slate-600 shadow-sm sm:flex"
          >
            <Link
              href="/assemble/online-sales-setup-kit"
              className="rounded-full px-4 py-2 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              진단
            </Link>
            <Link
              href="/dashboard/online-sales-setup-kit"
              className="rounded-full px-4 py-2 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              전체 패키지
            </Link>
            <Link
              href="/kits/online-sales-setup-kit"
              className="rounded-full px-4 py-2 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              상품 안내
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
