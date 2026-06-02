"use client";

import { useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface HomeHeroKitConsoleProps {
  readonly kitSlug: string;
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
    label: "Business",
    placeholder: "dog grooming salon",
  },
  {
    key: "location",
    label: "Area",
    placeholder: "Austin",
  },
  {
    key: "offer",
    label: "Offer",
    placeholder: "summer de-shedding",
  },
];

function clean(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export default function HomeHeroKitConsole({ kitSlug }: HomeHeroKitConsoleProps) {
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

  const output = useMemo(() => {
    const businessType = clean(values.businessType, "local business");
    const location = clean(values.location, "your area");
    const offer = clean(values.offer, "your current offer");

    return {
      post: `${businessType} in ${location}: ${offer} is available this week. Message us to check current availability before booking.`,
      caption: `${offer} for ${location} customers. Confirm details before posting.`,
    };
  }, [values]);

  function updateValue(key: FieldKey, value: string) {
    if (!hasStarted.current && value.trim().length > 0) {
      hasStarted.current = true;
      trackEvent("kit_preview_started", {
        kit_slug: kitSlug,
        source_page: "homepage",
        action_location: "homepage_hero_console",
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
      action_location: "homepage_hero_console",
      preview_field_count: filledCount,
      has_preview_generated: true,
    });
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-teal-100/20 bg-slate-950 p-4 text-white shadow-sm sm:p-5">
      <div
        className="absolute left-8 right-8 top-[42%] h-px bg-gradient-to-r from-transparent via-teal-300/40 to-transparent"
        aria-hidden="true"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-100">
          Local Business AI Visibility Kit
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
          flagship
        </span>
      </div>

      <div className="relative mt-5 grid gap-4 lg:grid-cols-[0.82fr_0.56fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Input cards
          </p>
          <div className="mt-4 grid gap-3">
            {fields.map((field, index) => (
              <label
                key={field.key}
                className={`ateflo-reveal ateflo-reveal-delay-${index + 1} grid gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] p-3`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-100">
                  {field.label}
                </span>
                <input
                  value={values[field.key]}
                  placeholder={field.placeholder}
                  onChange={(event) => updateValue(field.key, event.target.value)}
                  className="min-h-10 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none transition placeholder:font-medium placeholder:text-slate-500 focus:border-teal-300 focus:ring-2 focus:ring-teal-300/20"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="relative grid min-h-52 place-items-center rounded-3xl border border-teal-300/20 bg-teal-300/10 p-4">
          <div
            className="absolute inset-4 rounded-[1.4rem] border border-teal-200/20"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={generatePreview}
            className="ateflo-factory-pulse relative grid h-24 w-24 place-items-center rounded-3xl border border-teal-200/30 bg-white text-center text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Build
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Kit output
            </p>
            <span className="rounded-full bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-100">
              {hasGenerated ? "sample ready" : "waiting"}
            </span>
          </div>

          {hasGenerated ? (
            <div className="mt-4 grid gap-3">
              <div className="ateflo-reveal rounded-2xl border border-teal-300/20 bg-teal-300/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-100">
                  GBP post
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-100">
                  {output.post}
                </p>
              </div>
              <div className="ateflo-reveal ateflo-reveal-delay-1 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Caption
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-100">
                  {output.caption}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {["GBP post", "Social caption", "Visibility checklist"].map(
                (item, index) => (
                  <div
                    key={item}
                    className={`ateflo-reveal ateflo-reveal-delay-${index + 1} rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-semibold text-slate-300`}
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Locked full kit
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["30 workflows", "Review pack", "30-day plan"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
