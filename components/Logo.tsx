import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" aria-label="Comparavy home" className="comparavy-logo-link">
      <span className="comparavy-wordmark" data-text="COMPARAVY">
        COMPARAVY
      </span>
    </Link>
  );
}
