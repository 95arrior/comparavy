import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" aria-label="Comparavy home" className="comparavy-logo-link">
      <img
        src="/brand/comparavy-logo.png"
        alt="Comparavy"
        className="h-7 w-auto object-contain sm:h-8"
      />
    </Link>
  );
}
