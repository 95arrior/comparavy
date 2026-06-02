import Link from "next/link";
import KitCard from "@/components/kits/KitCard";
import { getKits } from "@/data/kits";

export default function HomeKitsSection() {
  const kits = getKits();

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-teal-700">AteFlo Kits</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Complete AI workflows for high-value tasks.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              AteFlo kits are complete AI workflows for people who need the
              result, not another vague prompt.
            </p>
          </div>
          <Link
            href="/kits"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Explore kits
          </Link>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {kits.map((kit) => (
            <KitCard key={kit.slug} kit={kit} sourcePage="homepage" compact />
          ))}
        </div>
      </div>
    </section>
  );
}
