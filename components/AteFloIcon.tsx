import type { SVGProps } from "react";

export type AteFloIconName =
  | "work"
  | "productivity"
  | "marketing"
  | "selling-online"
  | "ecommerce"
  | "study"
  | "content"
  | "small-business"
  | "fast"
  | "beginner"
  | "team"
  | "documents"
  | "creative"
  | "structured"
  | "meetings"
  | "writing"
  | "search"
  | "copy"
  | "close"
  | "open"
  | "sparkle"
  | "fallback";

interface AteFloIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  readonly name: AteFloIconName;
}

const ICON_PATHS: Record<AteFloIconName, readonly string[]> = {
  work: [
    "M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2ZM10 4h4v2h-4V4Zm10 14H4v-5h6v2h4v-2h6v5Zm0-7h-6V9h-4v2H4V8h16v3Z",
  ],
  productivity: [
    "M12 2a10 10 0 1 0 .01 0H12Zm-1 14.41-3.71-3.7 1.42-1.42L11 13.59l4.79-4.8 1.42 1.42L11 16.41Z",
  ],
  marketing: [
    "M20 6h-2.18A3 3 0 0 0 15 4H5a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h1v3a1 1 0 0 0 1.55.83L13.3 17H15a3 3 0 0 0 2.82-2H20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-5 9h-2.3L8 18.13V15H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1Zm5-2h-2V8h2v5Z",
  ],
  "selling-online": [
    "M20 6h-3.17A5 5 0 0 0 7.17 6H4a2 2 0 0 0-2 2v11a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V8a2 2 0 0 0-2-2Zm-8-2a3 3 0 0 1 2.82 2H9.18A3 3 0 0 1 12 4Zm8 15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8h3v3h2V8h6v3h2V8h3v11Z",
  ],
  ecommerce: [
    "M20.59 13.41 11.17 4H4v7.17l9.41 9.42a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83ZM14.83 19 6 10.17V6h4.17L19 14.83 14.83 19Z",
    "M8.5 8A1.5 1.5 0 1 0 10 9.5 1.5 1.5 0 0 0 8.5 8Z",
  ],
  study: [
    "M21 4.5A3.5 3.5 0 0 0 17.5 1H14a4 4 0 0 0-3 1.35A4 4 0 0 0 8 1H4.5A3.5 3.5 0 0 0 1 4.5V20h8a3 3 0 0 1 3 3 3 3 0 0 1 3-3h8V4.5ZM11 18.53A5 5 0 0 0 9 18H3V4.5A1.5 1.5 0 0 1 4.5 3H8a3 3 0 0 1 3 3v12.53ZM21 18h-6a5 5 0 0 0-2 .53V6a3 3 0 0 1 3-3h1.5A1.5 1.5 0 0 1 19 4.5V18Z",
  ],
  content: [
    "m19.71 8.04-3.75-3.75a1 1 0 0 0-1.42 0L4 14.83V20h5.17L19.71 9.46a1 1 0 0 0 0-1.42ZM8.34 18H6v-2.34l9.25-9.25 2.34 2.34L8.34 18Z",
  ],
  "small-business": [
    "M21 8.5 19.5 3h-15L3 8.5V10a3 3 0 0 0 1 2.24V21h16v-8.76A3 3 0 0 0 21 10V8.5ZM6.03 5h11.94l.81 3H5.22l.81-3ZM8 10a1 1 0 0 1-2 0H4.99h2H8Zm5 9h-2v-4h2v4Zm5 0h-3v-6H9v6H6v-6.17A3.04 3.04 0 0 0 7 13a2.98 2.98 0 0 0 2-.78 2.98 2.98 0 0 0 4 0 2.98 2.98 0 0 0 4 0 3.04 3.04 0 0 0 1 .61V19Zm-3-9a1 1 0 0 1-2 0h2Zm-4 0a1 1 0 0 1-2 0h2Zm7 0a1 1 0 0 1-2 0h2Z",
  ],
  fast: [
    "m13 2-8 12h6l-2 8 10-13h-6l2-7h-2Z",
  ],
  beginner: [
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-3.5 7A1.5 1.5 0 1 1 10 7.5 1.5 1.5 0 0 1 8.5 9Zm7 0A1.5 1.5 0 1 1 17 7.5 1.5 1.5 0 0 1 15.5 9ZM12 18a5.5 5.5 0 0 1-5-3.2l1.83-.8a3.5 3.5 0 0 0 6.34 0l1.83.8A5.5 5.5 0 0 1 12 18Z",
  ],
  team: [
    "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-6 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm2 5c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4Zm-3.48 3c.68-.59 1.91-1 3.48-1s2.8.41 3.48 1H8.52ZM17.5 13a3.5 3.5 0 0 0 0-7v2a1.5 1.5 0 0 1 0 3v2ZM20.5 15H18v2h2.5c.86 0 1.6.33 2.05.75H20v2h4v-1c0-2.21-1.57-4-3.5-4ZM6.5 13v-2a1.5 1.5 0 0 1 0-3V6a3.5 3.5 0 0 0 0 7ZM4 17h2v-2H3.5C1.57 15 0 16.79 0 19v1h4v-2H1.45c.45-.42 1.19-.75 2.05-.75H4Z",
  ],
  documents: [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 3.41L16.59 8H14V5.41ZM6 20V4h6v6h6v10H6Z",
    "M8 12h8v2H8zm0 4h8v2H8z",
  ],
  creative: [
    "M12 3a9 9 0 0 0-9 9 7 7 0 0 0 7 7h1.5a1.5 1.5 0 0 0 0-3H10a1 1 0 0 1 0-2h2.5A8.5 8.5 0 0 0 21 5.5 2.5 2.5 0 0 0 18.5 3H12Zm0 2h6.5a.5.5 0 0 1 .5.5A6.5 6.5 0 0 1 12.5 12H10a3 3 0 0 0 0 6h.5A5 5 0 0 1 5 12a7 7 0 0 1 7-7Z",
    "M7.5 11A1.5 1.5 0 1 0 9 9.5 1.5 1.5 0 0 0 7.5 11Zm3-3A1.5 1.5 0 1 0 12 6.5 1.5 1.5 0 0 0 10.5 8Zm-6 0A1.5 1.5 0 1 0 6 6.5 1.5 1.5 0 0 0 4.5 8Z",
  ],
  structured: [
    "M4 5h2v2H4V5Zm4 0h12v2H8V5ZM4 11h2v2H4v-2Zm4 0h12v2H8v-2ZM4 17h2v2H4v-2Zm4 0h12v2H8v-2Z",
  ],
  meetings: [
    "M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 18H5V10h14v10ZM5 8V6h14v2H5Z",
    "M8 12h3v3H8z",
  ],
  writing: [
    "M19.59 5.59 18.41 4.4a2 2 0 0 0-2.82 0L5 15v4h4L19.59 8.41a2 2 0 0 0 0-2.82ZM8.17 17H7v-1.17l8.5-8.5 1.17 1.17L8.17 17ZM18 7.17 16.83 6 17 5.83 18.17 7 18 7.17Z",
  ],
  search: [
    "M10 18a8 8 0 1 1 5.29-2l4.36 4.36-1.41 1.41-4.36-4.36A7.96 7.96 0 0 1 10 18Zm0-14a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z",
  ],
  copy: [
    "M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z",
  ],
  close: [
    "m6.4 5-1.4 1.4 5.6 5.6-5.6 5.6 1.4 1.4 5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6 5.6-5.6L17.6 5 12 10.6 6.4 5Z",
  ],
  open: [
    "M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7Z",
    "M19 19H5V5h6V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6h-2v6Z",
  ],
  sparkle: [
    "M11 2h2l1.56 5.44L20 9v2l-5.44 1.56L13 18h-2l-1.56-5.44L4 11V9l5.44-1.56L11 2Zm1 4.12-.77 2.7-.17.58-.58.17-2.7.77 2.7.77.58.17.17.58.77 2.7.77-2.7.17-.58.58-.17 2.7-.77-2.7-.77-.58-.17-.17-.58L12 6.12ZM19 16h1l.78 2.22L23 19v1l-2.22.78L20 23h-1l-.78-2.22L16 20v-1l2.22-.78L19 16Z",
  ],
  fallback: [
    "M11 2h2l1.56 5.44L20 9v2l-5.44 1.56L13 18h-2l-1.56-5.44L4 11V9l5.44-1.56L11 2Zm1 4.12-.77 2.7-.17.58-.58.17-2.7.77 2.7.77.58.17.17.58.77 2.7.77-2.7.17-.58.58-.17 2.7-.77-2.7-.77-.58-.17-.17-.58L12 6.12Z",
  ],
};

export function getCategoryIconName(label: string): AteFloIconName {
  const normalized = label.toLowerCase().replace(/[-_]/g, " ");

  if (normalized.includes("selling")) {
    return "selling-online";
  }

  if (normalized.includes("ecommerce") || normalized.includes("shop")) {
    return "ecommerce";
  }

  if (normalized.includes("study") || normalized.includes("education")) {
    return "study";
  }

  if (normalized.includes("marketing") || normalized.includes("social")) {
    return "marketing";
  }

  if (normalized.includes("small business") || normalized.includes("business")) {
    return "small-business";
  }

  if (normalized.includes("productivity")) {
    return "productivity";
  }

  if (normalized.includes("content")) {
    return "content";
  }

  if (normalized.includes("work")) {
    return "work";
  }

  return "sparkle";
}

export function getTagIconName(tag: string): AteFloIconName {
  const normalized = tag.toLowerCase();

  if (normalized.startsWith("+")) {
    return "sparkle";
  }

  if (
    normalized.includes("fast") ||
    normalized.includes("speed") ||
    normalized.includes("clip") ||
    normalized.includes("automation")
  ) {
    return "fast";
  }

  if (
    normalized.includes("beginner") ||
    normalized.includes("easy") ||
    normalized.includes("simple")
  ) {
    return "beginner";
  }

  if (normalized.includes("team") || normalized.includes("collaboration")) {
    return "team";
  }

  if (normalized.includes("meeting")) {
    return "meetings";
  }

  if (
    normalized.includes("document") ||
    normalized.includes("file") ||
    normalized.includes("pdf") ||
    normalized.includes("research") ||
    normalized.includes("citation") ||
    normalized.includes("source") ||
    normalized.includes("note") ||
    normalized.includes("knowledge") ||
    normalized.includes("analysis")
  ) {
    return "documents";
  }

  if (
    normalized.includes("design") ||
    normalized.includes("image") ||
    normalized.includes("creative") ||
    normalized.includes("video") ||
    normalized.includes("template") ||
    normalized.includes("presentation") ||
    normalized.includes("brainstorm") ||
    normalized.includes("generation") ||
    normalized.includes("motion")
  ) {
    return "creative";
  }

  if (
    normalized.includes("writing") ||
    normalized.includes("copy") ||
    normalized.includes("content") ||
    normalized.includes("editing") ||
    normalized.includes("tone") ||
    normalized.includes("email")
  ) {
    return "writing";
  }

  if (
    normalized.includes("structured") ||
    normalized.includes("workflow") ||
    normalized.includes("comparison")
  ) {
    return "structured";
  }

  if (
    normalized.includes("productivity") ||
    normalized.includes("task") ||
    normalized.includes("workspace") ||
    normalized.includes("chat")
  ) {
    return "productivity";
  }

  if (
    normalized.includes("marketing") ||
    normalized.includes("campaign") ||
    normalized.includes("sales") ||
    normalized.includes("social")
  ) {
    return "marketing";
  }

  if (normalized.includes("search")) {
    return "search";
  }

  return "sparkle";
}

export default function AteFloIcon({
  name,
  className,
  ...props
}: AteFloIconProps) {
  const paths = ICON_PATHS[name] ?? ICON_PATHS.fallback;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className ?? "h-4 w-4"}
      fill="currentColor"
      focusable="false"
      {...props}
    >
      {paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
