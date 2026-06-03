"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

interface ProductChoiceCardProps {
  readonly label: string;
  readonly title: string;
  readonly subtitle: string;
  readonly action: string;
  readonly href: string;
  readonly selectedPath: string;
  readonly kitSlug?: string;
  readonly featured?: boolean;
  readonly variant?: "standard" | "helper";
  readonly actionLocation: string;
}

export default function ProductChoiceCard({
  label,
  title,
  subtitle,
  action,
  href,
  selectedPath,
  kitSlug,
  featured = false,
  variant = "standard",
  actionLocation,
}: ProductChoiceCardProps) {
  function handleClick() {
    trackEvent("kit_category_selected", {
      selected_path: selectedPath,
      kit_slug: kitSlug,
      source_page: "homepage",
      action_location: actionLocation,
    });

    if (kitSlug === "online-sales-setup-kit") {
      trackEvent("kit_loading_started", {
        selected_path: selectedPath,
        kit_slug: kitSlug,
        source_page: "homepage",
        action_location: actionLocation,
      });
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`group flex flex-col justify-between rounded-[1.75rem] border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:p-6 ${
        variant === "standard" ? "min-h-64" : "min-h-0 sm:flex-row sm:items-center"
      } ${
        featured
          ? "border-teal-200 ring-1 ring-teal-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <span>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            featured
              ? "bg-teal-50 text-teal-800"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {label}
        </span>
        <span className="mt-5 block text-xl font-semibold leading-8 tracking-tight text-slate-950">
          {title}
        </span>
        <span
          className={`mt-3 block text-sm leading-7 text-slate-600 ${
            variant === "helper" ? "max-w-2xl" : ""
          }`}
        >
          {subtitle}
        </span>
      </span>
      <span
        className={`mt-6 inline-flex w-fit shrink-0 items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-teal-700 motion-reduce:transition-none ${
          variant === "helper" ? "sm:ml-5" : ""
        }`}
      >
        {action}
      </span>
    </Link>
  );
}
