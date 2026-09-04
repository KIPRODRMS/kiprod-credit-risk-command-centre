"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabaseClient";
import Pagination from "../components/Pagination";
import RegisterSearch from "../components/RegisterSearch";

type ClarificationStatus =
  | "Pending Management Response"
  | "Management Responded"
  | "Under Board Review"
  | "Further Clarification Required"
  | "Escalated"
  | "Closed";

type ClarificationRequest = {
  id: string;
  institution_id: string;
  request_title: string;
  loan_account: string | null;
  member_name: string | null;
  issue_type: string | null;
  question: string;
  requested_by_role: string | null;
  assigned_to: string | null;
  status: ClarificationStatus | string;
  management_response: string | null;
  board_review_notes: string | null;
  created_at: string;
  responded_at: string | null;
  reviewed_at: string | null;
};

type GovernanceContext = {
  riskSource: string;
  riskClass: string;
  priority: string;
  dueDate: string;
  boardVisibilityReason: string;
  clarification: string;
};

const ISSUE_TYPES = [
  "Overdue Management Action",
  "NPL Exposure",
  "High Exposure Account",
  "Unresolved Watchlist Account",
  "Repeated Deterioration",
  "Restructured Account Concern",
  "Missing Responsible Officer",
  "Policy Exception",
  "Board Report Clarification",
  "Other",
];

const STATUSES: ClarificationStatus[] = [
  "Pending Management Response",
  "Management Responded",
  "Under Board Review",
  "Further Clarification Required",
  "Escalated",
  "Closed",
];

const emptyForm = {
  requestTitle: "",
  riskSource: "Board Oversight",
  loanAccount: "",
  memberName: "",
  riskClass: "Red",
  issueType: ISSUE_TYPES[0],
  priority: "High",
  assignedTo: "",
  dueDate: "",
  clarification: "",
  boardVisibilityReason: "",
};

function institutionId() {
  return process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";
}

function currentRole() {
  if (typeof window === "undefined") return "MVP User";
  return localStorage.getItem("kiprodCurrentRole") || "MVP User";
}

function subscribeToRole() {
  return () => {};
}

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

function encodeContext(form: typeof emptyForm) {
  return [
    "[Governance Context]",
    `Risk Source: ${form.riskSource || "Not specified"}`,
    `Risk Class: ${form.riskClass || "Not specified"}`,
    `Priority: ${form.priority || "Not specified"}`,
    `Due Date: ${form.dueDate || "Not specified"}`,
    `Board Visibility Reason: ${form.boardVisibilityReason || "Not specified"}`,
    "[Clarification Required]",
    form.clarification.trim(),
  ].join("\n");
}

function parseContext(question: string): GovernanceContext {
  const value = String(question || "");
  const marker = "[Clarification Required]";
  const read = (label: string) =>
    value.match(new RegExp(`^${label}:\\s*(.*)$`, "mi"))?.[1]?.trim() || "";

  if (!value.includes("[Governance Context]")) {
    return {
      riskSource: "Legacy clarification request",
      riskClass: "Not recorded",
      priority: "Not recorded",
      dueDate: "",
      boardVisibilityReason: "Not recorded in the original request",
      clarification: value,
    };
  }

  return {
    riskSource: read("Risk Source"),
    riskClass: read("Risk Class"),
    priority: read("Priority"),
    dueDate: read("Due Date"),
    boardVisibilityReason: read("Board Visibility Reason"),
    clarification: value.split(marker)[1]?.trim() || value,
  };
}

function statusTone(status: string) {
  if (status === "Closed") return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (status === "Escalated") return "border-red-300 bg-red-50 text-red-900";
  if (status === "Under Board Review" || status === "Management Responded")
    return "border-blue-300 bg-blue-50 text-blue-900";
  if (status === "Further Clarification Required")
    return "border-purple-300 bg-purple-50 text-purple-900";
  return "border-amber-300 bg-amber-50 text-amber-950";
}

async function audit(
  actionType: string,
  request: Pick<ClarificationRequest, "loan_account" | "request_title">,
  oldValue: string,
  newValue: string,
  note: string
) {
  const id = institutionId();
  if (!id) return;
  const role = currentRole();
  await supabase.from("audit_logs").insert({
    institution_id: id,
    module: "Clarification Requests",
    action_type: actionType,
    record_ref: `${request.loan_account || "No account"} - ${request.request_title}`,
    old_value: oldValue,
    new_value: newValue,
    role,
    user_name: role,
    note,
  });
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

export default function ClarificationRequestsPage() {
  const [requests, setRequests] = useState<ClarificationRequest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const role = useSyncExternalStore(subscribeToRole, currentRole, () => "MVP User");
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(Boolean(institutionId()));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(
    institutionId() ? "" : "Missing NEXT_PUBLIC_DEFAULT_INSTITUTION_ID in .env.local."
  );
  const [responseDraft, setResponseDraft] = useState("");
  const [boardNoteDraft, setBoardNoteDraft] = useState("");

  useEffect(() => {
    const id = institutionId();
    if (!id) return;
    supabase
      .from("clarification_requests")
      .select("*")
      .eq("institution_id", id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setMessage(`Failed to load requests: ${error.message}`);
        const loaded = (data || []) as ClarificationRequest[];
        setRequests(loaded);
        setSelectedId(loaded[0]?.id || "");
        setResponseDraft(loaded[0]?.management_response || "");
        setBoardNoteDraft(loaded[0]?.board_review_notes || "");
        setLoading(false);
      });
  }, []);

  const permissions = useMemo(() => {
    const normalized = role.toLowerCase();
    const admin = normalized.includes("admin") || normalized.includes("mvp");
    const board = admin || normalized.includes("board");
    const management =
      admin ||
      normalized.includes("management") ||
      normalized.includes("manager") ||
      normalized.includes("credit") ||
      normalized.includes("risk") ||
      normalized.includes("recovery");
    return { admin, board, management };
  }, [role]);

  const normalizedRequests = useMemo(
    () =>
      requests.map((request) => ({
        ...request,
        status:
          request.status === "Converted to Action"
            ? ("Escalated" as ClarificationStatus)
            : request.status,
      })),
    [requests]
  );

  const summary = useMemo(
    () => ({
      total: normalizedRequests.length,
      pending: normalizedRequests.filter(
        (item) => item.status === "Pending Management Response"
      ).length,
      review: normalizedRequests.filter(
        (item) =>
          item.status === "Management Responded" ||
          item.status === "Under Board Review"
      ).length,
      further: normalizedRequests.filter(
        (item) => item.status === "Further Clarification Required"
      ).length,
      escalated: normalizedRequests.filter((item) => item.status === "Escalated")
        .length,
      closed: normalizedRequests.filter((item) => item.status === "Closed").length,
    }),
    [normalizedRequests]
  );

  const filtered = useMemo(() => {
    const statusMatches = filter === "All"
      ? normalizedRequests
      : normalizedRequests.filter((item) => item.status === filter);
    const query = searchQuery.trim().toLowerCase();
    if (!query) return statusMatches;
    return statusMatches.filter((item) =>
      [item.request_title, item.loan_account, item.member_name, item.issue_type,
        item.assigned_to, item.status, item.question, item.management_response,
        item.board_review_notes]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [filter, normalizedRequests, searchQuery]);
  useEffect(() => setPage(1), [filter, searchQuery]);
  const paginatedRequests = filtered.slice((page - 1) * pageSize, page * pageSize);

  const selected =
    normalizedRequests.find((item) => item.id === selectedId) || filtered[0] || null;
  const context = selected ? parseContext(selected.question) : null;

  function updateForm(key: keyof typeof emptyForm, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function createRequest() {
    if (!permissions.board) {
      setMessage("Only Board users or KIPROD Admin can create clarification requests.");
      return;
    }
    if (!form.requestTitle.trim() || !form.clarification.trim()) {
      setMessage("Request Title and Clarification Required are mandatory.");
      return;
    }
    const id = institutionId();
    if (!id) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("clarification_requests")
      .insert({
        institution_id: id,
        request_title: form.requestTitle.trim(),
        loan_account: form.loanAccount.trim() || "N/A",
        member_name: form.memberName.trim() || "N/A",
        issue_type: form.issueType,
        question: encodeContext(form),
        requested_by_role: role,
        assigned_to: form.assignedTo.trim() || "Management",
        status: "Pending Management Response",
        management_response: "",
        board_review_notes: "",
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setMessage(`Failed to create request: ${error.message}`);
      return;
    }
    const created = data as ClarificationRequest;
    setRequests((previous) => [created, ...previous]);
    setSelectedId(created.id);
    setForm(emptyForm);
    setMessage("Clarification request created and added to the protected trail.");
    await audit(
      "CLARIFICATION_REQUEST_CREATED",
      created,
      "No request",
      "Pending Management Response",
      `Board clarification raised by ${role}.`
    );
  }

  async function updateRequest(
    updates: Partial<ClarificationRequest>,
    successMessage: string,
    actionType: string,
    oldValue: string,
    newValue: string
  ) {
    if (!selected) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("clarification_requests")
      .update(updates)
      .eq("id", selected.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      setMessage(`Failed to save update: ${error.message}`);
      return;
    }
    const updated = data as ClarificationRequest;
    setRequests((previous) =>
      previous.map((item) => (item.id === updated.id ? updated : item))
    );
    setResponseDraft(updated.management_response || "");
    setBoardNoteDraft(updated.board_review_notes || "");
    setMessage(successMessage);
    await audit(actionType, selected, oldValue, newValue, successMessage);
  }

  function submitManagementResponse() {
    if (!permissions.management || !selected) {
      setMessage("Only Management users or KIPROD Admin can submit a response.");
      return;
    }
    if (!responseDraft.trim()) {
      setMessage("Add the management explanation before submitting.");
      return;
    }
    updateRequest(
      {
        management_response: responseDraft.trim(),
        responded_at: new Date().toISOString(),
        status: "Management Responded",
      },
      "Management response submitted. The matter is ready for Board review.",
      "MANAGEMENT_RESPONSE_SUBMITTED",
      selected.management_response || "No response",
      responseDraft.trim()
    );
  }

  function startBoardReview() {
    if (!permissions.board || !selected) return;
    updateRequest(
      { status: "Under Board Review", reviewed_at: new Date().toISOString() },
      "Board review opened.",
      "BOARD_REVIEW_OPENED",
      String(selected.status),
      "Under Board Review"
    );
  }

  function saveBoardNote() {
    if (!permissions.board || !selected) {
      setMessage("Only Board users or KIPROD Admin can add Board notes.");
      return;
    }
    updateRequest(
      { board_review_notes: boardNoteDraft.trim() },
      "Board note saved without changing the original question.",
      "BOARD_NOTE_SAVED",
      selected.board_review_notes || "No Board note",
      boardNoteDraft.trim() || "Blank"
    );
  }

  function boardDecision(status: ClarificationStatus) {
    if (!permissions.board || !selected) {
      setMessage("Only Board users or KIPROD Admin can make this decision.");
      return;
    }
    updateRequest(
      { status, reviewed_at: new Date().toISOString() },
      `Board decision recorded: ${status}.`,
      "BOARD_DECISION_RECORDED",
      String(selected.status),
      status
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-7 lg:p-10">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                Board Accountability Loop
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-5xl">
                Clarification Requests
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                The Clarification Requests page allows Board users to formally request
                management explanations on unresolved risks, overdue actions, NPL
                exposure, escalated accounts, and accountability gaps while preserving
                a protected audit trail.
              </p>
            </div>
            <div className="max-w-sm rounded-2xl border border-amber-400/30 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-400">
                Current role
              </p>
              <p className="mt-1 text-xl font-black text-white">{role}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">
                Board can challenge. Management can respond. Audit history preserves
                the trail.
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Total Requests" value={summary.total} />
          <Metric label="Pending Response" value={summary.pending} />
          <Metric label="Under Board Review" value={summary.review} />
          <Metric label="Further Clarification" value={summary.further} />
          <Metric label="Escalated" value={summary.escalated} />
          <Metric label="Closed" value={summary.closed} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Create Clarification Request
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                The original Board question is protected after creation.
              </p>
            </div>
            <button
              type="button"
              onClick={createRequest}
              disabled={saving || !permissions.board}
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-sm hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Request"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Request Title", "requestTitle", "Formal request title"],
              ["Risk Source", "riskSource", "Early Warning, Watchlist, Board Report..."],
              ["Loan Account", "loanAccount", "Example: LN-0012"],
              ["Member Name", "memberName", "Member or borrower name"],
              ["Assigned To", "assignedTo", "Example: Credit Manager"],
              ["Due Date", "dueDate", ""],
            ].map(([label, key, placeholder]) => (
              <label key={key} className="text-sm font-bold text-slate-800">
                {label}
                <input
                  type={key === "dueDate" ? "date" : "text"}
                  value={form[key as keyof typeof emptyForm]}
                  onChange={(event) =>
                    updateForm(key as keyof typeof emptyForm, event.target.value)
                  }
                  placeholder={placeholder}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none focus:border-amber-500"
                />
              </label>
            ))}

            <label className="text-sm font-bold text-slate-800">
              Risk Class
              <select
                value={form.riskClass}
                onChange={(event) => updateForm("riskClass", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {["Green", "Amber", "Red", "NPL", "Restructured", "High Exposure"].map(
                  (item) => (
                    <option key={item}>{item}</option>
                  )
                )}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-800">
              Priority
              <select
                value={form.priority}
                onChange={(event) => updateForm("priority", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {["Low", "Medium", "High", "Critical"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-800 md:col-span-2">
              Issue Type
              <select
                value={form.issueType}
                onChange={(event) => updateForm("issueType", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {ISSUE_TYPES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-800 md:col-span-2">
              Board Visibility Reason
              <textarea
                value={form.boardVisibilityReason}
                onChange={(event) =>
                  updateForm("boardVisibilityReason", event.target.value)
                }
                placeholder="Why is this matter material enough for Board visibility?"
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950"
              />
            </label>

            <label className="text-sm font-bold text-slate-800 md:col-span-4">
              Clarification Required
              <textarea
                value={form.clarification}
                onChange={(event) => updateForm("clarification", event.target.value)}
                placeholder="State the formal management explanation required."
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950"
              />
            </label>
          </div>
          {message && (
            <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-950">
              {message}
            </p>
          )}
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">Request Register</h2>
                <p className="mt-1 text-xs text-slate-600">Formal governance record</p>
              </div>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="max-w-48 rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-950"
              >
                <option>All</option>
                {STATUSES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <RegisterSearch value={searchQuery} onChange={setSearchQuery} resultCount={filtered.length} placeholder="Search request, account, member, issue or assignee..." />
            </div>

            <div className="mt-5 grid max-h-[760px] gap-3 overflow-y-auto pr-1">
              {loading ? (
                <p className="py-8 text-center text-sm text-slate-600">
                  Loading requests...
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-600">
                  No clarification requests found.
                </p>
              ) : (
                paginatedRequests.map((request) => (
                  <button
                    type="button"
                    key={request.id}
                    onClick={() => {
                      setSelectedId(request.id);
                      setResponseDraft(request.management_response || "");
                      setBoardNoteDraft(request.board_review_notes || "");
                    }}
                    className={`rounded-2xl border p-4 text-left ${
                      selected?.id === request.id
                        ? "border-amber-500 bg-amber-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(
                        String(request.status)
                      )}`}
                    >
                      {request.status}
                    </span>
                    <span className="mt-3 block text-sm font-black text-slate-950">
                      {request.request_title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {request.issue_type || "No issue type"} ·{" "}
                      {request.assigned_to || "Unassigned"}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {request.loan_account || "No account"} ·{" "}
                      {request.member_name || "No member"}
                    </span>
                  </button>
                ))
              )}
            </div>
            <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
          </aside>

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {!selected || !context ? (
              <div className="py-24 text-center">
                <h2 className="text-xl font-black text-slate-950">
                  No request selected
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Create or select a request to open the governance workflow.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusTone(
                        String(selected.status)
                      )}`}
                    >
                      {selected.status}
                    </span>
                    <h2 className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl">
                      {selected.request_title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {selected.issue_type} · {selected.loan_account} ·{" "}
                      {selected.member_name}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-4 text-xs leading-6 text-slate-700">
                    <p>Raised: {formatDate(selected.created_at)}</p>
                    <p>Responded: {formatDate(selected.responded_at)}</p>
                    <p>Reviewed: {formatDate(selected.reviewed_at)}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    ["Risk Source", context.riskSource],
                    ["Risk Class", context.riskClass],
                    ["Priority", context.priority],
                    ["Assigned To", selected.assigned_to || "Unassigned"],
                    ["Due Date", context.dueDate || "Not recorded"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-[10px] font-black uppercase text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-amber-900">
                    Board Visibility Reason
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-900">
                    {context.boardVisibilityReason}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-600">
                    Original Board Question — Protected
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-950">
                    {context.clarification}
                  </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <label className="text-sm font-black text-slate-950">
                      Management Response
                    </label>
                    <textarea
                      value={responseDraft}
                      onChange={(event) => setResponseDraft(event.target.value)}
                      disabled={!permissions.management || selected.status === "Closed"}
                      placeholder="Provide the explanation, action taken, next step and resolution date."
                      className="mt-2 min-h-40 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-950 disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={submitManagementResponse}
                      disabled={saving || !permissions.management || selected.status === "Closed"}
                      className="mt-3 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      Submit Management Response
                    </button>
                  </div>

                  <div>
                    <label className="text-sm font-black text-slate-950">Board Notes</label>
                    <textarea
                      value={boardNoteDraft}
                      onChange={(event) => setBoardNoteDraft(event.target.value)}
                      disabled={!permissions.board}
                      placeholder="Add the Board review note without changing management records."
                      className="mt-2 min-h-40 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-950 disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={saveBoardNote}
                      disabled={saving || !permissions.board}
                      className="mt-3 rounded-xl border border-slate-400 bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Save Board Note
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-950 p-5">
                  <h3 className="text-lg font-black text-white">Board Review Decision</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    Review the response, request further clarification, escalate, or
                    close. Every decision is recorded in Audit History.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={startBoardReview}
                      disabled={saving || !permissions.board}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      Mark Under Board Review
                    </button>
                    <button
                      type="button"
                      onClick={() => boardDecision("Further Clarification Required")}
                      disabled={saving || !permissions.board}
                      className="rounded-xl bg-purple-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      Request Further Clarification
                    </button>
                    <button
                      type="button"
                      onClick={() => boardDecision("Escalated")}
                      disabled={saving || !permissions.board}
                      className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      Escalate
                    </button>
                    <button
                      type="button"
                      onClick={() => boardDecision("Closed")}
                      disabled={saving || !permissions.board}
                      className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      Close Request
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Connected Governance Accountability Loop
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Board Oversight identifies a material unresolved issue. The Board raises a
            clarification request. Management responds. The Board reviews the response.
            Audit History preserves every step.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              ["/board-oversight", "Board Oversight"],
              ["/action-tracker", "Execution Tracker"],
              ["/board-pack", "Board Report"],
              ["/audit-history", "Audit History"],
              ["/role-access", "Role Access"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm hover:bg-slate-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
