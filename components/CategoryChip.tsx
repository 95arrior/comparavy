type CategoryIcon =
  | "briefcase"
  | "check"
  | "layers"
  | "megaphone"
  | "pen"
  | "shopping"
  | "sparkles"
  | "store"
  | "study"
  | "tag"
  | "zap";

interface CategoryChipProps {
  readonly label: string;
  readonly className?: string;
}

function iconForCategory(label: string): CategoryIcon {
  const normalized = label.toLowerCase().replace(/[-_]/g, " ");

  if (normalized.includes("selling") || normalized.includes("ecommerce")) {
    return "shopping";
  }

  if (normalized.includes("shop")) {
    return "tag";
  }

  if (normalized.includes("study") || normalized.includes("education")) {
    return "study";
  }

  if (normalized.includes("marketing")) {
    return "megaphone";
  }

  if (normalized.includes("small business") || normalized.includes("business")) {
    return "store";
  }

  if (normalized.includes("productivity")) {
    return "zap";
  }

  if (normalized.includes("content")) {
    return "pen";
  }

  if (normalized.includes("work")) {
    return "briefcase";
  }

  return "sparkles";
}

function Icon({ icon }: { readonly icon: CategoryIcon }) {
  switch (icon) {
    case "briefcase":
      return (
        <>
          <path d="M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
          <path d="M5 8h14v10H5z" />
          <path d="M5 12h14" />
        </>
      );
    case "check":
      return (
        <>
          <circle cx="12" cy="12" r="7" />
          <path d="m8.8 12.2 2 2 4.4-4.6" />
        </>
      );
    case "layers":
      return (
        <>
          <path d="m12 4 8 4-8 4-8-4 8-4Z" />
          <path d="m4 12 8 4 8-4" />
          <path d="m4 16 8 4 8-4" />
        </>
      );
    case "megaphone":
      return (
        <>
          <path d="M4 13h3l9 4V7l-9 4H4v2Z" />
          <path d="M7 13v4" />
          <path d="M18 9.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5" />
        </>
      );
    case "pen":
      return (
        <>
          <path d="m5 19 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L5 19Z" />
          <path d="m14 7 3 3" />
        </>
      );
    case "shopping":
      return (
        <>
          <path d="M6 8h12l-1 11H7L6 8Z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </>
      );
    case "store":
      return (
        <>
          <path d="M5 10h14l-1.2-5H6.2L5 10Z" />
          <path d="M7 10v9h10v-9" />
          <path d="M10 19v-5h4v5" />
        </>
      );
    case "study":
      return (
        <>
          <path d="M5 5h6a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H5V5Z" />
          <path d="M19 5h-5a3 3 0 0 0-3 3" />
          <path d="M14 16h5V5" />
        </>
      );
    case "tag":
      return (
        <>
          <path d="M4 11V5h6l9 9-6 6-9-9Z" />
          <path d="M8 8h.01" />
        </>
      );
    case "zap":
      return <path d="m13 3-8 10h6l-1 8 9-11h-6l1-7Z" />;
    case "sparkles":
    default:
      return (
        <>
          <path d="M12 3 10.4 8.4 5 10l5.4 1.6L12 17l1.6-5.4L19 10l-5.4-1.6L12 3Z" />
          <path d="m18 15-.7 2.3L15 18l2.3.7L18 21l.7-2.3L21 18l-2.3-.7L18 15Z" />
        </>
      );
  }
}

export default function CategoryChip({ label, className }: CategoryChipProps) {
  const icon = iconForCategory(label);

  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-teal-100 bg-teal-50/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-teal-800 ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        aria-hidden="true"
      >
        <Icon icon={icon} />
      </svg>
      <span className="truncate">{label}</span>
    </span>
  );
}
