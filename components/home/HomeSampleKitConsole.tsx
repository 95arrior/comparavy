"use client";

import { useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface HomeSampleKitConsoleProps {
  readonly kitSlug: string;
  readonly ctaHref: string;
  readonly hasCheckout: boolean;
}

type FieldKey = "businessType" | "location" | "offer";
type Values = Record<FieldKey, string>;

const fields: ReadonlyArray<{
  readonly key: FieldKey;
  readonly label: string;
  readonly placeholder: string;
}> = [
  {
    key: "businessType",
    label: "Business type",
    placeholder: "Dog grooming salon",
  },
  {
    key: "location",
    label: "Location",
    placeholder: "Austin",
  },
  {
    key: "offer",
    label: "Main offer",
    placeholder: "summer de-shedding appointments",
  },
];

const lockedModules = [
  "30 Post Workflows",
  "Review Response Pack",
  "Website Copy Builder",
  "Social Content Pack",
  "Visibility Setup Checklist",
  "30-Day Plan",
] as const;

function clean(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

export default function HomeSampleKitConsole({
  kitSlug,
  ctaHref,
  hasCheckout,
}: HomeSampleKitConsoleProps) {
  const [values, setValues] = useState<Values>({
    businessType: "",
    location: "",
    offer: "",
  });
  const [hasGenerated, setHasGenerated] = useState(false);
  const hasStarted = useRef(false);

  const filledCount = useMemo(
    () => fields.filter((field) => values[field.key].trim().length > 0).length,
    [values],
  );

  const preview = useMemo(() => {
    const businessType = clean(values.businessType, "local business");
    const location = clean(values.location, "your service area");
    const offer = clean(values.offer, "your main offer");

    return {
      post: `${businessType} in ${location}: ${offer} is available this week. Message us to check current openings, and review dates, prices, and availability before publishing.`,
      caption: `${offer} for ${location} customers. Check availability and confirm the details before booking.`,
      checklist: [
        "Confirm dates, hours, prices, and availability.",
        "Add one real local detail or service note.",
        "Remove any claim the business cannot verify.",
      ],
    };
  }, [values]);

  const ctaLabel = hasCheckout ? "Get the full kit" : "Get early access";
  const external = isExternalHref(ctaHref);

  function updateValue(key: FieldKey, value: string) {
    if (!hasStarted.current && value.trim().length > 0) {
      hasStarted.current = true;
      trackEvent("kit_preview_started", {
        kit_slug: kitSlug,
        source_page: "homepage",
        action_location: "homepage_sample_console",
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
      source_page: "homepage",
      action_location: "homepage_sample_console",
      preview_field_count: filledCount,
      has_preview_generated: true,
    });
  }

  function handleUnlockClick() {
    trackEvent("kit_unlock_click", {
      kit_slug: kitSlug,
      source_page: "homepage",
      action_location: "homepage_sample_console_unlock",
      preview_field_count: filledCount,
      has_preview_generated: hasGenerated,
    });
    trackEvent(hasCheckout ? "kit_checkout_click" : "kit_interest_click", {
      kit_slug: kitSlug,
      source_page: "homepage",
      action_location: "homepage_sample_console_unlock",
      preview_field_count: filledCount,
      has_preview_generated: hasGenerated,
    });
  }

  return (
    <section
      id="build-sample-kit"
      className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[0.78fr_1.22fr]"
    >
      <div className="rounded-[2rem] border border-teal-100 bg-teal-700 p-5 text-white shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100">
          Sample kit console
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Build a sample local visibility kit.
        </h2>
        <div className="mt-6 grid gap-3">
          {fields.map((field) => (
            <label key={field.key} className="grid gap-1.5">
              <span className="text-sm font-semibold text-teal-50">
                {field.label}
              </span>
              <input
                value={values[field.key]}
                placeholder={field.placeholder}
                onChange={(event) => updateValue(field.key, event.target.value)}
                className="min-h-12 rounded-2xl border border-teal-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-white focus:ring-2 focus:ring-teal-200"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={generatePreview}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-700"
          >
            Generate sample
          </button>
          <span className="text-sm font-semibold text-teal-100">
            {filledCount} of {fields.length} details added
          </span>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Output bay
          </p>
          <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            Local template preview
          </span>
        </div>

        {hasGenerated ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="ateflo-reveal rounded-2xl border border-teal-100 bg-teal-50 p-4 lg:col-span-2">
              <p className="text-sm font-semibold text-teal-900">
                Google Business Profile post
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {preview.post}
              </p>
            </div>
            <div className="ateflo-reveal ateflo-reveal-delay-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-950">
                Social caption
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {preview.caption}
              </p>
            </div>
            <div className="ateflo-reveal ateflo-reveal-delay-2 rounded-2xl border border-slate-100 bg-white p-4 lg:col-span-3">
              <p className="text-sm font-semibold text-slate-950">
                Visibility checklist
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {preview.checklist.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-sm leading-6 text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="ateflo-reveal ateflo-reveal-delay-3 rounded-2xl border border-teal-100 bg-teal-50 p-4 lg:col-span-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-teal-900">
                    Locked full-kit modules
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {lockedModules.map((module) => (
                      <span
                        key={module}
                        className="rounded-full border border-teal-100 bg-white px-3 py-1 text-xs font-semibold text-teal-900"
                      >
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
                <a
                  href={ctaHref}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  onClick={handleUnlockClick}
                  data-event="kit_unlock_click"
                  data-kit-slug={kitSlug}
                  data-action-location="homepage_sample_console_unlock"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  {ctaLabel}
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid min-h-64 place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
            <div>
              <p className="text-lg font-semibold text-slate-950">
                Your sample kit appears here.
              </p>
              <p className="mt-2 max-w-md text-sm leading-7 text-slate-600">
                Enter three business details to generate a local post, social
                caption, and visibility checklist. Nothing is sent to an AI API.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
