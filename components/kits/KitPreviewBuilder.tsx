"use client";

import { useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface KitPreviewBuilderProps {
  readonly kitSlug: string;
  readonly ctaHref: string;
  readonly hasCheckout: boolean;
  readonly sourcePage: string;
  readonly variant?: "compact" | "full";
  readonly title?: string;
  readonly className?: string;
  readonly showLockedAfterGenerateOnly?: boolean;
}

const fields = [
  {
    key: "businessType",
    label: "Business type",
    placeholder: "Dog grooming salon",
    requiredInCompact: true,
  },
  {
    key: "location",
    label: "Location or service area",
    placeholder: "Austin",
    requiredInCompact: true,
  },
  {
    key: "offer",
    label: "Main offer or service",
    placeholder: "summer de-shedding appointments",
    requiredInCompact: true,
  },
  {
    key: "customer",
    label: "Target customer",
    placeholder: "busy pet owners",
    requiredInCompact: false,
  },
  {
    key: "tone",
    label: "Tone",
    placeholder: "friendly and practical",
    requiredInCompact: false,
  },
] as const;

type FieldKey = (typeof fields)[number]["key"];
type PreviewValues = Record<FieldKey, string>;

function clean(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

export default function KitPreviewBuilder({
  kitSlug,
  ctaHref,
  hasCheckout,
  sourcePage,
  variant = "full",
  title,
  className,
  showLockedAfterGenerateOnly = false,
}: KitPreviewBuilderProps) {
  const [values, setValues] = useState<PreviewValues>({
    businessType: "",
    location: "",
    offer: "",
    customer: "",
    tone: "",
  });
  const [hasGenerated, setHasGenerated] = useState(false);
  const hasStarted = useRef(false);

  const visibleFields = variant === "compact" ? fields.slice(0, 4) : fields;
  const filledCount = useMemo(
    () => visibleFields.filter((field) => values[field.key].trim().length > 0).length,
    [values, visibleFields],
  );

  const preview = useMemo(() => {
    const businessType = clean(values.businessType, "local business");
    const location = clean(values.location, "your service area");
    const offer = clean(values.offer, "your main service");
    const customer = clean(values.customer, "local customers");
    const tone = clean(values.tone, "clear and friendly");

    return {
      post: `${businessType} in ${location}: Make ${offer} easier to plan this week. If you are a ${customer}, send us a message or check current availability. Keep this update ${tone}, and review dates, prices, and availability before publishing.`,
      caption: `${offer} for ${customer} in ${location}. Ask what is available this week and check the details before booking.`,
      checklist: [
        "Confirm prices, dates, hours, and availability before publishing.",
        "Remove claims that are not already true for the business.",
        "Add a real photo, location detail, or service note if available.",
      ],
    };
  }, [values]);

  const sectionClassName =
    className ??
    "mt-8 rounded-3xl border border-teal-100 bg-white p-5 shadow-sm sm:p-7";
  const ctaLabel = hasCheckout ? "Get the full kit" : "Get early access";
  const external = isExternalHref(ctaHref);

  function updateValue(key: FieldKey, value: string) {
    if (!hasStarted.current && value.trim().length > 0) {
      hasStarted.current = true;
      trackEvent("kit_preview_started", {
        kit_slug: kitSlug,
        source_page: sourcePage,
        action_location: "local_business_preview_form",
        preview_field_count: 1,
        has_preview_generated: false,
      });
    }

    setValues((current) => ({ ...current, [key]: value }));
  }

  function generatePreview() {
    setHasGenerated(true);
    trackEvent("kit_preview_generated", {
      kit_slug: kitSlug,
      source_page: sourcePage,
      action_location: "local_business_preview_form",
      preview_field_count: filledCount,
      has_preview_generated: true,
    });
  }

  function handleUnlockClick() {
    trackEvent("kit_unlock_click", {
      kit_slug: kitSlug,
      source_page: sourcePage,
      action_location: "local_business_preview_unlock",
      preview_field_count: filledCount,
      has_preview_generated: hasGenerated,
    });
    trackEvent(hasCheckout ? "kit_checkout_click" : "kit_interest_click", {
      kit_slug: kitSlug,
      source_page: sourcePage,
      action_location: "local_business_preview_unlock",
    });
  }

  return (
    <section id="build-sample-kit" className={sectionClassName}>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Build your sample kit
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {title ?? "Build a sample visibility kit"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Add a few details. AteFlo assembles a small template-based sample:
            one local post, one social caption, and three checklist items. No
            AI API call, storage, or raw-input analytics.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-full bg-white px-3 py-1">Input</span>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-800">
                Assemble
              </span>
              <span className="rounded-full bg-white px-3 py-1">Sample output</span>
              <span className="rounded-full bg-white px-3 py-1">Unlock full kit</span>
            </div>
            <div className="mt-4 grid gap-3">
              {visibleFields.map((field) => (
                <label key={field.key} className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-800">
                    {field.label}
                    {variant === "compact" && !field.requiredInCompact ? (
                      <span className="font-medium text-slate-500"> optional</span>
                    ) : null}
                  </span>
                  <input
                    value={values[field.key]}
                    placeholder={field.placeholder}
                    onChange={(event) => updateValue(field.key, event.target.value)}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={generatePreview}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Generate sample kit
            </button>
            <p className="text-sm text-slate-500">
              {filledCount} of {visibleFields.length} details added
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Assembly output
          </p>
          {hasGenerated ? (
            <div className="mt-4 grid gap-4">
              <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
                <p className="text-base font-semibold text-teal-900">
                  Your sample kit is ready.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Review the sample before publishing. The full kit unlocks the
                  complete workflow modules.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                  Google Business Profile sample post
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {preview.post}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                  Short social caption
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {preview.caption}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                  Visibility checklist
                </p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                  {preview.checklist.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
              Add details to assemble a small local visibility sample. The
              output is deterministic and safe to preview locally.
            </div>
          )}

          {(!showLockedAfterGenerateOnly || hasGenerated) && (
            <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4">
              <p className="text-sm font-semibold text-teal-900">
                Unlock the full AI 온라인 영업 세팅 키트
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {[
                  "30 Google Business Profile post workflows",
                  "Review Response Pack",
                  "Website Copy Builder",
                  "Social Content Pack",
                  "Visibility Setup Checklist",
                  "30-Day Local Visibility Plan",
                  "Final Review Checklist",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href={ctaHref}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                onClick={handleUnlockClick}
                data-event="kit_unlock_click"
                data-kit-slug={kitSlug}
                data-action-location="local_business_preview_unlock"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                {ctaLabel}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
