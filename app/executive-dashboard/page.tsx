"use client";

import { useEffect, useMemo, useState } from "react";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";

type LoanRecord = {
  loan_amount: number;
  outstanding_balance: number;
  arrears_amount: number;
  days_in_arrears: number;
  risk_status: RiskStatus;
};

type ActionItem = {
  due_date: string;
  status: "Open" | "In Progress" | "Completed" | "Escalated";
};

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
      "Focuses management attention on Amber, Red and selected NPL accounts that require monitoring, escalation, intervention or recovery follow-up.",
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
      "Flags leadership-level concerns such as overdue actions, large exposure deterioration, policy exceptions, unresolved Board clarification requests and repeated risk deterioration.",
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

function formatKes(value: number) {
  return `KES ${value.toLocaleString("en-KE")}`;
}

export default function ExecutiveDashboardPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const savedRecords = localStorage.getItem("kiprod_loan_records");
    const savedActions = localStorage.getItem("kiprod_action_items");

    if (savedRecords) {
      try {
        const parsedRecords = JSON.parse(savedRecords);
        if (Array.isArray(parsedRecords)) {
          // Browser storage is the MVP data source for this client-only screen.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRecords(parsedRecords);
          setDataLoaded(true);
        }
      } catch {
        setRecords([]);
      }
    }

    if (savedActions) {
      try {
        const parsedActions = JSON.parse(savedActions);
        if (Array.isArray(parsedActions)) {
          setActions(parsedActions);
        }
      } catch {
        setActions([]);
      }
    }
  }, []);

  const metrics = useMemo(() => {
    const totalPortfolio = records.reduce(
      (sum, record) => sum + Number(record.loan_amount || 0),
      0
    );
    const outstandingBalance = records.reduce(
      (sum, record) => sum + Number(record.outstanding_balance || 0),
      0
    );
    const totalArrears = records.reduce(
      (sum, record) => sum + Number(record.arrears_amount || 0),
      0
    );
    const watchlistAccounts = records.filter(
      (record) => record.risk_status !== "Green"
    ).length;
    const nplAccounts = records.filter(
      (record) => record.risk_status === "NPL"
    ).length;
    const par30Records = records.filter(
      (record) => Number(record.days_in_arrears) > 30
    );
    const par90Records = records.filter(
      (record) => Number(record.days_in_arrears) > 90
    );
    const par30Balance = par30Records.reduce(
      (sum, record) => sum + Number(record.outstanding_balance || 0),
      0
    );
    const par90Balance = par90Records.reduce(
      (sum, record) => sum + Number(record.outstanding_balance || 0),
      0
    );
    const today = new Date().toISOString().slice(0, 10);
    const managementActionsDue = actions.filter(
      (action) =>
        action.status !== "Completed" &&
        Boolean(action.due_date) &&
        action.due_date <= today
    ).length;

    return {
      totalPortfolio,
      outstandingBalance,
      totalArrears,
      watchlistAccounts,
      nplAccounts,
      par30Accounts: par30Records.length,
      par90Accounts: par90Records.length,
      par30:
        outstandingBalance > 0 ? (par30Balance / outstandingBalance) * 100 : 0,
      par90:
        outstandingBalance > 0 ? (par90Balance / outstandingBalance) * 100 : 0,
      managementActionsDue,
    };
  }, [actions, records]);

  const summaryCards = [
    {
      label: "Total Portfolio",
      value: formatKes(metrics.totalPortfolio),
      tone: "text-slate-950",
    },
    {
      label: "Outstanding Balance",
      value: formatKes(metrics.outstandingBalance),
      tone: "text-slate-950",
    },
    {
      label: "Total Arrears",
      value: formatKes(metrics.totalArrears),
      tone: "text-red-600",
    },
    {
      label: "Watchlist Accounts",
      value: String(metrics.watchlistAccounts),
      tone: "text-amber-600",
    },
    {
      label: "NPL Accounts",
      value: String(metrics.nplAccounts),
      tone: "text-red-700",
    },
    {
      label: "PAR 30",
      value: `${metrics.par30.toFixed(1)}%`,
      detail: `${metrics.par30Accounts} accounts`,
      tone: "text-red-600",
    },
    {
      label: "PAR 90",
      value: `${metrics.par90.toFixed(1)}%`,
      detail: `${metrics.par90Accounts} accounts`,
      tone: "text-red-700",
    },
    {
      label: "Management Actions Due",
      value: String(metrics.managementActionsDue),
      tone: "text-amber-700",
    },
  ];

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

        <div className="mb-8">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              Current Portfolio Position
            </p>
            <h2 className="text-2xl font-bold text-slate-950">
              Executive Summary
            </h2>
          </div>

          {!dataLoaded ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="text-lg font-bold text-slate-950">
                No portfolio data uploaded yet
              </h3>
              <p className="mt-2 text-slate-700">
                Upload and validate the institution portfolio to activate live
                risk metrics, management interpretation and action monitoring.
              </p>
              <a
                href="/portfolio-upload"
                className="mt-5 inline-block rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                Upload Portfolio
              </a>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <p className="text-sm font-medium text-slate-500">
                      {card.label}
                    </p>
                    <h3
                      className={`mt-2 break-words text-2xl font-bold ${card.tone}`}
                    >
                      {card.value}
                    </h3>
                    {card.detail ? (
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {card.detail}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border-l-4 border-amber-400 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                  Management Interpretation
                </p>
                <p className="mt-3 leading-7 text-slate-700">
                  The current portfolio position shows early warning stress
                  across selected accounts. Management should prioritize Red
                  and NPL accounts, review risky employers and branches, and
                  ensure all overdue actions are assigned in the Execution
                  Tracker.
                </p>
              </div>
            </>
          )}
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
