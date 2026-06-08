import Link from "next/link";
import Brand from "@/components/Brand";
import { BUSINESS, mailOrderText } from "@/lib/business";

// 사업자 정보 블록 — 약관·개인정보·환불 페이지에서 공용으로 사용 (값은 lib/business.ts 한 곳에서)
export function BusinessInfo() {
  return (
    <>
      <p>상호: {BUSINESS.company} / 대표자: {BUSINESS.ceo}</p>
      <p>사업자등록번호: {BUSINESS.bizNumber} / 통신판매업 신고번호: {mailOrderText}</p>
      <p>주소: {BUSINESS.address}</p>
      <p>연락처: {BUSINESS.phone} / 이메일: {BUSINESS.email}</p>
    </>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-600">{children}</div>
    </section>
  );
}

export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/"><Brand /></Link>
          <Link href="/" className="text-sm text-neutral-500 transition hover:text-neutral-900">
            홈으로
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-neutral-400">최종 수정일: {updated}</p>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
