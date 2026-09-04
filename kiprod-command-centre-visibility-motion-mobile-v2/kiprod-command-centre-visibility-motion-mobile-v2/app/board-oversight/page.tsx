"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabaseClient";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";

type LoanRecord = {
  member_name: string;
  member_number?: string;
  loan_account: string;
  branch?: string;
  outstanding_balance: number;
  arrears_amount?: number;
  days_in_arrears?: number;
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
  status: string;
  escalation_level: string;
  board_visible: boolean;
  notes: string;
  last_updated: string;
};

type ClarificationRequest = {
  id: string;
  loan_account: string | null;
  member_name: string | null;
  question: string;
  assigned_to: string | null;
  status: string;
  management_response: string | null;
  created_at: string;
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

type BoardIssue = {
  issueId: string;
  riskSource: string;
  memberName: string;
  loanAccount: string;
  riskClass: RiskStatus;
  exposure: number;
  issue: string;
  managementOwner: string;
  dueDate: string;
  daysOverdue: number;
  escalationLevel: string;
  clarificationStatus: string;
  latestNote: string;
  visibilityReasons: string[];
};

type BoardNote = {
  issueId: string;
  note: string;
  updatedAt: string;
};

const CLOSED_STATUSES = ["closed", "completed", "done"];

function subscribeToHydration() {
  return () => {};
}

function isClosed(action: ActionItem) {
  return CLOSED_STATUSES.includes(String(action.status || "").toLowerCase());
}

function daysOverdue(dateValue: string) {
  if (!dateValue) return 0;
  const due = new Date(`${dateValue}T23:59:59`);
  if (Number.isNaN(due.getTime()) || due.getTime() >= Date.now()) return 0;
  return Math.ceil((Date.now() - due.getTime()) / 86_400_000);
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${Number(value || 0).toLocaleString("en-KE", {
    maximumFractionDigits: 0,
  })}`;
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

function appendAudit(
  actionType: string,
  issue: BoardIssue,
  note: string,
  newValue: string
) {
  const logs = readStored<AuditLog[]>("kiprodAuditLogs", []);
  const role = localStorage.getItem("kiprodCurrentRole") || "Board User";
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    module: "Board Oversight",
    actionType,
    recordRef: `${issue.issueId} - ${issue.loanAccount}`,
    oldValue: "",
    newValue,
    role,
    user: role,
    note,
  };
  localStorage.setItem("kiprodAuditLogs", JSON.stringify([log, ...logs]));
}

function Metric({
  label,
  value,
  note,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  note: string;
  tone?: "slate" | "amber" | "red" | "blue";
}) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-medium opacity-75">{note}</p>
    </div>
  );
}

export default function BoardOversightPage() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );
  const [records] = useState<LoanRecord[]>(() =>
    readStored<LoanRecord[]>("kiprod_loan_records", [])
  );
  const [actions] = useState<ActionItem[]>(() =>
    readStored<ActionItem[]>("kiprod_action_items", [])
  );
  const [clarifications, setClarifications] = useState<ClarificationRequest[]>([]);
  const [boardNotes, setBoardNotes] = useState<BoardNote[]>(() =>
    readStored<BoardNote[]>("kiprod_board_notes", [])
  );
  const [reviewed, setReviewed] = useState<string[]>(() =>
    readStored<string[]>("kiprod_board_reviewed", [])
  );
  const [message, setMessage] = useState("");
  const [currency] = useState(() => {
    const profile = readStored<Record<string, string>>(
      "kiprodInstitutionProfile",
      {}
    );
    return profile.reportingCurrency || profile.currency || "KES";
  });
  const [lastReport] = useState(() => {
    const profile = readStored<Record<string, string>>(
      "kiprodInstitutionProfile",
      {}
    );
    return (
      (typeof window !== "undefined"
        ? localStorage.getItem("kiprod_last_board_report")
        : null) ||
      profile.reportingMonth ||
      "Not generated"
    );
  });

  useEffect(() => {
    const institutionId =
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";
    if (institutionId) {
      supabase
        .from("clarification_requests")
        .select(
          "id,loan_account,member_name,question,assigned_to,status,management_response,created_at"
        )
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })
        .then(({ data }) =>
          setClarifications((data || []) as ClarificationRequest[])
        );
    }
  }, []);

  const analysis = useMemo(() => {
    const totalExposure = records.reduce(
      (sum, record) => sum + Number(record.outstanding_balance || 0),
      0
    );
    const highExposureThreshold = Math.max(totalExposure * 0.05, 1_000_000);
    const recordMap = new Map(
      records.map((record) => [record.loan_account, record])
    );

    const openClarifications = clarifications.filter(
      (request) => !["Closed", "Converted to Action"].includes(request.status)
    );

    const candidateActions = actions.filter((action) => {
      const record = recordMap.get(action.loan_account);
      const flags = (record?.risk_flags || []).join(" ").toLowerCase();
      const escalationLevel = String(action.escalation_level || "");
      return (
        !isClosed(action) &&
        (daysOverdue(action.due_date) > 0 ||
          action.risk_status === "NPL" ||
          Number(record?.outstanding_balance || 0) >= highExposureThreshold ||
          escalationLevel.includes("Level 4") ||
          action.board_visible ||
          flags.includes("deteriorat") ||
          flags.includes("repeat") ||
          !String(action.assigned_to || "").trim())
      );
    });

    const issues: BoardIssue[] = candidateActions.map((action, index) => {
      const record = recordMap.get(action.loan_account);
      const flags = (record?.risk_flags || []).join(" ").toLowerCase();
      const actionId =
        String(action.action_id || "").trim() ||
        `LEGACY-${String(index + 1).padStart(4, "0")}`;
      const issueId = `BO-${actionId.replace(/^ACT-/, "")}`;
      const escalationLevel = String(action.escalation_level || "");
      const relatedClarification = openClarifications.find(
        (request) => request.loan_account === action.loan_account
      );
      const exposure = Number(record?.outstanding_balance || 0);
      const reasons: string[] = [];

      if (daysOverdue(action.due_date) > 0) reasons.push("Action overdue");
      if (action.risk_status === "NPL") reasons.push("NPL account");
      if (exposure >= highExposureThreshold) reasons.push("Material exposure");
      if (escalationLevel.includes("Level 4"))
        reasons.push("Level 4 escalation");
      if (flags.includes("deteriorat") || flags.includes("repeat"))
        reasons.push("Repeated deterioration");
      if (!String(action.assigned_to || "").trim())
        reasons.push("No responsible officer");
      if (relatedClarification) reasons.push("Clarification unresolved");
      if (action.board_visible && reasons.length === 0)
        reasons.push("Marked Board-visible");

      return {
        issueId,
        riskSource: action.risk_source || "Execution Tracker",
        memberName: action.member_name || record?.member_name || "Not recorded",
        loanAccount: action.loan_account,
        riskClass: action.risk_status,
        exposure,
        issue: action.action_required || "Management action remains unresolved.",
        managementOwner: action.assigned_to || "Unassigned",
        dueDate: action.due_date || "Not set",
        daysOverdue: daysOverdue(action.due_date),
        escalationLevel:
          action.escalation_level || "Level 1: Officer Follow-up",
        clarificationStatus: relatedClarification?.status || "None raised",
        latestNote:
          boardNotes.find((note) => note.issueId === issueId)
            ?.note ||
          action.notes ||
          "No management note",
        visibilityReasons: reasons,
      };
    });

    const accountedLoans = new Set(issues.map((issue) => issue.loanAccount));
    records.forEach((record, index) => {
      if (record.risk_status === "Green" || accountedLoans.has(record.loan_account))
        return;
      const flags = (record.risk_flags || []).join(" ").toLowerCase();
      const exposure = Number(record.outstanding_balance || 0);
      const reasons: string[] = [];
      if (record.risk_status === "NPL") reasons.push("NPL account");
      if (exposure >= highExposureThreshold) reasons.push("Material exposure");
      if (!String(record.responsible_officer || "").trim())
        reasons.push("No responsible officer");
      if (flags.includes("deteriorat") || flags.includes("repeat"))
        reasons.push("Repeated deterioration");
      if (!reasons.length) return;

      issues.push({
        issueId: `BO-R${String(index + 1).padStart(4, "0")}`,
        riskSource: record.restructured === "Yes" ? "Restructured Account" : "Portfolio Risk",
        memberName: record.member_name,
        loanAccount: record.loan_account,
        riskClass: record.risk_status,
        exposure,
        issue: `${record.risk_status} account requires management oversight follow-up.`,
        managementOwner: record.responsible_officer || "Unassigned",
        dueDate: "Not set",
        daysOverdue: 0,
        escalationLevel:
          record.risk_status === "NPL"
            ? "Level 4: Board Visibility"
            : "Level 3: Senior Management Escalation",
        clarificationStatus:
          openClarifications.find(
            (request) => request.loan_account === record.loan_account
          )?.status || "None raised",
        latestNote:
          boardNotes.find(
            (note) => note.issueId === `BO-R${String(index + 1).padStart(4, "0")}`
          )?.note || "No management note",
        visibilityReasons: reasons,
      });
    });

    return {
      issues,
      overdue: issues.filter((issue) => issue.daysOverdue > 0).length,
      escalated: issues.filter((issue) =>
        issue.escalationLevel.match(/Level [34]/)
      ).length,
      npl: issues.filter((issue) => issue.riskClass === "NPL").length,
      unresolvedClarifications: openClarifications.length,
      highExposure: issues.filter((issue) =>
        issue.visibilityReasons.includes("Material exposure")
      ).length,
      deterioration: issues.filter((issue) =>
        issue.visibilityReasons.includes("Repeated deterioration")
      ).length,
    };
  }, [records, actions, clarifications, boardNotes]);

  function saveReviewed(issue: BoardIssue) {
    const next = reviewed.includes(issue.issueId)
      ? reviewed.filter((id) => id !== issue.issueId)
      : [...reviewed, issue.issueId];
    setReviewed(next);
    localStorage.setItem("kiprod_board_reviewed", JSON.stringify(next));
    appendAudit(
      "BOARD_MARKED_REVIEWED",
      issue,
      `Board review status updated for ${issue.memberName}.`,
      next.includes(issue.issueId) ? "Reviewed" : "Review removed"
    );
    setMessage(
      next.includes(issue.issueId)
        ? `${issue.issueId} marked as reviewed.`
        : `${issue.issueId} review mark removed.`
    );
  }

  function addBoardNote(issue: BoardIssue) {
    const note = window.prompt(
      `Add a Board governance note for ${issue.memberName}:`,
      ""
    );
    if (!note?.trim()) return;
    const next = [
      { issueId: issue.issueId, note: note.trim(), updatedAt: new Date().toISOString() },
      ...boardNotes.filter((item) => item.issueId !== issue.issueId),
    ];
    setBoardNotes(next);
    localStorage.setItem("kiprod_board_notes", JSON.stringify(next));
    appendAudit(
      "BOARD_NOTE_ADDED",
      issue,
      note.trim(),
      "Board note recorded"
    );
    setMessage(`Board note saved for ${issue.issueId}.`);
  }

  function escalateForMeeting(issue: BoardIssue) {
    appendAudit(
      "ESCALATED_FOR_BOARD_MEETING",
      issue,
      `${issue.memberName} escalated for the next Board meeting.`,
      "Next Board Meeting"
    );
    setMessage(`${issue.issueId} recorded for the next Board meeting.`);
  }

  async function requestClarification(issue: BoardIssue) {
    const institutionId =
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";
    if (!institutionId) {
      setMessage(
        "Clarification could not be created because the default institution ID is not configured."
      );
      return;
    }

    const question = `Management to clarify why this ${issue.riskClass} matter remains unresolved: ${issue.issue}`;
    const { data, error } = await supabase
      .from("clarification_requests")
      .insert({
        institution_id: institutionId,
        request_title: `Board clarification: ${issue.loanAccount}`,
        loan_account: issue.loanAccount,
        member_name: issue.memberName,
        issue_type: "Board Oversight",
        question,
        requested_by_role:
          localStorage.getItem("kiprodCurrentRole") || "Board User",
        assigned_to:
          issue.managementOwner === "Unassigned"
            ? null
            : issue.managementOwner,
        status: "Pending Management Response",
      })
      .select(
        "id,loan_account,member_name,question,assigned_to,status,management_response,created_at"
      )
      .single();

    if (error) {
      setMessage(`Clarification request failed: ${error.message}`);
      return;
    }

    setClarifications((current) => [
      data as ClarificationRequest,
      ...current,
    ]);
    appendAudit(
      "BOARD_CLARIFICATION_REQUESTED",
      issue,
      question,
      "Pending Management Response"
    );
    setMessage(
      `Clarification request created for ${issue.issueId} and recorded in Audit History.`
    );
  }

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1700px]">
          <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
              Board Governance Monitoring Layer
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Board Oversight
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              Loading Board governance data…
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px]">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
            Board Governance Monitoring Layer
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Board Oversight
          </h1>
          <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-200 sm:text-base">
            The Board Oversight page provides Board-level visibility over
            unresolved risks, overdue management actions, escalated credit
            concerns, clarification requests, and accountability gaps without
            giving Board users operational edit rights.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/board-pack"
              className="rounded-xl border border-slate-600 bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow hover:bg-slate-100"
            >
              Open Board Report
            </Link>
            <Link
              href="/clarification-requests"
              className="rounded-xl border border-amber-400 bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 shadow hover:bg-amber-300"
            >
              Clarification Requests
            </Link>
            <Link
              href="/audit-history"
              className="rounded-xl border border-slate-500 bg-slate-800 px-4 py-2 text-sm font-bold text-white shadow hover:bg-slate-700"
            >
              Audit History
            </Link>
          </div>
        </section>

        {message && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
            {message}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Board-Visible Risks" value={analysis.issues.length} note="Material or unresolved matters" tone="red" />
          <Metric label="Overdue Actions" value={analysis.overdue} note="Past agreed management due date" tone="amber" />
          <Metric label="Escalated Accounts" value={analysis.escalated} note="Level 3 or Level 4 matters" tone="red" />
          <Metric label="NPL Attention" value={analysis.npl} note="Non-performing matters visible here" tone="red" />
          <Metric label="Unresolved Clarifications" value={analysis.unresolvedClarifications} note="Awaiting closure or response" tone="blue" />
          <Metric label="High Exposure Accounts" value={analysis.highExposure} note="Material exposure threshold triggered" tone="amber" />
          <Metric label="Repeated Deterioration" value={analysis.deterioration} note="Repeated-risk flags identified" tone="amber" />
          <Metric label="Last Report Generated" value={lastReport} note="Formal Board Report reference" tone="slate" />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                1. Escalated Risk Matters
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Board-visible matters are selected through overdue, NPL,
                material-exposure, Level 4, deterioration, clarification, and
                ownership triggers.
              </p>
            </div>
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
              Scroll sideways inside the register to view all 13 columns →
            </p>
          </div>

          {analysis.issues.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-700">
              No Board-visible matters have been generated yet. Complete the
              Institution Profile, upload portfolio data, and create Execution
              Tracker actions first.
            </div>
          ) : (
            <div className="mt-5 w-full overflow-x-scroll rounded-xl border border-slate-300 bg-white pb-3">
              <table className="min-w-[2450px] table-fixed text-left text-xs text-slate-950">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    {[
                      ["Issue ID", 110],
                      ["Risk Source", 150],
                      ["Member / Account", 220],
                      ["Risk Class", 100],
                      ["Exposure", 150],
                      ["Issue Requiring Oversight", 330],
                      ["Management Owner", 170],
                      ["Due Date", 120],
                      ["Days Overdue", 110],
                      ["Escalation Level", 230],
                      ["Board Clarification Status", 210],
                      ["Latest Management / Board Note", 300],
                      ["Board Visibility Reason", 260],
                    ].map(([label, width]) => (
                      <th
                        key={String(label)}
                        className="px-3 py-3 font-bold"
                        style={{ width: Number(width) }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white text-slate-950">
                  {analysis.issues.map((issue) => (
                    <tr
                      key={issue.issueId}
                      className="border-b border-slate-200 align-top hover:bg-slate-50"
                    >
                      <td className="px-3 py-3 font-black text-slate-950">
                        {issue.issueId}
                        {reviewed.includes(issue.issueId) && (
                          <span className="mt-1 block text-[10px] font-bold text-emerald-700">
                            Reviewed
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-800">{issue.riskSource}</td>
                      <td className="px-3 py-3">
                        <strong className="block text-slate-950">{issue.memberName}</strong>
                        <span className="text-slate-600">{issue.loanAccount}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 font-black ${
                          issue.riskClass === "NPL"
                            ? "bg-red-100 text-red-800"
                            : issue.riskClass === "Red"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-amber-100 text-amber-800"
                        }`}>
                          {issue.riskClass}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-950">
                        {formatMoney(issue.exposure, currency)}
                      </td>
                      <td className="px-3 py-3 text-slate-800">{issue.issue}</td>
                      <td className={`px-3 py-3 font-bold ${
                        issue.managementOwner === "Unassigned"
                          ? "text-red-700"
                          : "text-slate-950"
                      }`}>
                        {issue.managementOwner}
                      </td>
                      <td className="px-3 py-3 text-slate-800">{issue.dueDate}</td>
                      <td className={`px-3 py-3 font-black ${
                        issue.daysOverdue > 0 ? "text-red-700" : "text-slate-700"
                      }`}>
                        {issue.daysOverdue || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-800">{issue.escalationLevel}</td>
                      <td className="px-3 py-3 text-slate-800">{issue.clarificationStatus}</td>
                      <td className="px-3 py-3 text-slate-800">{issue.latestNote}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {issue.visibilityReasons.map((reason) => (
                            <span
                              key={reason}
                              className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 font-bold text-slate-800"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              2. Overdue Management Actions
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {analysis.overdue > 0
                ? `${analysis.overdue} Board-visible management action${analysis.overdue === 1 ? " is" : "s are"} beyond the agreed due date and require accountability follow-up.`
                : "No Board-visible management action is currently overdue."}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              3. Board Clarification Requests
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {analysis.unresolvedClarifications > 0
                ? `${analysis.unresolvedClarifications} clarification request${analysis.unresolvedClarifications === 1 ? " remains" : "s remain"} unresolved and should be tracked against management response timelines.`
                : "No unresolved Board clarification request is currently recorded."}
            </p>
            <Link
              href="/clarification-requests"
              className="mt-4 inline-block rounded-lg border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              Open Clarification Register
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            4. Governance Accountability Notes
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            Use these governance actions on a Board-visible issue. They record
            Board review and challenge in Audit History; they do not edit the
            loan book, borrower follow-up, or management action record.
          </p>
          {analysis.issues.length > 0 && (
            <div className="mt-4 space-y-3">
              {analysis.issues.slice(0, 12).map((issue) => (
                <div
                  key={issue.issueId}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">
                        {issue.issueId} · {issue.memberName}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {issue.loanAccount} · {issue.visibilityReasons.join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => requestClarification(issue)}
                        className="rounded-lg border border-blue-700 bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
                      >
                        Request Clarification
                      </button>
                      <button
                        type="button"
                        onClick={() => saveReviewed(issue)}
                        className="rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                      >
                        {reviewed.includes(issue.issueId)
                          ? "Remove Reviewed Mark"
                          : "Mark Reviewed"}
                      </button>
                      <button
                        type="button"
                        onClick={() => escalateForMeeting(issue)}
                        className="rounded-lg border border-red-700 bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                      >
                        Escalate for Next Board Meeting
                      </button>
                      <button
                        type="button"
                        onClick={() => addBoardNote(issue)}
                        className="rounded-lg border border-slate-700 bg-white px-3 py-2 text-xs font-bold text-slate-950 hover:bg-slate-100"
                      >
                        Add Board Note
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <h2 className="text-lg font-black text-amber-950">
            Governance Reminder
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-amber-950">
            Board users can review escalated risks, request clarification, and
            monitor unresolved actions. Operational updates remain the
            responsibility of management users.
          </p>
        </section>
      </div>
    </main>
  );
}
