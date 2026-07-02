const cockpitModules = [
  {
    title: "Portfolio Health",
    status: "MVP Active",
    description:
      "Shows the overall portfolio position including total exposure, outstanding balance, arrears, PAR indicators, watchlist and NPL position.",
    href: "/dashboard",
  },
  {
    title: "NPL Trend",
    status: "Planned Module",
    description:
      "Tracks non-performing loan movement over time, including new NPLs, cured accounts, write-offs, restructures and trend direction.",
    href: "#",
  },
  {
    title: "Watchlist",
    status: "MVP Active",
    description:
      "Shows accounts showing deterioration before they become full NPLs, helping management act earlier.",
    href: "/early-warning",
  },
  {
    title: "Early Warning Signals",
    status: "MVP Active",
    description:
      "Highlights Amber, Red and NPL accounts using arrears behaviour and simple risk classification rules.",
    href: "/early-warning",
  },
  {
    title: "Concentration Risk",
    status: "Planned Module",
    description:
      "Identifies overexposure by employer, sector, branch, borrower group, product or large individual accounts.",
    href: "#",
  },
  {
    title: "Sector Exposure",
    status: "Planned Module",
    description:
      "Shows which economic sectors carry the largest exposure and which sectors are contributing most to arrears.",
    href: "#",
  },
  {
    title: "Branch Performance",
    status: "Planned Module",
    description:
      "Compares branches by portfolio quality, arrears, PAR movement, NPLs, watchlist accounts and recovery performance.",
    href: "#",
  },
  {
    title: "Recovery Pipeline",
    status: "Planned Module",
    description:
      "Tracks accounts through recovery stages from early follow-up to restructuring, legal escalation, write-off and cure.",
    href: "#",
  },
  {
    title: "Governance Alerts",
    status: "Planned Module",
    description:
      "Flags issues requiring leadership attention such as overdue actions, large exposure deterioration, policy exceptions and board-level risk movements.",
    href: "#",
  },
];

export default function ExecutiveDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            KIPROD Credit Risk Command Centre
          </p>

          <h1 className="text-3xl font-bold text-slate-950">
            Executive Risk Cockpit
          </h1>

          <p className="mt-3 max-w-4xl text-slate-600">
            A board and management cockpit designed to convert portfolio data
            into credit risk visibility, early warning insight, recovery
            discipline and governance oversight.
          </p>
        </div>

        <div className="mb-8 rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
            Executive Cockpit Roadmap
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            From dashboard reporting to executive risk intelligence
          </h2>

          <p className="mt-3 max-w-5xl leading-7 text-slate-300">
            The Command Centre is being developed to help CEOs, credit managers,
            risk teams, recovery teams and boards see where credit risk is
            building, what is causing it, who is responsible for action and what
            leadership should do next.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cockpitModules.map((module) => (
            <div
              key={module.title}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-950">
                  {module.title}
                </h2>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    module.status === "MVP Active"
                      ? "bg-green-200 text-green-900"
                      : "bg-amber-200 text-amber-900"
                  }`}
                >
                  {module.status}
                </span>
              </div>

              <p className="mt-4 leading-7 text-slate-600">
                {module.description}
              </p>

              {module.href === "#" ? (
                <button
                  disabled
                  className="mt-6 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-400"
                >
                  Coming in Planned Module
                </button>
              ) : (
                <a
                  href={module.href}
                  className="mt-6 inline-block rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  Open Module
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}