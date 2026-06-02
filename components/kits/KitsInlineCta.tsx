import TrackedLink from "@/components/TrackedLink";

interface KitsInlineCtaProps {
  readonly sourcePage: string;
}

export default function KitsInlineCta({ sourcePage }: KitsInlineCtaProps) {
  return (
    <section className="rounded-3xl border border-teal-100 bg-teal-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
            AteFlo Kits
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Looking for a complete workflow?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">
            Explore paid AI workflow kits for bigger tasks that need prompts,
            examples, revision steps, and review checklists.
          </p>
        </div>
        <TrackedLink
          href="/kits"
          eventName="kit_card_click"
          eventParams={{
            source_page: sourcePage,
            action_location: `${sourcePage}_inline_kit_cta`,
          }}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          Explore AteFlo kits
        </TrackedLink>
      </div>
    </section>
  );
}
