"use client";

import { useEffect, useMemo, useState } from "react";
import Pagination from "../components/Pagination";
import RegisterSearch from "../components/RegisterSearch";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";
type WatchlistFilter =
  | "All"
  | "Amber"
  | "Red"
  | "NPL"
  | "Restructured"
  | "High Exposure"
  | "Overdue";

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

type ActionItem = {
  loan_account: string;
  assigned_to?: string;
  due_date?: string;
  status?: "Open" | "In Progress" | "Completed" | "Escalated";
  notes?: string;
};

type WatchlistRecord = LoanRecord & {
  action?: ActionItem;
  reason: string;
  escalationLevel: string;
  operationalStatus: string;
  overdue: boolean;
};

const filters: { label: string; value: WatchlistFilter }[] = [
  { label: "All Watchlist", value: "All" },
  { label: "Amber", value: "Amber" },
  { label: "Red", value: "Red" },
  { label: "NPL Follow-up", value: "NPL" },
  { label: "Restructured", value: "Restructured" },
  { label: "High Exposure", value: "High Exposure" },
  { label: "Overdue Follow-up", value: "Overdue" },
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

function isHighExposure(record: LoanRecord) {
  return hasFlag(record, "High Exposure");
}

function riskBadgeClass(status: RiskStatus) {
  if (status === "Amber") return "bg-amber-200 text-amber-900";
  if (status === "Red") return "bg-red-200 text-red-900";
  if (status === "NPL") return "bg-red-700 text-white";
  return "bg-green-200 text-green-900";
}

function watchlistReason(record: LoanRecord) {
  const reasons: string[] = [];

  if (record.risk_status === "Amber") reasons.push("Close monitoring");
  if (record.risk_status === "Red") reasons.push("High-risk escalation");
  if (record.risk_status === "NPL") reasons.push("Active recovery follow-up");
  if (isRestructured(record)) reasons.push("Restructuring performance");
  if (isHighExposure(record)) reasons.push("Senior management visibility");

  return reasons.join("; ");
}

function escalationLevel(record: LoanRecord) {
  if (record.risk_status === "NPL" && isHighExposure(record)) {
    return "Level 4: Board Visibility";
  }
  if (record.risk_status === "NPL" || isHighExposure(record)) {
    return "Level 3: Senior Management Escalation";
  }
  if (record.risk_status === "Red" || isRestructured(record)) {
    return "Level 2: Credit Manager Review";
  }
  return "Level 1: Officer Follow-up";
}

function operationalStatus(action?: ActionItem) {
  if (action?.status === "Completed") return "Closed";
  if (action?.status === "Escalated") return "Escalated";
  if (action?.status === "In Progress") return "Under Review";
  return "New";
}

function isOverdue(action?: ActionItem) {
  if (!action?.due_date || action.status === "Completed") return false;

  const dueDate = new Date(`${action.due_date}T23:59:59`);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

export default function WatchlistPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<WatchlistFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    const loadData = window.setTimeout(() => {
      try {
        const savedRecords = localStorage.getItem("kiprod_loan_records");
        const savedActions = localStorage.getItem("kiprod_action_items");

        if (savedRecords) {
          const parsedRecords = JSON.parse(savedRecords);
          setRecords(Array.isArray(parsedRecords) ? parsedRecords : []);
        }

        if (savedActions) {
          const parsedActions = JSON.parse(savedActions);
          setActions(Array.isArray(parsedActions) ? parsedActions : []);
        }
      } catch {
        setRecords([]);
        setActions([]);
      }
    }, 0);

    return () => window.clearTimeout(loadData);
  }, []);

  const watchlistRecords = useMemo<WatchlistRecord[]>(() => {
    const actionsByAccount = new Map(
      actions.map((action) => [action.loan_account, action])
    );

    return records
      .filter(
        (record) =>
          record.risk_status === "Amber" ||
          record.risk_status === "Red" ||
          record.risk_status === "NPL" ||
          isRestructured(record) ||
          isHighExposure(record)
      )
      .map((record) => {
        const action = actionsByAccount.get(record.loan_account);

        return {
          ...record,
          action,
          reason: watchlistReason(record),
          escalationLevel: escalationLevel(record),
          operationalStatus: operationalStatus(action),
          overdue: isOverdue(action),
        };
      })
      .sort((a, b) => b.days_in_arrears - a.days_in_arrears);
  }, [actions, records]);

  const summary = useMemo(() => {
    return {
      total: watchlistRecords.length,
      amber: watchlistRecords.filter(
        (record) => record.risk_status === "Amber"
      ).length,
      red: watchlistRecords.filter((record) => record.risk_status === "Red")
        .length,
      npl: watchlistRecords.filter((record) => record.risk_status === "NPL")
        .length,
      restructured: watchlistRecords.filter(isRestructured).length,
      highExposure: watchlistRecords.filter(isHighExposure).length,
      exposure: watchlistRecords.reduce(
        (sum, record) => sum + record.outstanding_balance,
        0
      ),
      overdue: watchlistRecords.filter((record) => record.overdue).length,
    };
  }, [watchlistRecords]);

  const filteredRecords = useMemo(() => {
    let categoryRecords: WatchlistRecord[] = watchlistRecords;
    if (activeFilter === "Restructured") {
      categoryRecords = watchlistRecords.filter(isRestructured);
    } else if (activeFilter === "High Exposure") {
      categoryRecords = watchlistRecords.filter(isHighExposure);
    } else if (activeFilter === "Overdue") {
      categoryRecords = watchlistRecords.filter((record) => record.overdue);
    } else if (activeFilter !== "All") {
      categoryRecords = watchlistRecords.filter((record) => record.risk_status === activeFilter);
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categoryRecords;
    return categoryRecords.filter((record) =>
      [record.member_name, record.member_number, record.loan_account, record.branch,
        record.employer, record.sector, record.loan_product, record.responsible_officer,
        record.risk_status, record.reason, record.operationalStatus, record.escalationLevel]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [activeFilter, watchlistRecords, searchQuery]);
  useEffect(() => setPage(1), [activeFilter, searchQuery]);
  const paginatedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const summaryCards = [
    { label: "Total Watchlist Accounts", value: summary.total },
    { label: "Amber Watchlist", value: summary.amber, tone: "text-amber-600" },
    { label: "Red Watchlist", value: summary.red, tone: "text-red-600" },
    { label: "NPL Follow-up", value: summary.npl, tone: "text-red-800" },
    {
      label: "Restructured Risk",
      value: summary.restructured,
      tone: "text-violet-700",
    },
    {
      label: "High Exposure",
      value: summary.highExposure,
      tone: "text-blue-700",
    },
    { label: "Total Watchlist Exposure", value: formatKes(summary.exposure) },
    {
      label: "Overdue Follow-ups",
      value: summary.overdue,
      tone: "text-red-700",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-[1800px]">
        <div className="mb-8 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              KIPROD Command Centre
            </p>
            <h1 className="text-3xl font-bold text-slate-950">Watchlist</h1>
            <p className="mt-2 max-w-4xl text-slate-600">
              A focused management view of accounts requiring close monitoring,
              escalation, recovery follow-up, or senior management attention.
            </p>
            <p className="mt-3 font-semibold text-slate-800">
              Early Warning identifies risk. Watchlist manages risk.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/early-warning"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800"
            >
              View Early Warning
            </a>
            <a
              href="/action-tracker"
              className="rounded-full bg-amber-400 px-5 py-3 text-center text-sm font-semibold text-slate-950"
            >
              Create Execution Actions
            </a>
            <a
              href="/action-tracker"
              className="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Open Execution Tracker
            </a>
            <a
              href="/board-pack"
              className="rounded-full bg-slate-700 px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Open Board Report
            </a>
            <a
              href="/portfolio-upload"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800"
            >
              Upload New Portfolio
            </a>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              No portfolio data loaded yet
            </h2>
            <p className="mt-2 text-slate-600">
              Upload portfolio data first to generate the watchlist.
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-800">{card.label}</p>
                  <h2
                    className={`mt-2 text-2xl font-bold ${
                      card.tone ?? "text-slate-950"
                    }`}
                  >
                    {card.value}
                  </h2>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Watchlist Filters
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeFilter === filter.value
                        ? "bg-slate-950 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <RegisterSearch value={searchQuery} onChange={setSearchQuery} resultCount={filteredRecords.length} placeholder="Search member, loan account, branch, officer, product or status..." />
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Watchlist Register
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {filteredRecords.length} account
                    {filteredRecords.length === 1 ? "" : "s"} shown
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-800">
                  Statuses: New · Under Review · Contacted · Intervention Agreed
                  · Escalated · Moved to Recovery · Closed
                </p>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-800">
                Scroll sideways inside the register to view all 15 columns →
              </p>
              <div className="mt-2 overflow-x-scroll pb-4 [scrollbar-gutter:stable]">
                <table className="w-full min-w-[2100px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-950 text-white">
                      <th className="py-3 pr-5">Member Name</th>
                      <th className="py-3 pr-5">Loan Account</th>
                      <th className="py-3 pr-5">Branch</th>
                      <th className="py-3 pr-5">Employer</th>
                      <th className="py-3 pr-5">Sector</th>
                      <th className="py-3 pr-5">Outstanding Balance</th>
                      <th className="py-3 pr-5">Arrears Amount</th>
                      <th className="py-3 pr-5">Days in Arrears</th>
                      <th className="py-3 pr-5">Risk Class</th>
                      <th className="py-3 pr-5">Reason for Watchlisting</th>
                      <th className="py-3 pr-5">Responsible Officer</th>
                      <th className="py-3 pr-5">Follow-up Date</th>
                      <th className="py-3 pr-5">Escalation Level</th>
                      <th className="py-3 pr-5">Status</th>
                      <th className="py-3">Latest Note</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedRecords.map((record) => (
                      <tr
                        key={record.loan_account}
                        className={`border-b align-top ${
                          record.overdue ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="py-4 pr-5 font-medium text-slate-900">
                          {record.member_name}
                        </td>
                        <td className="py-4 pr-5 text-slate-700">
                          {record.loan_account}
                        </td>
                        <td className="py-4 pr-5 text-slate-700">
                          {record.branch}
                        </td>
                        <td className="py-4 pr-5 text-slate-700">
                          {record.employer}
                        </td>
                        <td className="py-4 pr-5 text-slate-700">
                          {record.sector}
                        </td>
                        <td className="py-4 pr-5 text-slate-700">
                          {formatKes(record.outstanding_balance)}
                        </td>
                        <td className="py-4 pr-5 text-slate-700">
                          {formatKes(record.arrears_amount)}
                        </td>
                        <td className="py-4 pr-5 text-slate-700">
                          {record.days_in_arrears}
                        </td>
                        <td className="py-4 pr-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${riskBadgeClass(
                              record.risk_status
                            )}`}
                          >
                            {record.risk_status}
                          </span>
                        </td>
                        <td className="max-w-xs py-4 pr-5 text-slate-700">
                          {record.reason}
                        </td>
                        <td className="py-4 pr-5 text-slate-700">
                          {record.action?.assigned_to ||
                            record.responsible_officer ||
                            "Unassigned"}
                        </td>
                        <td
                          className={`py-4 pr-5 ${
                            record.overdue
                              ? "font-semibold text-red-700"
                              : "text-slate-700"
                          }`}
                        >
                          {record.action?.due_date || "Not scheduled"}
                          {record.overdue ? " · Overdue" : ""}
                        </td>
                        <td className="max-w-xs py-4 pr-5 text-slate-700">
                          {record.escalationLevel}
                        </td>
                        <td className="py-4 pr-5">
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
                            {record.operationalStatus}
                          </span>
                        </td>
                        <td className="max-w-sm py-4 text-slate-700">
                          {record.action?.notes || "No follow-up note recorded."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredRecords.length === 0 && (
                  <div className="rounded-xl bg-slate-100 p-6 text-center text-slate-600">
                    No accounts match the selected Watchlist filter.
                  </div>
                )}
              </div>
              <Pagination page={page} pageSize={pageSize} totalItems={filteredRecords.length} onPageChange={setPage} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
