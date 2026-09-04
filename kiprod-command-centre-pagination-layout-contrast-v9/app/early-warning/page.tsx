"use client";

import { useEffect, useMemo, useState } from "react";
import Pagination from "../components/Pagination";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";
type RiskFilter =
  | "All"
  | "Amber"
  | "Red"
  | "NPL"
  | "Restructured"
  | "High Exposure";

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
  responsible_officer?: string;
  restructured?: "Yes" | "No";
  risk_status: RiskStatus;
  risk_flags?: string[];
};

const filters: { label: string; value: RiskFilter }[] = [
  { label: "All Risk Accounts", value: "All" },
  { label: "Amber / Early Warning", value: "Amber" },
  { label: "Red / High Risk", value: "Red" },
  { label: "NPL / Recovery Attention", value: "NPL" },
  { label: "Restructured", value: "Restructured" },
  { label: "High Exposure", value: "High Exposure" },
];

const categoryGuidance = [
  {
    title: "Amber / Early Warning",
    className: "border-amber-300 bg-amber-50",
    text: "Amber accounts require immediate monitoring and borrower follow-up.",
  },
  {
    title: "Red / High Risk",
    className: "border-red-300 bg-red-50",
    text: "Red accounts require escalation and structured intervention.",
  },
  {
    title: "NPL / Recovery Attention",
    className: "border-red-700 bg-red-50",
    text: "NPL accounts require recovery attention and Board visibility where material.",
  },
  {
    title: "Restructured Risk",
    className: "border-violet-300 bg-violet-50",
    text: "Restructured accounts require performance review because repayment relief may hide borrower stress.",
  },
];

function formatKes(value: number) {
  return `KES ${value.toLocaleString("en-KE")}`;
}

function hasFlag(record: LoanRecord, flag: string) {
  return record.risk_flags?.includes(flag) ?? false;
}

function isRestructured(record: LoanRecord) {
  return record.restructured === "Yes" || hasFlag(record, "Restructured Risk");
}

function getRiskFlag(record: LoanRecord) {
  const flags = record.risk_flags ?? [];

  if (flags.length > 0) return flags.join(", ");
  if (record.days_in_arrears > 0) return "Arrears Account";
  return "No additional flag";
}

function getRecommendedAction(record: LoanRecord) {
  if (isRestructured(record)) {
    return "Review restructuring performance and confirm whether relief terms are being honored.";
  }

  if (record.risk_status === "NPL") {
    return "Transfer to recovery attention, review security position, and prepare a recovery strategy.";
  }

  if (record.risk_status === "Red") {
    return "Escalate to the Credit/Risk Manager, review repayment capacity, and agree an intervention plan.";
  }

  if (hasFlag(record, "High Exposure")) {
    return "Escalate for senior management visibility and close monitoring.";
  }

  return "Contact the borrower, confirm the cause of arrears, and agree a short-term repayment correction.";
}

function riskBadgeClass(status: RiskStatus) {
  if (status === "Amber") return "bg-amber-200 text-amber-900";
  if (status === "Red") return "bg-red-200 text-red-900";
  if (status === "NPL") return "bg-red-700 text-white";
  return "bg-green-200 text-green-900";
}

export default function EarlyWarningPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<RiskFilter>("All");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const loadRecords = window.setTimeout(() => {
      const saved = localStorage.getItem("kiprod_loan_records");

      if (!saved) return;

      try {
        const parsed = JSON.parse(saved);
        setRecords(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRecords([]);
      }
    }, 0);

    return () => window.clearTimeout(loadRecords);
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
      exposure: riskyRecords.reduce(
        (sum, record) => sum + record.outstanding_balance,
        0
      ),
      restructured: riskyRecords.filter(isRestructured).length,
    };
  }, [riskyRecords]);

  const filteredRecords = useMemo(() => {
    if (activeFilter === "All") return riskyRecords;
    if (activeFilter === "Restructured") {
      return riskyRecords.filter(isRestructured);
    }
    if (activeFilter === "High Exposure") {
      return riskyRecords.filter((record) => hasFlag(record, "High Exposure"));
    }

    return riskyRecords.filter(
      (record) => record.risk_status === activeFilter
    );
  }, [activeFilter, riskyRecords]);
  useEffect(() => setPage(1), [activeFilter]);
  const paginatedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-[1600px]">
        <div className="mb-8 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
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

          <div className="flex flex-wrap gap-3">
            <a
              href="/portfolio-upload"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800"
            >
              Upload New Data
            </a>
            <a
              href="/action-tracker"
              className="rounded-full bg-amber-400 px-5 py-3 text-center text-sm font-semibold text-slate-950"
            >
              Create Execution Actions
            </a>
            <a
              href="/watchlist"
              className="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Open Watchlist
            </a>
            <a
              href="/board-pack"
              className="rounded-full bg-slate-700 px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Open Board Report
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
            <section aria-labelledby="early-warning-summary">
              <h2 id="early-warning-summary" className="sr-only">
                Early Warning Summary
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Amber Accounts</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">
                    {summary.amber}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Red Accounts</p>
                  <p className="mt-2 text-2xl font-bold text-red-600">
                    {summary.red}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">NPL Accounts</p>
                  <p className="mt-2 text-2xl font-bold text-red-700">
                    {summary.npl}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Total Arrears</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatKes(summary.arrears)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Total Exposure at Risk
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatKes(summary.exposure)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Restructured Risk Accounts
                  </p>
                  <p className="mt-2 text-2xl font-bold text-violet-700">
                    {summary.restructured}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Risk Category Guidance
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {categoryGuidance.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-xl border-l-4 p-4 ${item.className}`}
                  >
                    <h3 className="font-bold text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Risk Category Filters
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Separate monitoring, escalation, recovery, restructuring,
                    and exposure priorities.
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  Showing {filteredRecords.length} of {riskyRecords.length} risk
                  accounts
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeFilter === filter.value
                        ? "bg-slate-950 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Early Warning Register
              </h2>

              {filteredRecords.length === 0 ? (
                <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-slate-600">
                  No accounts match this risk category.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[1900px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-slate-500">
                        <th className="py-3 pr-4">Member Name</th>
                        <th className="py-3 pr-4">Member Number</th>
                        <th className="py-3 pr-4">Loan Account</th>
                        <th className="py-3 pr-4">Branch</th>
                        <th className="py-3 pr-4">Employer</th>
                        <th className="py-3 pr-4">Sector</th>
                        <th className="py-3 pr-4">Loan Product</th>
                        <th className="py-3 pr-4">Outstanding Balance</th>
                        <th className="py-3 pr-4">Arrears Amount</th>
                        <th className="py-3 pr-4">Days in Arrears</th>
                        <th className="py-3 pr-4">Risk Class</th>
                        <th className="py-3 pr-4">Risk Flag</th>
                        <th className="py-3 pr-4">Responsible Officer</th>
                        <th className="py-3">Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((record) => (
                        <tr
                          key={record.loan_account}
                          className="border-b align-top"
                        >
                          <td className="py-3 pr-4 font-medium text-slate-900">
                            {record.member_name}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {record.member_number}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {record.loan_account}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {record.branch}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {record.employer}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {record.sector}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {record.loan_product}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {formatKes(record.outstanding_balance)}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {formatKes(record.arrears_amount)}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {record.days_in_arrears}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${riskBadgeClass(
                                record.risk_status
                              )}`}
                            >
                              {record.risk_status}
                            </span>
                          </td>
                          <td className="max-w-64 py-3 pr-4 text-slate-700">
                            {getRiskFlag(record)}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {record.responsible_officer || "Unassigned"}
                          </td>
                          <td className="max-w-96 py-3 leading-6 text-slate-700">
                            {getRecommendedAction(record)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={page} pageSize={pageSize} totalItems={filteredRecords.length} onPageChange={setPage} />
            </section>
          </>
        )}
      </section>
    </main>
  );
}
