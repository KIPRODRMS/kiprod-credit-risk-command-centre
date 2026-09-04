"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";
type LoanRecord = {
  member_name: string;
  member_number?: string;
  loan_account: string;
  loan_product?: string;
  branch?: string;
  employer?: string;
  sector?: string;
  loan_amount?: number;
  outstanding_balance: number;
  arrears_amount?: number;
  days_in_arrears?: number;
  responsible_officer?: string;
  restructured?: string;
  risk_status: RiskStatus;
  risk_flags?: string[];
};
type ActionItem = {
  action_id?: string;
  loan_account: string;
  member_name: string;
  action_required?: string;
  assigned_to?: string;
  due_date?: string;
  status?: string;
  escalation_level?: string;
  board_visible?: boolean;
  notes?: string;
};
type InstitutionProfile = {
  institutionName?: string;
  institutionType?: string;
  reportingMonth?: string;
  reportingCurrency?: string;
  riskLead?: string;
  creditManager?: string;
  recoveryLead?: string;
  boardChair?: string;
};
type ClarificationRequest = { status?: string };

const blankProfile: InstitutionProfile = {};

function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

function isClosed(action: ActionItem) {
  return ["closed", "completed", "done"].includes(
    String(action.status || "").toLowerCase()
  );
}

function isOverdue(action: ActionItem) {
  if (!action.due_date || isClosed(action)) return false;
  return new Date(`${action.due_date}T23:59:59`).getTime() < Date.now();
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("en-KE", {
    maximumFractionDigits: 0,
  })}`;
}

function groupExposure(records: LoanRecord[], key: keyof LoanRecord) {
  const groups = new Map<string, { accounts: number; exposure: number }>();
  records.forEach((record) => {
    const name = String(record[key] || "Not provided");
    const current = groups.get(name) || { accounts: 0, exposure: 0 };
    groups.set(name, {
      accounts: current.accounts + 1,
      exposure: current.exposure + Number(record.outstanding_balance || 0),
    });
  });
  return [...groups.entries()]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 5);
}

function badge(status: RiskStatus) {
  if (status === "Green") return "bg-emerald-100 text-emerald-800";
  if (status === "Amber") return "bg-amber-100 text-amber-900";
  if (status === "Red") return "bg-red-100 text-red-800";
  return "bg-red-700 text-white";
}

export default function BoardPackPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [profile, setProfile] = useState<InstitutionProfile>(blankProfile);
  const [clarifications, setClarifications] = useState<ClarificationRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    const storedRecords = readStored<LoanRecord[]>("kiprod_loan_records", []);
    const storedActions = readStored<ActionItem[]>("kiprod_action_items", []);
    const storedProfile = readStored<InstitutionProfile>(
      "kiprodInstitutionProfile",
      blankProfile
    );
    const storedClarifications = readStored<ClarificationRequest[]>(
      "kiprodClarificationRequests",
      []
    );
    queueMicrotask(() => {
      if (cancelled) return;
      setRecords(storedRecords);
      setActions(storedActions);
      setProfile(storedProfile);
      setClarifications(storedClarifications);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const report = useMemo(() => {
    const totalPortfolio = records.reduce(
      (sum, row) => sum + Number(row.loan_amount || 0),
      0
    );
    const outstanding = records.reduce(
      (sum, row) => sum + Number(row.outstanding_balance || 0),
      0
    );
    const arrears = records.reduce(
      (sum, row) => sum + Number(row.arrears_amount || 0),
      0
    );
    const byRisk = (risk: RiskStatus) =>
      records.filter((row) => row.risk_status === risk);
    const npl = byRisk("NPL");
    const par30 = records.filter((row) => Number(row.days_in_arrears || 0) > 30);
    const par90 = records.filter((row) => Number(row.days_in_arrears || 0) > 90);
    const watchlist = records.filter(
      (row) =>
        row.risk_status !== "Green" ||
        row.restructured?.toLowerCase() === "yes" ||
        (row.risk_flags || []).includes("High Exposure")
    );
    const openActions = actions.filter((action) => !isClosed(action));
    const overdueActions = actions.filter(isOverdue);
    const escalatedActions = actions.filter(
      (action) =>
        String(action.status).toLowerCase() === "escalated" ||
        String(action.escalation_level).includes("Level 3") ||
        String(action.escalation_level).includes("Level 4")
    );
    const highExposure = records
      .filter((row) => (row.risk_flags || []).includes("High Exposure"))
      .sort((a, b) => b.outstanding_balance - a.outstanding_balance);
    const openClarifications = clarifications.filter(
      (item) => String(item.status).toLowerCase() !== "closed"
    );

    return {
      totalPortfolio,
      outstanding,
      arrears,
      green: byRisk("Green"),
      amber: byRisk("Amber"),
      red: byRisk("Red"),
      npl,
      nplValue: npl.reduce((sum, row) => sum + row.outstanding_balance, 0),
      nplRatio: outstanding
        ? (npl.reduce((sum, row) => sum + row.outstanding_balance, 0) /
            outstanding) *
          100
        : 0,
      par30,
      par90,
      par30Value: par30.reduce((sum, row) => sum + row.outstanding_balance, 0),
      par90Value: par90.reduce((sum, row) => sum + row.outstanding_balance, 0),
      watchlist,
      openActions,
      overdueActions,
      escalatedActions,
      closedActions: actions.filter(isClosed),
      dueThisWeek: openActions.filter((action) => {
        if (!action.due_date) return false;
        const due = new Date(`${action.due_date}T23:59:59`);
        const week = new Date();
        week.setDate(week.getDate() + 7);
        return due >= new Date() && due <= week;
      }),
      highExposure,
      openClarifications,
      branches: groupExposure(watchlist, "branch"),
      employers: groupExposure(watchlist, "employer"),
      sectors: groupExposure(watchlist, "sector"),
      products: groupExposure(watchlist, "loan_product"),
    };
  }, [records, actions, clarifications]);

  const currency = profile.reportingCurrency || "KES";
  const metric = (label: string, value: string | number, tone = "text-slate-950") => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );

  const concentration = (
    title: string,
    rows: ReturnType<typeof groupExposure>
  ) => (
    <div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.name} className="flex justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{row.name}</span>
            <span className="whitespace-nowrap font-semibold text-slate-950">
              {row.accounts} · {formatMoney(row.exposure, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white md:p-6">
      <section className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col justify-between gap-4 print:mb-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              Board Credit Risk Pack
            </p>
            <h1 className="text-3xl font-bold text-slate-950">
              Monthly Credit Risk Board Summary
            </h1>
            <p className="mt-2 text-slate-600">
              Auto-generated governance summary from institution, portfolio,
              watchlist and management-action data.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white print:hidden"
          >
            Print / Save as PDF
          </button>
        </header>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              No portfolio data available
            </h2>
            <p className="mt-2 text-slate-600">
              Upload portfolio data first, then return here to generate the
              board pack.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              The Board Report is generated only after institution profile and
              portfolio data have been completed.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link className="rounded-full border px-5 py-3 font-semibold" href="/institution-profile">
                Complete Institution Profile
              </Link>
              <Link className="rounded-full bg-amber-400 px-5 py-3 font-semibold text-slate-950" href="/portfolio-upload">
                Upload Portfolio
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                1. Institution and Reporting Context
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Institution", profile.institutionName || "Not completed"],
                  ["Institution Type", profile.institutionType || "Not completed"],
                  ["Reporting Month", profile.reportingMonth || "Not completed"],
                  ["Reporting Currency", currency],
                  ["Risk Lead", profile.riskLead || "Not assigned"],
                  ["Credit Manager", profile.creditManager || "Not assigned"],
                  ["Recovery Lead", profile.recoveryLead || "Not assigned"],
                  ["Board Chair / Risk Lead", profile.boardChair || "Not assigned"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                2. Executive Credit Risk Summary
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {metric("Total Portfolio", formatMoney(report.totalPortfolio, currency))}
                {metric("Outstanding Balance", formatMoney(report.outstanding, currency))}
                {metric("Total Arrears", formatMoney(report.arrears, currency), "text-red-600")}
                {metric("NPL Value", formatMoney(report.nplValue, currency), "text-red-700")}
                {metric("NPL Accounts", report.npl.length, "text-red-700")}
                {metric("PAR 30", `${report.par30.length} accounts`, "text-red-600")}
                {metric("PAR 90", `${report.par90.length} accounts`, "text-red-700")}
                {metric("Watchlist Accounts", report.watchlist.length, "text-amber-700")}
                {metric("Open Actions", report.openActions.length)}
                {metric("Overdue Actions", report.overdueActions.length, "text-red-700")}
              </div>
              <p className="mt-5 leading-7 text-slate-700">
                The portfolio has <strong>{report.watchlist.length}</strong>{" "}
                accounts requiring management attention, including{" "}
                <strong>{report.red.length} Red</strong> and{" "}
                <strong>{report.npl.length} NPL</strong> accounts. Management has{" "}
                <strong>{report.openActions.length} open actions</strong>, of
                which <strong>{report.overdueActions.length}</strong> are
                overdue. Board attention should remain focused on material NPL
                exposure, unresolved high-exposure accounts and overdue
                escalations.
              </p>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">3. Portfolio Health Overview</h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {metric("Green Accounts", report.green.length, "text-emerald-700")}
                  {metric("Amber Accounts", report.amber.length, "text-amber-700")}
                  {metric("Red Accounts", report.red.length, "text-red-600")}
                  {metric("NPL Accounts", report.npl.length, "text-red-700")}
                  {metric("Portfolio at Risk", formatMoney(report.arrears, currency))}
                  {metric(
                    "Portfolio at Risk Ratio",
                    `${report.outstanding ? ((report.arrears / report.outstanding) * 100).toFixed(1) : "0.0"}%`
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  4. Early Warning and Watchlist Summary
                </h2>
                <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                  <li><strong>{report.amber.length} Amber:</strong> immediate monitoring and borrower follow-up.</li>
                  <li><strong>{report.red.length} Red:</strong> escalation and structured intervention.</li>
                  <li><strong>{report.npl.length} NPL:</strong> recovery attention and material-account visibility.</li>
                  <li><strong>{records.filter((r) => r.restructured?.toLowerCase() === "yes").length} restructured:</strong> performance against revised terms requires review.</li>
                  <li><strong>{report.highExposure.length} high exposure:</strong> senior management visibility required.</li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">5. NPL and PAR Position</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {metric("NPL Value", formatMoney(report.nplValue, currency), "text-red-700")}
                {metric("NPL Ratio", `${report.nplRatio.toFixed(1)}%`, "text-red-700")}
                {metric("PAR 30 Position", formatMoney(report.par30Value, currency))}
                {metric("PAR 90 Position", formatMoney(report.par90Value, currency))}
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Month-on-month NPL movement will activate once historical
                reporting-period data is available.
              </p>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">6. Key Risk Concentrations</h2>
              <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {concentration("Branches", report.branches)}
                {concentration("Employers", report.employers)}
                {concentration("Sectors", report.sectors)}
                {concentration("Loan Products", report.products)}
              </div>
              {report.highExposure.length > 0 && (
                <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                  <strong>High Exposure:</strong> {report.highExposure.length}{" "}
                  accounts are flagged among the highest outstanding balances
                  and require senior visibility.
                </p>
              )}
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                7. Management Actions and Accountability
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {metric("Total Actions", actions.length)}
                {metric("Open", report.openActions.length)}
                {metric("Overdue", report.overdueActions.length, "text-red-700")}
                {metric("Escalated", report.escalatedActions.length, "text-amber-700")}
                {metric("Closed", report.closedActions.length, "text-emerald-700")}
                {metric("Due This Week", report.dueThisWeek.length)}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border-l-4 border-red-600 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  8. Matters Requiring Board Attention
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {report.nplValue > 0 && <li>Material NPL exposure of <strong>{formatMoney(report.nplValue, currency)}</strong> requires recovery oversight.</li>}
                  {report.overdueActions.length > 0 && <li><strong>{report.overdueActions.length}</strong> management actions are overdue and remain unresolved.</li>}
                  {report.highExposure.length > 0 && <li><strong>{report.highExposure.length}</strong> high-exposure accounts require senior visibility.</li>}
                  {report.openClarifications.length > 0 && <li><strong>{report.openClarifications.length}</strong> clarification requests remain unresolved.</li>}
                  {report.nplValue === 0 && report.overdueActions.length === 0 && report.highExposure.length === 0 && report.openClarifications.length === 0 && <li>No material matters currently meet the Board-attention triggers.</li>}
                </ul>
              </div>
              <div className="rounded-2xl border-l-4 border-amber-400 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  9. Recommended Board Decisions / Guidance
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  <li>The Board may wish to seek management clarification on overdue high-risk actions.</li>
                  <li>The Board may request a recovery update on material NPL accounts.</li>
                  <li>The Board may require management to present a 30-day corrective action plan for deteriorating portfolio areas.</li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                10. Appendix: Detailed Risk Register
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Account-level detail is retained here so the main report remains
                governance-level.
              </p>
              <div className="mt-4 overflow-x-auto pb-3">
                <table className="min-w-[1500px] text-left text-sm">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      {["Member Name", "Member Number", "Loan Account", "Branch", "Employer", "Sector", "Loan Product", "Outstanding", "Arrears", "Days", "Risk Class", "Risk Flags", "Officer"].map((head) => (
                        <th key={head} className="whitespace-nowrap px-4 py-3">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.watchlist.map((row) => (
                      <tr key={row.loan_account} className="border-b border-slate-200">
                        <td className="px-4 py-3 font-semibold">{row.member_name}</td>
                        <td className="px-4 py-3">{row.member_number || "—"}</td>
                        <td className="px-4 py-3">{row.loan_account}</td>
                        <td className="px-4 py-3">{row.branch || "—"}</td>
                        <td className="px-4 py-3">{row.employer || "—"}</td>
                        <td className="px-4 py-3">{row.sector || "—"}</td>
                        <td className="px-4 py-3">{row.loan_product || "—"}</td>
                        <td className="px-4 py-3">{formatMoney(row.outstanding_balance, currency)}</td>
                        <td className="px-4 py-3">{formatMoney(Number(row.arrears_amount || 0), currency)}</td>
                        <td className="px-4 py-3">{row.days_in_arrears || 0}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${badge(row.risk_status)}`}>{row.risk_status}</span></td>
                        <td className="px-4 py-3">{(row.risk_flags || []).join(", ") || "—"}</td>
                        <td className="px-4 py-3">{row.responsible_officer || "Unassigned"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="flex flex-wrap gap-3 print:hidden">
              <Link href="/executive-dashboard" className="rounded-full border bg-white px-5 py-3 font-semibold">Executive Cockpit</Link>
              <Link href="/action-tracker" className="rounded-full border bg-white px-5 py-3 font-semibold">Execution Tracker</Link>
              <Link href="/board-oversight" className="rounded-full bg-slate-950 px-5 py-3 font-semibold text-white">Board Oversight</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
