"use client";

import { useEffect, useMemo, useState } from "react";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";

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
  risk_status: RiskStatus;
};

function formatKes(value: number) {
  return `KES ${value.toLocaleString("en-KE")}`;
}

function getRecommendedAction(record: LoanRecord) {
  if (record.risk_status === "Amber") {
    return "Confirm next repayment date and monitor closely.";
  }

  if (record.risk_status === "Red") {
    return "Escalate to credit manager and assign recovery follow-up.";
  }

  if (record.risk_status === "NPL") {
    return "Move to recovery action plan and include in board update.";
  }

  return "Continue normal monitoring.";
}

function riskBadgeClass(status: RiskStatus) {
  if (status === "Amber") return "bg-amber-200 text-amber-900";
  if (status === "Red") return "bg-red-200 text-red-900";
  if (status === "NPL") return "bg-red-700 text-white";
  return "bg-green-200 text-green-900";
}

export default function EarlyWarningPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("kiprod_loan_records");

    if (saved) {
      setRecords(JSON.parse(saved));
    }
  }, []);

  const riskyRecords = useMemo(() => {
    return records
      .filter((record) => record.risk_status !== "Green")
      .sort((a, b) => b.days_in_arrears - a.days_in_arrears);
  }, [records]);

  const summary = useMemo(() => {
    return {
      amber: riskyRecords.filter((record) => record.risk_status === "Amber")
        .length,
      red: riskyRecords.filter((record) => record.risk_status === "Red").length,
      npl: riskyRecords.filter((record) => record.risk_status === "NPL").length,
      arrears: riskyRecords.reduce(
        (sum, record) => sum + record.arrears_amount,
        0
      ),
    };
  }, [riskyRecords]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              KIPROD Command Centre
            </p>
            <h1 className="text-3xl font-bold text-slate-950">
              Early Warning Register
            </h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              A focused view of Amber, Red, and NPL accounts requiring
              management attention.
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
              href="/action-tracker"
              className="rounded-full bg-amber-400 px-5 py-3 text-center text-sm font-semibold text-slate-950"
            >
              Create Actions
            </a>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              No portfolio data loaded yet
            </h2>
            <p className="mt-2 text-slate-600">
              Upload portfolio data first to generate the early warning
              register.
            </p>
            <a
              href="/portfolio-upload"
              className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950"
            >
              Upload Portfolio
            </a>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Amber Accounts</p>
                <h2 className="mt-2 text-2xl font-bold text-amber-600">
                  {summary.amber}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Red Accounts</p>
                <h2 className="mt-2 text-2xl font-bold text-red-600">
                  {summary.red}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">NPL Accounts</p>
                <h2 className="mt-2 text-2xl font-bold text-red-700">
                  {summary.npl}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Risky Account Arrears</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {formatKes(summary.arrears)}
                </h2>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Management Interpretation
              </h2>
              <p className="mt-3 leading-7 text-slate-700">
                The register contains <strong>{riskyRecords.length}</strong>{" "}
                accounts requiring management attention. Red and NPL accounts
                should be prioritized for immediate recovery follow-up, while
                Amber accounts should be monitored closely to prevent further
                deterioration.
              </p>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Early Warning Accounts
              </h2>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-3">Member</th>
                      <th className="py-3">Loan Account</th>
                      <th className="py-3">Product</th>
                      <th className="py-3">Branch</th>
                      <th className="py-3">Employer</th>
                      <th className="py-3">Arrears</th>
                      <th className="py-3">Days</th>
                      <th className="py-3">Risk</th>
                      <th className="py-3">Recommended Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {riskyRecords.map((record) => (
                      <tr key={record.loan_account} className="border-b">
                        <td className="py-3 font-medium text-slate-900">
                          {record.member_name}
                        </td>
                        <td className="py-3 text-slate-700">
                          {record.loan_account}
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
                          {formatKes(record.arrears_amount)}
                        </td>
                        <td className="py-3 text-slate-700">
                          {record.days_in_arrears}
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${riskBadgeClass(
                              record.risk_status
                            )}`}
                          >
                            {record.risk_status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-700">
                          {getRecommendedAction(record)}
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