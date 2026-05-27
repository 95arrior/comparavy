import { tools } from "@/data/tools";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-16 sm:px-10">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white px-7 py-12 shadow-sm sm:px-12">
        <p className="mb-5 text-sm font-medium tracking-wide text-teal-700">
          COMPARAVY
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Find the right AI tool for your exact workflow in 60 seconds.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
          The recommendation database is being prepared for a simple,
          trustworthy decision flow.
        </p>
        <div className="mt-10 inline-flex items-center rounded-full bg-slate-50 px-5 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
          {tools.length} tool profiles ready for recommendation logic
        </div>
      </section>
    </main>
  );
}
