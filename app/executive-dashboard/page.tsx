const activeModules = [
  {
    title: "Portfolio Health",
    status: "MVP Active",
    description:
      "A consolidated view of portfolio exposure, outstanding balance, arrears, PAR indicators, watchlist movement and NPL position.",
    href: "/dashboard",
  },
  {
    title: "Early Warning Signals",
    status: "MVP Active",
    description:
      "Highlights early deterioration patterns using Amber, Red and NPL classifications so management can act before risk deepens.",
    href: "/early-warning",
  },
  {
    title: "Watchlist",
    status: "MVP Active",
    description:
      "Focuses management attention on Amber and Red accounts that require monitoring, escalation or early intervention.",
    href: "/watchlist",
  },
  {
    title: "Board Report",
    status: "MVP Active",
    description:
      "Converts uploaded portfolio data into a board-ready credit risk summary with key risk indicators and management recommendations.",
    href: "/board-pack",
  },
  {
    title: "Execution Tracker",
    status: "MVP Active",
    description:
      "Turns identified risks into assigned actions, responsible officers, due dates, follow-up notes and execution status.",
    href: "/action-tracker",
  },
];

const plannedModules = [
  {
    title: "NPL Trend",
    status: "Phase 3 Planned",
    description:
      "Tracks non-performing loan movement over time, including new NPLs, cured accounts, restructures, write-offs and trend direction.",
  },
  {
    title: "Concentration Risk",
    status: "Phase 3 Planned",
    description:
      "Identifies overexposure by employer, product, sector, branch, borrower group or large individual accounts.",
  },
  {
    title: "Sector Exposure",
    status: "Phase 3 Planned",
    description:
      "Shows which economic sectors carry the largest exposure and which sectors are contributing most to arrears or stress.",
  },
  {
    title: "Branch Performance",
    status: "Phase 4 Planned",
    description:
      "Compares branches by portfolio quality, arrears, PAR movement, NPL position, watchlist accounts and recovery follow-up.",
  },
  {
    title: "Recovery Pipeline",
    status: "Phase 4 Planned",
    description:
      "Tracks accounts through recovery stages from early follow-up to restructuring, legal escalation, write-off recommendation and cure.",
  },
  {
    title: "Governance Alerts",
    status: "AI Layer Later",
    description:
      "Flags leadership-level concerns such as overdue actions, large exposure deterioration, policy exceptions and board-level risk movements.",
  },
];

function statusClass(status: string) {
  if (status === "MVP Active") {
    return "bg-green-200 text-green-900";
  }

  if (status === "Phase 3 Planned") {
    return "bg-amber-200 text-amber-900";
  }

  if (status === "Phase 4 Planned") {
    return "bg-blue-200 text-blue-900";
  }

  return "bg-purple-200 text-purple-900";
}

export default function ExecutiveDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            KIPROD Credit Risk Command Centre
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Executive Risk Cockpit
          </h1>

          <h2 className="mt-4 text-2xl font-semibold text-slate-100">
            From dashboard reporting to executive risk intelligence
          </h2>

          <p className="mt-5 max-w-5xl leading-8 text-slate-300">
            The Executive Cockpit is the central control room for portfolio
            visibility, early warning insight, board reporting and management
            execution. It gives senior management, credit teams, risk teams,
            recovery teams and board-facing users one structured view of what is
            active now and what intelligence layers are planned next.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active MVP Modules</p>
            <h3 className="mt-2 text-3xl font-bold text-slate-950">
              {activeModules.length}
            </h3>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Planned Modules</p>
            <h3 className="mt-2 text-3xl font-bold text-amber-600">
              {plannedModules.length}
            </h3>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Core Workflow</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              Upload → Insight → Action
            </h3>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Next Priority</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              Portfolio Upload Logic
            </h3>
          </div>
        </div>

        <div className="mb-10">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Active Control Room
            </p>

            <h2 className="text-2xl font-bold text-slate-950">
              MVP Active Modules
            </h2>

            <p className="mt-2 max-w-4xl text-slate-600">
              These modules form the current working cockpit and support the
              Phase 1 user journey from uploaded portfolio data to executive
              visibility, board reporting and management execution.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeModules.map((module) => (
              <div
                key={module.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold text-slate-950">
                    {module.title}
                  </h3>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                      module.status
                    )}`}
                  >
                    {module.status}
                  </span>
                </div>

                <p className="mt-4 leading-7 text-slate-600">
                  {module.description}
                </p>

                <a
                  href={module.href}
                  className="mt-6 inline-block rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  Open Module
                </a>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              Roadmap Intelligence Layer
            </p>

            <h2 className="text-2xl font-bold text-slate-950">
              Planned Modules
            </h2>

            <p className="mt-2 max-w-4xl text-slate-600">
              These modules extend the platform from current MVP visibility into
              deeper portfolio analytics, institutional performance monitoring
              and governance-level intelligence.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plannedModules.map((module) => (
              <div
                key={module.title}
                className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold text-slate-950">
                    {module.title}
                  </h3>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                      module.status
                    )}`}
                  >
                    {module.status}
                  </span>
                </div>

                <p className="mt-4 leading-7 text-slate-600">
                  {module.description}
                </p>

                <button
                  disabled
                  className="mt-6 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-400"
                >
                  Planned Module
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}