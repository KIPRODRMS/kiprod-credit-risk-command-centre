"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Pagination from "../components/Pagination";
import RegisterSearch from "../components/RegisterSearch";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";
type ActionStatus =
  | "New"
  | "Assigned"
  | "In Progress"
  | "Awaiting Borrower Response"
  | "Intervention Agreed"
  | "Escalated"
  | "Moved to Recovery"
  | "Closed"
  | "Overdue";
type EscalationLevel =
  | "Level 1: Officer Follow-up"
  | "Level 2: Credit Manager Review"
  | "Level 3: Senior Management Escalation"
  | "Level 4: Board Visibility";

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
  repayment_status?: string;
  responsible_officer?: string;
  restructured?: string;
  risk_status: RiskStatus;
  risk_flags?: string[];
};

type ActionItem = {
  action_id: string;
  loan_account: string;
  member_name: string;
  risk_status: RiskStatus;
  risk_source: string;
  action_required: string;
  assigned_to: string;
  due_date: string;
  status: ActionStatus;
  escalation_level: EscalationLevel;
  board_visible: boolean;
  notes: string;
  last_updated: string;
};

type AuditLog = {
  id: string;
  createdAt: string;
  module: string;
  actionType: string;
  recordRef: string;
  oldValue: string;
  newValue: string;
  role: string;
  user: string;
  note: string;
};

const statuses: ActionStatus[] = [
  "New",
  "Assigned",
  "In Progress",
  "Awaiting Borrower Response",
  "Intervention Agreed",
  "Escalated",
  "Moved to Recovery",
  "Closed",
  "Overdue",
];

const escalationLevels: EscalationLevel[] = [
  "Level 1: Officer Follow-up",
  "Level 2: Credit Manager Review",
  "Level 3: Senior Management Escalation",
  "Level 4: Board Visibility",
];

const filters = [
  "All Actions",
  "Open",
  "Overdue",
  "Escalated",
  "Closed",
  "Board Visible",
  "Amber",
  "Red",
  "NPL",
  "Restructured",
  "High Exposure",
] as const;

function getDefaultAction(record: LoanRecord): string {
  if (record.risk_status === "Amber")
    return "Contact borrower, confirm the cause of arrears and agree a repayment correction.";
  if (record.risk_status === "Red")
    return "Escalate for manager review and agree a structured intervention plan.";
  return "Move to recovery attention and prepare an account recovery strategy.";
}

function getRiskSource(record: LoanRecord): string {
  const flags = record.risk_flags || [];
  if (record.restructured?.toLowerCase() === "yes") return "Restructured Account";
  if (flags.includes("High Exposure")) return "High Exposure";
  if (record.risk_status === "NPL") return "NPL";
  if (record.risk_status === "Red" || record.risk_status === "Amber")
    return "Early Warning";
  return "Watchlist";
}

function getEscalation(record: LoanRecord): EscalationLevel {
  if (record.risk_status === "NPL")
    return "Level 3: Senior Management Escalation";
  if ((record.risk_flags || []).includes("High Exposure"))
    return "Level 3: Senior Management Escalation";
  if (record.risk_status === "Red")
    return "Level 2: Credit Manager Review";
  return "Level 1: Officer Follow-up";
}

function isOverdue(action: ActionItem): boolean {
  if (!action.due_date || action.status === "Closed") return false;
  return new Date(`${action.due_date}T23:59:59`).getTime() < Date.now();
}

function isBoardVisible(action: ActionItem, record?: LoanRecord): boolean {
  return (
    action.board_visible ||
    isOverdue(action) ||
    action.risk_status === "NPL" ||
    action.escalation_level === "Level 4: Board Visibility" ||
    (record?.risk_flags || []).includes("High Exposure")
  );
}

function getStatusColour(status: ActionStatus): string {
  if (status === "Closed") return "border-green-300 bg-green-100 text-green-900";
  if (status === "Overdue") return "border-red-300 bg-red-100 text-red-900";
  if (status === "Escalated" || status === "Moved to Recovery")
    return "border-rose-300 bg-rose-100 text-rose-900";
  if (status === "In Progress" || status === "Intervention Agreed")
    return "border-blue-300 bg-blue-100 text-blue-950";
  if (status === "Awaiting Borrower Response")
    return "border-violet-300 bg-violet-100 text-violet-950";
  if (status === "Assigned")
    return "border-cyan-300 bg-cyan-100 text-cyan-950";
  return "border-slate-300 bg-slate-100 text-slate-950";
}

function getEscalationColour(level: EscalationLevel): string {
  if (String(level || "").includes("Level 4"))
    return "border-purple-300 bg-purple-100 text-purple-950";
  if (String(level || "").includes("Level 3"))
    return "border-red-300 bg-red-100 text-red-950";
  if (String(level || "").includes("Level 2"))
    return "border-amber-300 bg-amber-100 text-amber-950";
  return "border-emerald-300 bg-emerald-100 text-emerald-950";
}

function normalizeAction(
  action: Partial<ActionItem> & { loan_account: string; member_name: string },
  index: number
): ActionItem {
  const legacyStatus = String(action.status || "New");
  const statusMap: Record<string, ActionStatus> = {
    Open: "New",
    "In Progress": "In Progress",
    Completed: "Closed",
    Escalated: "Escalated",
  };

  return {
    action_id: action.action_id || `ACT-${String(index + 1).padStart(4, "0")}`,
    loan_account: action.loan_account,
    member_name: action.member_name,
    risk_status: action.risk_status || "Amber",
    risk_source: action.risk_source || "Early Warning",
    action_required: action.action_required || "",
    assigned_to: action.assigned_to || "",
    due_date: action.due_date || "",
    status: statuses.includes(legacyStatus as ActionStatus)
      ? (legacyStatus as ActionStatus)
      : statusMap[legacyStatus] || "New",
    escalation_level:
      action.escalation_level || "Level 1: Officer Follow-up",
    board_visible: Boolean(action.board_visible),
    notes: action.notes || "",
    last_updated: action.last_updated || new Date().toISOString(),
  };
}

function createActions(records: LoanRecord[]): ActionItem[] {
  return records
    .filter((record) => record.risk_status !== "Green")
    .map((record, index) => ({
      action_id: `ACT-${String(index + 1).padStart(4, "0")}`,
      loan_account: record.loan_account,
      member_name: record.member_name,
      risk_status: record.risk_status,
      risk_source: getRiskSource(record),
      action_required: getDefaultAction(record),
      assigned_to: record.responsible_officer || "",
      due_date: "",
      status: record.responsible_officer ? "Assigned" : "New",
      escalation_level: getEscalation(record),
      board_visible:
        record.risk_status === "NPL" ||
        (record.risk_flags || []).includes("High Exposure"),
      notes: "",
      last_updated: new Date().toISOString(),
    }));
}

function hasUsableActions(value: unknown): value is Array<Partial<ActionItem> & { loan_account: string; member_name: string }> {
  return Array.isArray(value) && value.some(
    (action) => action && typeof action === "object" && "loan_account" in action
  );
}

function getCurrentRole(): string {
  return localStorage.getItem("kiprodCurrentRole") || "MVP User";
}

function writeAudit(
  action: ActionItem,
  field: keyof ActionItem,
  oldValue: string,
  newValue: string
) {
  if (oldValue === newValue) return;
  let logs: AuditLog[] = [];
  try {
    logs = JSON.parse(localStorage.getItem("kiprodAuditLogs") || "[]");
  } catch {
    logs = [];
  }
  const role = getCurrentRole();
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    module: "Execution Tracker",
    actionType: `EXECUTION_${String(field).toUpperCase()}_UPDATED`,
    recordRef: `${action.action_id} - ${action.loan_account}`,
    oldValue: oldValue || "Blank",
    newValue: newValue || "Blank",
    role,
    user: role,
    note: `Execution Tracker field "${field}" changed for ${action.member_name}.`,
  };
  localStorage.setItem("kiprodAuditLogs", JSON.stringify([log, ...logs]));
}

export default function ActionTrackerPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]>("All Actions");
  const [officerFilter, setOfficerFilter] = useState("All Officers");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;

    try {
      const parsedRecords: LoanRecord[] = JSON.parse(
        localStorage.getItem("kiprod_loan_records") || "[]"
      );
      const parsedActions = JSON.parse(
        localStorage.getItem("kiprod_action_items") || "[]"
      ) as Array<
        Partial<ActionItem> & { loan_account: string; member_name: string }
      >;
      const nextActions =
        hasUsableActions(parsedActions)
          ? parsedActions.map(normalizeAction)
          : createActions(parsedRecords);
      queueMicrotask(() => {
        if (cancelled) return;
        setRecords(parsedRecords);
        setActions(nextActions);
      });
      if (parsedRecords.length > 0 && !hasUsableActions(parsedActions)) {
        localStorage.setItem("kiprod_action_items", JSON.stringify(nextActions));
      }
    } catch {
      queueMicrotask(() => {
        if (cancelled) return;
        setRecords([]);
        setActions([]);
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const recordMap = useMemo(
    () => new Map(records.map((record) => [record.loan_account, record])),
    [records]
  );

  const summary = useMemo(() => {
    const now = new Date();
    const week = new Date();
    week.setDate(now.getDate() + 7);
    return {
      total: actions.length,
      open: actions.filter((action) => action.status !== "Closed").length,
      overdue: actions.filter(isOverdue).length,
      escalated: actions.filter(
        (action) =>
          action.status === "Escalated" ||
          String(action.escalation_level || "").includes("Level 3") ||
          String(action.escalation_level || "").includes("Level 4")
      ).length,
      closed: actions.filter((action) => action.status === "Closed").length,
      boardVisible: actions.filter((action) =>
        isBoardVisible(action, recordMap.get(action.loan_account))
      ).length,
      dueThisWeek: actions.filter((action) => {
        if (!action.due_date || action.status === "Closed") return false;
        const due = new Date(`${action.due_date}T23:59:59`);
        return due >= now && due <= week;
      }).length,
      unassigned: actions.filter((action) => !action.assigned_to.trim()).length,
    };
  }, [actions, recordMap]);

  const officers = useMemo(
    () =>
      Array.from(
        new Set(actions.map((action) => action.assigned_to).filter(Boolean))
      ).sort(),
    [actions]
  );

  const visibleActions = useMemo(
    () =>
      actions.filter((action) => {
        const record = recordMap.get(action.loan_account);
        const boardVisible = isBoardVisible(action, record);
        const matchesOfficer =
          officerFilter === "All Officers" ||
          action.assigned_to === officerFilter ||
          (officerFilter === "Unassigned" && !action.assigned_to);
        if (!matchesOfficer) return false;
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = !query || [action.action_id, action.member_name, action.loan_account,
          action.risk_source, action.risk_status, action.action_required, action.assigned_to,
          action.status, action.escalation_level, action.notes]
          .some((value) => String(value || "").toLowerCase().includes(query));
        if (!matchesSearch) return false;
        if (activeFilter === "All Actions") return true;
        if (activeFilter === "Open") return action.status !== "Closed";
        if (activeFilter === "Overdue") return isOverdue(action);
        if (activeFilter === "Escalated")
          return (
            action.status === "Escalated" ||
            String(action.escalation_level || "").includes("Level 3") ||
            String(action.escalation_level || "").includes("Level 4")
          );
        if (activeFilter === "Closed") return action.status === "Closed";
        if (activeFilter === "Board Visible") return boardVisible;
        if (["Amber", "Red", "NPL"].includes(activeFilter))
          return action.risk_status === activeFilter;
        if (activeFilter === "Restructured")
          return record?.restructured?.toLowerCase() === "yes";
        return (record?.risk_flags || []).includes("High Exposure");
      }),
    [actions, activeFilter, officerFilter, recordMap, searchQuery]
  );
  useEffect(() => setPage(1), [activeFilter, officerFilter, searchQuery]);
  const paginatedActions = visibleActions.slice((page - 1) * pageSize, page * pageSize);

  function updateAction(
    actionId: string,
    field: keyof ActionItem,
    value: string | boolean
  ) {
    const target = actions.find((action) => action.action_id === actionId);
    if (!target) return;
    writeAudit(target, field, String(target[field] ?? ""), String(value));
    const updated = actions.map((action) =>
      action.action_id === actionId
        ? { ...action, [field]: value, last_updated: new Date().toISOString() }
        : action
    );
    setActions(updated);
    localStorage.setItem("kiprod_action_items", JSON.stringify(updated));
    setMessage("Execution Tracker updated and recorded in Audit History.");
  }

  function resetActionsFromPortfolio() {
    const nextActions = createActions(records);
    setActions(nextActions);
    localStorage.setItem("kiprod_action_items", JSON.stringify(nextActions));
    setMessage("Execution register regenerated from the latest portfolio.");
  }

  const cards = [
    ["Total Actions", summary.total, "text-slate-950"],
    ["Open Actions", summary.open, "text-amber-700"],
    ["Overdue Actions", summary.overdue, "text-red-700"],
    ["Escalated Actions", summary.escalated, "text-red-700"],
    ["Closed Actions", summary.closed, "text-green-700"],
    ["Board-Visible Actions", summary.boardVisible, "text-indigo-700"],
    ["Actions Due This Week", summary.dueThisWeek, "text-slate-950"],
    ["Unassigned Actions", summary.unassigned, "text-orange-700"],
  ] as const;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-[1600px]">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              KIPROD Command Centre
            </p>
            <h1 className="text-3xl font-bold text-slate-950">
              Execution Tracker
            </h1>
            <p className="mt-2 max-w-4xl text-slate-600">
              The Execution Tracker converts portfolio risk signals into
              assigned management actions, follow-up responsibilities, due
              dates, escalation status, and Board-visible accountability.
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              Insight → Action → Accountability → Board Oversight
            </p>
          </div>
          <button
            onClick={resetActionsFromPortfolio}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Regenerate from Portfolio
          </button>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              No portfolio data available
            </h2>
            <p className="mt-2 text-slate-600">
              Upload portfolio data first to generate accountable execution
              actions.
            </p>
            <Link
              href="/portfolio-upload"
              className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950"
            >
              Upload Portfolio
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              {cards.map(([label, value, colour]) => (
                <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <h2 className={`mt-2 text-2xl font-bold ${colour}`}>{value}</h2>
                </div>
              ))}
            </div>

            {message && (
              <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
                {message}
              </p>
            )}

            <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Action Filters
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      activeFilter === filter
                        ? "bg-slate-950 text-white"
                        : "border border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
                <select
                  value={officerFilter}
                  onChange={(event) => setOfficerFilter(event.target.value)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  <option>All Officers</option>
                  <option>Unassigned</option>
                  {officers.map((officer) => (
                    <option key={officer}>{officer}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4">
                <RegisterSearch value={searchQuery} onChange={setSearchQuery} resultCount={visibleActions.length} placeholder="Search borrower, loan account, action, officer, status or escalation..." />
              </div>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Execution Register
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {visibleActions.length} action
                    {visibleActions.length === 1 ? "" : "s"} shown. Every action
                    remains traceable to its originating risk signal.
                  </p>
                </div>
                <Link
                  href="/audit-history"
                  className="self-start rounded-full border border-amber-300 px-5 py-2 text-sm font-semibold text-slate-950"
                >
                  View Audit History
                </Link>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-800">
                Scroll sideways inside the register to view all 13 columns →
              </p>
              <div className="mt-2 overflow-x-scroll rounded-xl border border-slate-300 pb-4 [scrollbar-gutter:stable]">
                <table className="w-full min-w-[2300px] text-left text-sm text-slate-950">
                  <thead className="bg-slate-950">
                    <tr className="border-b border-slate-800 text-white">
                      {[
                        "Action ID",
                        "Risk Source",
                        "Member Name",
                        "Loan Account",
                        "Risk Class",
                        "Action Required",
                        "Responsible Officer",
                        "Due Date",
                        "Status",
                        "Escalation Level",
                        "Board Visible",
                        "Latest Note",
                        "Last Updated",
                      ].map((heading) => (
                        <th key={heading} className="px-3 py-4 text-xs font-bold uppercase tracking-wide text-white">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedActions.length === 0 && (
                      <tr>
                        <td colSpan={13} className="px-6 py-12 text-center">
                          <p className="font-bold text-slate-950">No actions match the current view.</p>
                          <p className="mt-2 text-sm font-medium text-slate-700">Clear the search or select All Actions and All Officers.</p>
                          <button
                            type="button"
                            onClick={() => { setActiveFilter("All Actions"); setOfficerFilter("All Officers"); setSearchQuery(""); }}
                            className="mt-4 rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white"
                          >
                            Show all generated actions
                          </button>
                        </td>
                      </tr>
                    )}
                    {paginatedActions.map((action) => {
                      const overdue = isOverdue(action);
                      const boardVisible = isBoardVisible(
                        action,
                        recordMap.get(action.loan_account)
                      );
                      return (
                        <tr
                          key={action.action_id}
                          className={`border-b align-top ${
                            overdue
                              ? "border-red-300 bg-red-100"
                              : boardVisible
                                ? "border-amber-300 bg-amber-100"
                                : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <td className="px-3 py-3 font-bold text-slate-950">
                            {action.action_id}
                          </td>
                          <td className="px-3 py-3 font-semibold text-indigo-900">{action.risk_source}</td>
                          <td className="px-3 py-3 font-semibold text-slate-950">
                            {action.member_name}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-900">{action.loan_account}</td>
                          <td className="px-2 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                action.risk_status === "Amber"
                                  ? "bg-amber-200 text-amber-900"
                                  : action.risk_status === "Red"
                                    ? "bg-red-200 text-red-900"
                                    : "bg-red-700 text-white"
                              }`}
                            >
                              {action.risk_status}
                            </span>
                          </td>
                          <td className="px-2 py-3">
                            <textarea
                              value={action.action_required}
                              onChange={(event) =>
                                updateAction(
                                  action.action_id,
                                  "action_required",
                                  event.target.value
                                )
                              }
                              rows={3}
                              className="w-72 rounded-xl border border-blue-300 bg-blue-50 p-2 text-slate-950 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <input
                              value={action.assigned_to}
                              onChange={(event) =>
                                updateAction(
                                  action.action_id,
                                  "assigned_to",
                                  event.target.value
                                )
                              }
                              placeholder="Officer name"
                              className="w-48 rounded-xl border border-cyan-300 bg-cyan-50 p-2 text-slate-950 placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <input
                              type="date"
                              value={action.due_date}
                              onChange={(event) =>
                                updateAction(
                                  action.action_id,
                                  "due_date",
                                  event.target.value
                                )
                              }
                              className={`rounded-xl border p-2 ${
                                overdue
                                  ? "border-red-400 bg-red-50 text-red-950"
                                  : "border-amber-300 bg-amber-50 text-slate-950"
                              }`}
                            />
                            {overdue && (
                              <p className="mt-1 text-xs font-bold text-red-700">
                                Overdue
                              </p>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <select
                              value={action.status}
                              onChange={(event) =>
                                updateAction(
                                  action.action_id,
                                  "status",
                                  event.target.value
                                )
                              }
                              className={`w-56 rounded-xl border p-2 font-semibold ${getStatusColour(action.status)}`}
                            >
                              {statuses.map((status) => (
                                <option key={status}>{status}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-3">
                            <select
                              value={action.escalation_level}
                              onChange={(event) =>
                                updateAction(
                                  action.action_id,
                                  "escalation_level",
                                  event.target.value
                                )
                              }
                              className={`w-64 rounded-xl border p-2 font-semibold ${getEscalationColour(action.escalation_level)}`}
                            >
                              {escalationLevels.map((level) => (
                                <option key={level}>{level}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-3">
                            <label className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-bold ${boardVisible ? "border-purple-300 bg-purple-100 text-purple-950" : "border-slate-300 bg-slate-100 text-slate-800"}`}>
                              <input
                                type="checkbox"
                                checked={boardVisible}
                                onChange={(event) =>
                                  updateAction(
                                    action.action_id,
                                    "board_visible",
                                    event.target.checked
                                  )
                                }
                              />
                              {boardVisible ? "Yes" : "No"}
                            </label>
                          </td>
                          <td className="px-2 py-3">
                            <textarea
                              value={action.notes}
                              onChange={(event) =>
                                updateAction(
                                  action.action_id,
                                  "notes",
                                  event.target.value
                                )
                              }
                              rows={3}
                              placeholder="Latest management note"
                              className="w-64 rounded-xl border border-violet-300 bg-violet-50 p-2 text-slate-950 placeholder:text-slate-500 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-200"
                            />
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-700">
                            {new Date(action.last_updated).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={pageSize} totalItems={visibleActions.length} onPageChange={setPage} />
            </section>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl bg-slate-950 p-6 text-white">
                <h2 className="text-xl font-bold">Escalation Rules</h2>
                <div className="mt-4 space-y-2 text-sm text-slate-200">
                  {escalationLevels.map((level) => (
                    <p key={level}>{level}</p>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-xl font-bold text-slate-950">
                  Board Visibility Notes
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Board visibility is reserved for material or unresolved
                  matters: overdue actions, NPLs, high exposures, Level 4
                  escalations, repeated follow-up failure, and Board
                  clarification requests. Operational records remain managed by
                  management teams.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/board-pack"
                    className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Open Board Report
                  </Link>
                  <Link
                    href="/board-oversight"
                    className="rounded-full border border-slate-400 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Open Board Oversight
                  </Link>
                  <Link
                    href="/clarification-requests"
                    className="rounded-full border border-slate-400 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Clarification Requests
                  </Link>
                </div>
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
