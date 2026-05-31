import Link from "next/link";

type ActionTone = "primary" | "secondary";

export interface ActionLinkItem {
  readonly href: string;
  readonly label: string;
  readonly external?: boolean;
  readonly tone?: ActionTone;
  readonly rel?: string;
}

interface ActionLinksProps {
  readonly items: readonly ActionLinkItem[];
  readonly className?: string;
}

const BASE_CLASSES =
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-center text-sm font-semibold transition duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2";

const TONE_CLASSES: Record<ActionTone, string> = {
  primary: "bg-teal-700 text-white hover:bg-teal-800",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50",
};

export default function ActionLinks({ items, className }: ActionLinksProps) {
  return (
    <div className={`flex flex-wrap gap-3 ${className ?? ""}`}>
      {items.map((item) => {
        const classes = `${BASE_CLASSES} ${TONE_CLASSES[item.tone ?? "secondary"]}`;

        if (item.external) {
          return (
            <a
              key={`${item.href}-${item.label}`}
              href={item.href}
              target="_blank"
              rel={item.rel ?? "noopener noreferrer"}
              className={classes}
            >
              {item.label}
            </a>
          );
        }

        return (
          <Link key={`${item.href}-${item.label}`} href={item.href} className={classes}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
