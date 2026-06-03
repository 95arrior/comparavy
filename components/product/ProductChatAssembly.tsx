import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

interface ProductChatAssemblyProps {
  readonly children: ReactNode;
}

export default function ProductChatAssembly({
  children,
}: ProductChatAssemblyProps) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-4 text-slate-950 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-3xl flex-col sm:min-h-[calc(100svh-3rem)]">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            홈
          </Link>
        </header>
        <h1 className="sr-only">온라인 영업 세팅 진단</h1>
        <section className="flex flex-1 items-center py-5 sm:py-7">
          {children}
        </section>
      </div>
    </main>
  );
}
