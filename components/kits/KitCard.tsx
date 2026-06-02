import TrackedLink from "@/components/TrackedLink";
import KitCtaLink from "@/components/kits/KitCtaLink";
import {
  type AteFloKit,
  getKitCtaHref,
  getKitHref,
  kitHasCheckout,
} from "@/data/kits";

interface KitCardProps {
  readonly kit: AteFloKit;
  readonly sourcePage: string;
  readonly compact?: boolean;
}

function statusLabel(kit: AteFloKit): string {
  return kit.status === "active" ? kit.priceLabel : "Coming soon";
}

export default function KitCard({ kit, sourcePage, compact = false }: KitCardProps) {
  const detailHref = getKitHref(kit);
  const ctaHref = getKitCtaHref(kit);
  const hasCheckout = kitHasCheckout(kit);
  const active = kit.status === "active";

  return (
    <article
      id={kit.slug}
      className={`flex h-full min-w-0 flex-col rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${
        kit.isFeatured ? "border-teal-200" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {kit.productLabel && (
          <span className="inline-flex rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white">
            {kit.productLabel}
          </span>
        )}
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            active
              ? "bg-teal-50 text-teal-800"
              : "border border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {statusLabel(kit)}
        </span>
        <span className="text-xs font-medium text-slate-500">AI workflow kit</span>
      </div>

      <h3 className="mt-4 text-xl font-semibold leading-7 tracking-tight text-slate-950">
        {kit.title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        {kit.oneLinePromise}
      </p>

      {!compact && (
        <div className="mt-5 grid gap-3 text-sm leading-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              For
            </p>
            <p className="mt-2 text-slate-700">{kit.audience}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Outcome
            </p>
            <p className="mt-2 text-slate-700">{kit.outcome}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Solves
            </p>
            <p className="mt-2 text-slate-700">{kit.pain}</p>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Inside
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {kit.whatIsInside.slice(0, compact ? 3 : 4).map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row">
        {active ? (
          <KitCtaLink
            href={ctaHref}
            kitSlug={kit.slug}
            sourcePage={sourcePage}
            actionLocation={`${sourcePage}_kit_card_primary`}
            hasCheckout={hasCheckout}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            {kit.ctaLabel}
          </KitCtaLink>
        ) : (
          <span
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-sm font-semibold text-slate-500"
            aria-label={`${kit.title} is coming soon`}
          >
            Coming soon
          </span>
        )}
        <TrackedLink
          href={detailHref}
          eventName="kit_card_click"
          eventParams={{
            kit_slug: kit.slug,
            source_page: sourcePage,
            action_location: `${sourcePage}_kit_card_details`,
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          View details
        </TrackedLink>
      </div>
    </article>
  );
}
