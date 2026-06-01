import ScrollFocusReveal from "@/components/guides/ScrollFocusReveal";
import ShortcutResultPreview from "@/components/guides/ShortcutResultPreview";
import type { Guide } from "@/lib/guides";

export default function ResultPreviewFrame({ guide }: { readonly guide: Guide }) {
  return (
    <ScrollFocusReveal>
      <section
        aria-labelledby="shortcut-result-preview-heading"
        className="rounded-[1.75rem] border border-teal-100 bg-white p-4 shadow-[0_20px_56px_rgba(15,23,42,0.10)] sm:p-5"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              Result preview
            </p>
            <h2
              id="shortcut-result-preview-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
            >
              The kind of result this shortcut creates.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            A quick visual sample of the finished output shape, not a full demo.
          </p>
        </div>
        <ShortcutResultPreview
          slug={guide.slug}
          title={guide.title}
          topicCluster={guide.topicCluster}
          variant="detail"
        />
      </section>
    </ScrollFocusReveal>
  );
}
