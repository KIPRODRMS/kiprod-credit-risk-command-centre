"use client";

import { useEffect, useMemo, useState } from "react";

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

    const watchlistAccounts = records.filter(
      (record) => record.risk_status === "Amber" || record.risk_status === "Red"
    ).length;

    const nplAccounts = records.filter(
      (record) => record.risk_status === "NPL"
    ).length;

    const par30 = records.filter(
      (record) => record.days_in_arrears > 30
    ).length;

    const par90 = records.filter(
      (record) => record.days_in_arrears > 90
    ).length;

    return {
      totalPortfolio,
      outstandingBalance,
      totalArrears,
      watchlistAccounts,
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

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              KIPROD Command Centre
            </p>
            <h1 className="text-3xl font-bold text-slate-950">
              Credit Risk Dashboard
            </h1>
            <p className="mt-2 text-slate-600">
              Portfolio visibility, early warning indicators, and board-ready
              risk summaries.
            </p>
          </div>

         <div className="flex flex-col gap-3 sm:flex-row">
  <a
    href="/portfolio-upload"
    className="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white"
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
    className="rounded-full border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800"
  >
    Open Action Tracker
  </a>
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
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total Portfolio</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {formatKes(metrics.totalPortfolio)}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Outstanding Balance</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {formatKes(metrics.outstandingBalance)}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total Arrears</p>
                <h2 className="mt-2 text-2xl font-bold text-red-600">
                  {formatKes(metrics.totalArrears)}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Accounts Uploaded</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {records.length}
                </h2>
              </div>
            </div>
<div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
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
    <strong>{metrics.watchlistAccounts}</strong> watchlist accounts and{" "}
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
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Watchlist Accounts</p>
                <h2 className="mt-2 text-2xl font-bold text-amber-600">
                  {metrics.watchlistAccounts}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">NPL Accounts</p>
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

            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Early Warning Register
              </h2>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-3">Member</th>
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
                    {records.map((record) => (
                      <tr key={record.loan_account} className="border-b">
                        <td className="py-3 font-medium text-slate-900">
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
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-900">
                            {record.risk_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}