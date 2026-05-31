import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

interface LogoProps {
  readonly variant?: "header" | "footer";
}

export default function Logo({ variant = "header" }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label={`${SITE_NAME} home`}
      className="ateflo-logo-link"
      data-logo-variant={variant}
    >
      <img
        src="/ateflo-logo.svg"
        alt={SITE_NAME}
        width="393"
        height="147"
        className="ateflo-logo-image"
      />
    </Link>
  );
}
