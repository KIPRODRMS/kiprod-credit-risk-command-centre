export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            KIPROD Command Centre
          </p>
          <h1 className="text-3xl font-bold text-slate-950">
            Credit Risk Dashboard
          </h1>
          <p className="mt-2 text-slate-600">
            Portfolio visibility, early warning indicators, and board-ready risk
            summaries will appear here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Portfolio</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              KES 0
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Watchlist Accounts</p>
            <h2 className="mt-2 text-2xl font-bold text-amber-600">
              0
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">NPL Accounts</p>
            <h2 className="mt-2 text-2xl font-bold text-red-600">
              0
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Open Actions</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              0
            </h2>
          </div>
        </div>
      </section>
    </main>
  );
}