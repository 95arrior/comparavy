import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" aria-label="Comparavy home" className="comparavy-logo-link">
      <span className="comparavy-wordmark">
        <span className="comparavy-wordmark__base">Compara</span>
        <span className="comparavy-logo-accent">vy</span>
      </span>
    </Link>
  );
}
