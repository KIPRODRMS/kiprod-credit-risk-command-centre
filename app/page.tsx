export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">
          KIPROD Risk Management Services
        </p>

        <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
          Credit Risk Command Centre
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          Board-ready credit risk visibility, early warning monitoring, and
          management action tracking for financial institutions.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="/dashboard"
            className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950"
          >
            Open Dashboard
          </a>

          <a
            href="/portfolio-upload"
            className="rounded-full border border-slate-600 px-6 py-3 font-semibold text-white"
          >
            Upload Portfolio
          </a>
        </div>
      </section>
    </main>
  );
}