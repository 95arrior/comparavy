import type { Metadata } from "next";
import StaticPageShell from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Contact Comparavy",
  description:
    "Contact Comparavy for tool suggestions, corrections, partnership inquiries, and privacy requests.",
};

export default function ContactPage() {
  return (
    <StaticPageShell
      eyebrow="Contact"
      title="Get in touch with Comparavy."
      intro="Use this page for tool suggestions, corrections, partnership inquiries, or privacy requests."
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-4 text-base leading-8 text-slate-700">
          <p>
            Email us at{" "}
            <a
              href="mailto:hello@comparavy.com"
              className="font-semibold text-teal-700 transition hover:text-teal-900"
            >
              hello@comparavy.com
            </a>
            .
          </p>
          <p>
            We welcome tool suggestions, corrections to existing pages, and
            partnership or collaboration inquiries.
          </p>
          <p>
            If you are reaching out about privacy, include the page or request
            details so we can review it more quickly.
          </p>
        </div>
      </section>
    </StaticPageShell>
  );
}
