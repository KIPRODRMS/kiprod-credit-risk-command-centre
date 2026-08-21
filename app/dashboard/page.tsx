"use client";

import { useEffect, useMemo, useState } from "react";
import Pagination from "../components/Pagination";

type LoanRecord = {
  member_name: string;
  member_number: string;
  loan_account: string;
  loan_product: string;
  branch: string;
  employer: string;
  sector: string;
  loan_amount: number;
  outstanding_balance: number;
  arrears_amount: number;
  days_in_arrears: number;
  repayment_status: string;
  risk_status: "Green" | "Amber" | "Red" | "NPL";
};

function formatKes(value: number) {
  return `KES ${value.toLocaleString("en-KE")}`;
}

function countBy(records: LoanRecord[], key: keyof LoanRecord) {
  const result: Record<string, number> = {};

  records.forEach((record) => {
    const value = String(record[key] || "Unknown");
    result[value] = (result[value] || 0) + 1;
  });

  return Object.entries(result)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export default function DashboardPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [registerPage, setRegisterPage] = useState(1);
  const registerPageSize = 25;

  useEffect(() => {
    const saved = localStorage.getItem("kiprod_loan_records");

    if (saved) {
      setRecords(JSON.parse(saved));
    }
  }, []);

  const metrics = useMemo(() => {
    const totalPortfolio = records.reduce(
      (sum, record) => sum + record.loan_amount,
      0
    );

    const outstandingBalance = records.reduce(
      (sum, record) => sum + record.outstanding_balance,
      0
    );

    const totalArrears = records.reduce(
      (sum, record) => sum + record.arrears_amount,
      0
    );

    const earlyWarningAccounts = records.filter(
      (record) => record.risk_status === "Amber" || record.risk_status === "Red"
    ).length;

    const nplAccounts = records.filter(
      (record) => record.risk_status === "NPL"
    ).length;

    const par30 = records.filter(
      (record) => Number(record.days_in_arrears || 0) >= 30
    ).length;

    const par90 = records.filter(
      (record) => Number(record.days_in_arrears || 0) >= 90
    ).length;

    return {
      totalPortfolio,
      outstandingBalance,
      totalArrears,
      earlyWarningAccounts,
      totalRiskAccounts: earlyWarningAccounts + nplAccounts,
      nplAccounts,
      par30,
      par90,
    };
  }, [records]);

  const employerRisk = countBy(
    records.filter((record) => record.risk_status !== "Green"),
    "employer"
  ).slice(0, 5);

  const branchRisk = countBy(
    records.filter((record) => record.risk_status !== "Green"),
    "branch"
  ).slice(0, 5);

  const riskRecords = useMemo(
    () => records.filter((record) => record.risk_status !== "Green"),
    [records]
  );
  const paginatedRiskRecords = riskRecords.slice(
    (registerPage - 1) * registerPageSize,
    registerPage * registerPageSize
  );
  const arrearsRate = metrics.outstandingBalance
    ? (metrics.totalArrears / metrics.outstandingBalance) * 100
    : 0;

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 overflow-hidden rounded-3xl border border-amber-400/25 bg-slate-950 p-5 shadow-xl sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
              KIPROD Command Centre
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Credit Risk Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Executive portfolio intelligence, early-warning visibility and board-ready action.
            </p>
          </div>

         <div className="flex flex-col gap-3 sm:flex-row">
  <a
    href="/portfolio-upload"
    className="rounded-full border border-slate-600 bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-amber-400"
  >
    Upload New Data
  </a>

  <a
    href="/board-pack"
    className="rounded-full bg-amber-400 px-5 py-3 text-center text-sm font-semibold text-slate-950"
  >
    Generate Board Pack
  </a>

  <a
    href="/action-tracker"
    className="dashboard-action-button rounded-full border border-white/30 bg-slate-700 px-5 py-3 text-center text-sm font-semibold transition hover:bg-slate-600"
  >
    Open Action Tracker
  </a>
</div>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              No portfolio data loaded yet
            </h2>
            <p className="mt-2 text-slate-600">
              Upload sample loan data to generate the dashboard.
            </p>
            <a
              href="/portfolio-upload"
              className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950"
            >
              Go to Portfolio Upload
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="dashboard-kpi-title text-sm font-extrabold uppercase tracking-wide">Total Portfolio</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {formatKes(metrics.totalPortfolio)}
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="dashboard-kpi-title text-sm font-extrabold uppercase tracking-wide">Outstanding Balance</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {formatKes(metrics.outstandingBalance)}
                </h2>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm sm:p-5">
                <p
                  className="dashboard-arrears-title text-sm font-extrabold uppercase tracking-wide"
                  style={{ color: "#000000", WebkitTextFillColor: "#000000" }}
                >
                  Total Arrears
                </p>
                <h2 className="mt-2 text-2xl font-bold text-red-600">
                  {formatKes(metrics.totalArrears)}
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="dashboard-kpi-title text-sm font-extrabold uppercase tracking-wide">Accounts Uploaded</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {records.length}
                </h2>
              </div>
            </div>
<div className="my-5 grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_280px] lg:p-6">
  <div>
  <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
    Management Interpretation
  </p>

  <h2 className="mt-2 text-xl font-bold text-slate-950">
    Portfolio Risk Position
  </h2>

  <p className="mt-3 leading-7 text-slate-700">
    The uploaded portfolio contains{" "}
    <strong>{records.length}</strong> loan accounts with a total
    approved portfolio value of{" "}
    <strong>{formatKes(metrics.totalPortfolio)}</strong>. The
    current outstanding balance is{" "}
    <strong>{formatKes(metrics.outstandingBalance)}</strong>, while
    arrears stand at{" "}
    <strong>{formatKes(metrics.totalArrears)}</strong>.
  </p>

  <p className="mt-3 leading-7 text-slate-700">
    The early warning position shows{" "}
    <strong>{metrics.earlyWarningAccounts}</strong> Amber and Red early-warning accounts and{" "}
    <strong>{metrics.nplAccounts}</strong> NPL accounts. Management
    should prioritize Red and NPL accounts, review risky employers and
    branches, and assign follow-up actions through the Management
    Action Tracker.
  </p>

  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
    <a
      href="/board-pack"
      className="rounded-full bg-amber-400 px-5 py-3 text-center text-sm font-semibold text-slate-950"
    >
      Generate Board Pack
    </a>

    <a
      href="/action-tracker"
      className="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white"
    >
      Assign Management Actions
    </a>
  </div>
</div>
  <aside className="rounded-2xl bg-slate-950 p-5 text-white">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-400">Executive Signal</p>
    <p className="mt-3 text-3xl font-bold">{arrearsRate.toFixed(1)}%</p>
    <p className="mt-1 text-sm font-semibold text-slate-200">Arrears to outstanding balance</p>
    <div className="mt-5 border-t border-white/15 pt-4">
      <p className="text-2xl font-bold text-amber-400">{riskRecords.length}</p>
      <p className="text-sm text-slate-300">Accounts requiring attention</p>
    </div>
  </aside>
</div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">Early Warning / High Risk</p>
                <h2 className="mt-2 text-2xl font-bold text-amber-600">
                  {metrics.earlyWarningAccounts}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">NPL Accounts</p>
                <h2 className="mt-2 text-2xl font-bold text-red-600">
                  {metrics.nplAccounts}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">PAR 30 Accounts</p>
                <h2 className="mt-2 text-2xl font-bold text-red-600">
                  {metrics.par30}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">PAR 90 Accounts</p>
                <h2 className="mt-2 text-2xl font-bold text-red-700">
                  {metrics.par90}
                </h2>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-950">
                  Top Risky Employers
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Based on accounts not classified as Green.
                </p>

                <div className="mt-5 space-y-3">
                  {employerRisk.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-xl bg-slate-100 p-4"
                    >
                      <span className="font-medium text-slate-800">
                        {item.name}
                      </span>
                      <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-slate-900">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-950">
                  Top Risky Branches
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Based on accounts not classified as Green.
                </p>

                <div className="mt-5 space-y-3">
                  {branchRisk.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-xl bg-slate-100 p-4"
                    >
                      <span className="font-medium text-slate-800">
                        {item.name}
                      </span>
                      <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-slate-900">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-wide text-amber-700">Management attention</p><h2 className="mt-1 text-xl font-bold text-slate-950">Early Warning Register</h2></div>
                <a href="/early-warning" className="text-sm font-bold text-slate-800 underline decoration-amber-400 decoration-2 underline-offset-4">Open full register</a>
              </div>

              <div className="mt-5 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-3 pl-5 pr-4">Member</th>
                      <th className="py-3">Product</th>
                      <th className="py-3">Branch</th>
                      <th className="py-3">Employer</th>
                      <th className="py-3">Outstanding</th>
                      <th className="py-3">Arrears</th>
                      <th className="py-3">Days</th>
                      <th className="py-3">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRiskRecords.map((record) => (
                      <tr key={record.loan_account} className="border-b">
                        <td className="py-3 pl-5 pr-4 font-medium text-slate-900">
                          {record.member_name}
                        </td>
                        <td className="py-3 text-slate-700">
                          {record.loan_product}
                        </td>
                        <td className="py-3 text-slate-700">
                          {record.branch}
                        </td>
                        <td className="py-3 text-slate-700">
                          {record.employer}
                        </td>
                        <td className="py-3 text-slate-700">
                          {formatKes(record.outstanding_balance)}
                        </td>
                        <td className="py-3 text-slate-700">
                          {formatKes(record.arrears_amount)}
                        </td>
                        <td className="py-3 text-slate-700">
                          {record.days_in_arrears}
                        </td>
                        <td className="py-3">
                          <span
  className={`rounded-full px-3 py-1 text-xs font-bold ${
    record.risk_status === "Amber"
      ? "bg-amber-200 text-amber-900"
      : record.risk_status === "Red"
      ? "bg-red-200 text-red-900"
      : record.risk_status === "NPL"
      ? "bg-red-700 text-white"
      : "bg-green-200 text-green-900"
  }`}
>
  {record.risk_status}
</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-3 md:hidden">
                {paginatedRiskRecords.map((record) => (
                  <article key={record.loan_account} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="font-bold text-slate-950">{record.member_name}</h3><p className="mt-1 text-xs font-semibold text-slate-600">{record.loan_product} · {record.branch}</p></div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${record.risk_status === "Amber" ? "bg-amber-200 text-amber-900" : record.risk_status === "Red" ? "bg-red-200 text-red-900" : "bg-red-700 text-white"}`}>{record.risk_status}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="font-semibold text-slate-600">Outstanding</dt><dd className="mt-1 font-bold text-slate-950">{formatKes(record.outstanding_balance)}</dd></div>
                      <div><dt className="font-semibold text-slate-600">Arrears</dt><dd className="mt-1 font-bold text-red-700">{formatKes(record.arrears_amount)}</dd></div>
                      <div><dt className="font-semibold text-slate-600">Employer</dt><dd className="mt-1 text-slate-900">{record.employer}</dd></div>
                      <div><dt className="font-semibold text-slate-600">Days</dt><dd className="mt-1 font-bold text-slate-950">{record.days_in_arrears}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
              <Pagination page={registerPage} pageSize={registerPageSize} totalItems={riskRecords.length} onPageChange={setRegisterPage} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
