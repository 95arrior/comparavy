import Link from "next/link";

export default function ViewShortcutsCta() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
        Want another AI shortcut?
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        Browse all AteFlo shortcuts to find another workflow for notes,
        documents, products, content, or business tasks.
      </p>
      <Link
        href="/guides"
        data-event="view_shortcuts_click"
        data-action-location="guide_detail_lower_cta"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-teal-50 px-4 py-2.5 text-center text-sm font-semibold text-teal-900 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
      >
        View Shortcuts
      </Link>
    </section>
  );
}
