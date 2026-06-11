import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import Brand from "@/components/Brand";

export default function SiteFooter({ pro = false }: { pro?: boolean }) {
  return (
    <footer className="border-t border-neutral-200/70">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Brand pro={pro} />
          <p className="text-xs leading-relaxed text-neutral-400">
            에이트플로(AteFlo) — 키워드 하나로 검색에 걸리는 워드프레스 글을 써주는 AI 글쓰기 서비스
          </p>
        </div>
        <nav className="flex flex-wrap gap-6">
          <Link href="/pricing" className="transition hover:text-neutral-900">요금</Link>
          <Link href="/terms" className="transition hover:text-neutral-900">이용약관</Link>
          <Link href="/privacy" className="transition hover:text-neutral-900">개인정보처리방침</Link>
          <Link href="/refund" className="transition hover:text-neutral-900">환불정책</Link>
        </nav>
        <span className="text-xs text-neutral-400">© {new Date().getFullYear()} {SITE_NAME}</span>
      </div>
    </footer>
  );
}
