"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ClarificationStatus =
  | "Pending Management Response"
  | "Under Board Review"
  | "Further Clarification Required"
  | "Closed"
  | "Escalated"
  | "Converted to Action";

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
  status: ClarificationStatus;
  management_response: string | null;
  board_review_notes: string | null;
  created_at: string;
  responded_at: string | null;
  reviewed_at: string | null;
};

const emptyForm = {
  requestTitle: "",
  loanAccount: "",
  memberName: "",
  issueType: "Overdue Action",
  question: "",
  assignedTo: "",
};

function getInstitutionId(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";
}

function getCurrentRole(): string {
  if (typeof window === "undefined") return "MVP User";
  return localStorage.getItem("kiprodCurrentRole") || "MVP User";
}

function formatDate(value: string | null): string {
  if (!value) return "Not yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getStatusStyle(status: ClarificationStatus): React.CSSProperties {
  if (status === "Pending Management Response") {
    return {
      background: "rgba(245, 158, 11, 0.14)",
      color: "#fbbf24",
      border: "1px solid rgba(251,191,36,0.35)",
    };
  }

  if (status === "Under Board Review") {
    return {
      background: "rgba(59, 130, 246, 0.14)",
      color: "#93c5fd",
      border: "1px solid rgba(147,197,253,0.35)",
    };
  }

  if (status === "Further Clarification Required") {
    return {
      background: "rgba(168, 85, 247, 0.14)",
      color: "#d8b4fe",
      border: "1px solid rgba(216,180,254,0.35)",
    };
  }

  if (status === "Closed") {
    return {
      background: "rgba(34, 197, 94, 0.14)",
      color: "#86efac",
      border: "1px solid rgba(134,239,172,0.35)",
    };
  }

  if (status === "Escalated") {
    return {
      background: "rgba(239, 68, 68, 0.14)",
      color: "#fca5a5",
      border: "1px solid rgba(252,165,165,0.35)",
    };
  }

  return {
    background: "rgba(214,168,79,0.14)",
    color: "#d6a84f",
    border: "1px solid rgba(214,168,79,0.35)",
  };
}

async function createAuditLog(params: {
  actionType: string;
  recordRef: string;
  oldValue: string;
  newValue: string;
  note: string;
}) {
  const institutionId = getInstitutionId();
  const role = getCurrentRole();

  if (!institutionId) return;

  await supabase.from("audit_logs").insert({
    institution_id: institutionId,
    module: "Clarification Requests",
    action_type: params.actionType,
    record_ref: params.recordRef,
    old_value: params.oldValue,
    new_value: params.newValue,
    role,
    user_name: role,
    note: params.note,
  });
}

export default function ClarificationRequestsPage() {
  const [requests, setRequests] = useState<ClarificationRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentRole, setCurrentRole] = useState("MVP User");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentRole(getCurrentRole());
    loadRequests();
  }, []);

  async function loadRequests() {
    const institutionId = getInstitutionId();

    if (!institutionId) {
      setMessage("Missing NEXT_PUBLIC_DEFAULT_INSTITUTION_ID in .env.local.");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("clarification_requests")
      .select("*")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Failed to load clarification requests: ${error.message}`);
      setLoading(false);
      return;
    }

    const loadedRequests = (data || []) as ClarificationRequest[];

    setRequests(loadedRequests);

    if (loadedRequests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(loadedRequests[0].id);
    }

    setLoading(false);
  }

  const summary = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(
        (request) => request.status === "Pending Management Response"
      ).length,
      underReview: requests.filter(
        (request) => request.status === "Under Board Review"
      ).length,
      furtherClarification: requests.filter(
        (request) => request.status === "Further Clarification Required"
      ).length,
      escalated: requests.filter((request) => request.status === "Escalated")
        .length,
      closed: requests.filter((request) => request.status === "Closed").length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "All") return requests;
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const selectedRequest = useMemo(() => {
    return (
      requests.find((request) => request.id === selectedRequestId) ||
      filteredRequests[0] ||
      null
    );
  }, [requests, selectedRequestId, filteredRequests]);

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }
console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("Institution ID:", getInstitutionId());
  async function createRequest() {
    const institutionId = getInstitutionId();

    if (!institutionId) {
      setMessage("Missing institution ID. Check .env.local.");
      return;
    }

    if (!form.requestTitle.trim() || !form.question.trim()) {
      setMessage("Please add a request title and clarification question.");
      return;
    }

    const { data, error } = await supabase
      .from("clarification_requests")
      .insert({
        institution_id: institutionId,
        request_title: form.requestTitle,
        loan_account: form.loanAccount || "N/A",
        member_name: form.memberName || "N/A",
        issue_type: form.issueType,
        question: form.question,
        requested_by_role: currentRole,
        assigned_to: form.assignedTo || "Management",
        status: "Pending Management Response",
        management_response: "",
        board_review_notes: "",
      })
      .select()
      .single();

    if (error) {
      setMessage(`Failed to create request: ${error.message}`);
      return;
    }

    const newRequest = data as ClarificationRequest;

    setRequests((previous) => [newRequest, ...previous]);
    setSelectedRequestId(newRequest.id);
    setForm(emptyForm);
    setMessage("Clarification request saved to Supabase.");

    await createAuditLog({
      actionType: "CLARIFICATION_REQUEST_CREATED",
      recordRef: `${newRequest.loan_account} - ${newRequest.request_title}`,
      oldValue: "No clarification request",
      newValue: "Pending Management Response",
      note: `Clarification request created by ${currentRole}.`,
    });
  }

  async function updateManagementResponse(requestId: string, response: string) {
    const target = requests.find((request) => request.id === requestId);
    if (!target) return;

    const nextStatus: ClarificationStatus = response.trim()
      ? "Under Board Review"
      : "Pending Management Response";

    const respondedAt = response.trim() ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("clarification_requests")
      .update({
        management_response: response,
        responded_at: respondedAt,
        status: nextStatus,
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      setMessage(`Failed to save management response: ${error.message}`);
      return;
    }

    const updatedRequest = data as ClarificationRequest;

    setRequests((previous) =>
      previous.map((request) =>
        request.id === requestId ? updatedRequest : request
      )
    );

    setMessage(
      "Management response saved to Supabase. Matter is awaiting board review."
    );

    await createAuditLog({
      actionType: "MANAGEMENT_RESPONSE_SUBMITTED",
      recordRef: `${target.loan_account} - ${target.request_title}`,
      oldValue: target.management_response || "Blank",
      newValue: response || "Blank",
      note: `Management response submitted. Status moved from ${target.status} to ${nextStatus}.`,
    });
  }

  async function updateBoardReviewNotes(requestId: string, notes: string) {
    const target = requests.find((request) => request.id === requestId);
    if (!target) return;

    const { data, error } = await supabase
      .from("clarification_requests")
      .update({
        board_review_notes: notes,
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      setMessage(`Failed to save board review notes: ${error.message}`);
      return;
    }

    const updatedRequest = data as ClarificationRequest;

    setRequests((previous) =>
      previous.map((request) =>
        request.id === requestId ? updatedRequest : request
      )
    );

    setMessage("Board review notes saved to Supabase.");

    await createAuditLog({
      actionType: "BOARD_REVIEW_NOTES_UPDATED",
      recordRef: `${target.loan_account} - ${target.request_title}`,
      oldValue: target.board_review_notes || "Blank",
      newValue: notes || "Blank",
      note: "Board review notes were updated.",
    });
  }

  async function applyBoardDecision(
    requestId: string,
    decisionStatus: ClarificationStatus
  ) {
    const target = requests.find((request) => request.id === requestId);
    if (!target) return;

    const reviewedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("clarification_requests")
      .update({
        status: decisionStatus,
        reviewed_at: reviewedAt,
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      setMessage(`Failed to save board decision: ${error.message}`);
      return;
    }

    const updatedRequest = data as ClarificationRequest;

    setRequests((previous) =>
      previous.map((request) =>
        request.id === requestId ? updatedRequest : request
      )
    );

    setMessage(`Board decision saved to Supabase: ${decisionStatus}.`);

    await createAuditLog({
      actionType: "BOARD_REVIEW_DECISION_RECORDED",
      recordRef: `${target.loan_account} - ${target.request_title}`,
      oldValue: target.status,
      newValue: decisionStatus,
      note: `Board review decision recorded as ${decisionStatus}.`,
    });
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.kicker}>Board Accountability Loop</p>

          <h1 style={styles.title}>Clarification Requests</h1>

          <p style={styles.subtitle}>
            A controlled governance workspace where board questions, management
            responses, review decisions and audit history are now saved in
            Supabase.
          </p>
        </div>

        <div style={styles.headerPanel}>
          <p style={styles.headerPanelLabel}>Current Role</p>
          <h3 style={styles.headerPanelValue}>{currentRole}</h3>
          <p style={styles.headerPanelText}>
            Board can challenge. Management can respond. Audit history preserves
            the trail.
          </p>
        </div>
      </section>

      <section style={styles.metricsGrid}>
        <MetricCard label="Total Requests" value={summary.total} />
        <MetricCard label="Pending Response" value={summary.pending} />
        <MetricCard label="Under Board Review" value={summary.underReview} />
        <MetricCard
          label="Further Clarification"
          value={summary.furtherClarification}
        />
        <MetricCard label="Escalated" value={summary.escalated} />
        <MetricCard label="Closed" value={summary.closed} />
      </section>

      <section style={styles.createCard}>
        <div style={styles.createHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Create Clarification Request</h2>
            <p style={styles.helper}>
              Raise a formal question on overdue actions, NPL exposure,
              unresolved risk, or accountability gaps.
            </p>
          </div>

          <button style={styles.primaryButton} onClick={createRequest}>
            Create Request
          </button>
        </div>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Request Title
            <input
              style={styles.input}
              value={form.requestTitle}
              onChange={(event) =>
                updateForm("requestTitle", event.target.value)
              }
              placeholder="Example: Explain overdue NPL recovery action"
            />
          </label>

          <label style={styles.label}>
            Loan Account
            <input
              style={styles.input}
              value={form.loanAccount}
              onChange={(event) =>
                updateForm("loanAccount", event.target.value)
              }
              placeholder="Example: LN-0012"
            />
          </label>

          <label style={styles.label}>
            Member Name
            <input
              style={styles.input}
              value={form.memberName}
              onChange={(event) =>
                updateForm("memberName", event.target.value)
              }
              placeholder="Example: Jane Member"
            />
          </label>

          <label style={styles.label}>
            Issue Type
            <select
              style={styles.input}
              value={form.issueType}
              onChange={(event) => updateForm("issueType", event.target.value)}
            >
              <option>Overdue Action</option>
              <option>Escalated Action</option>
              <option>NPL Exposure</option>
              <option>Unassigned Risk</option>
              <option>Watchlist Concern</option>
              <option>Board Report Query</option>
              <option>Governance Alert</option>
            </select>
          </label>

          <label style={styles.label}>
            Assigned To
            <input
              style={styles.input}
              value={form.assignedTo}
              onChange={(event) => updateForm("assignedTo", event.target.value)}
              placeholder="Example: Credit Manager"
            />
          </label>
        </div>

        <label style={styles.label}>
          Clarification Required
          <textarea
            style={styles.textarea}
            value={form.question}
            onChange={(event) => updateForm("question", event.target.value)}
            placeholder="Example: Why has this action remained unresolved past the due date?"
          />
        </label>

        {message && <p style={styles.message}>{message}</p>}
      </section>

      <section style={styles.workspace}>
        <aside style={styles.registerPanel}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Request Register</h2>
              <p style={styles.helperSmall}>
                Select a request to review its response and board decision.
              </p>
            </div>

            <label style={styles.filterLabel}>
              Status
              <select
                style={styles.smallSelect}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>All</option>
                <option>Pending Management Response</option>
                <option>Under Board Review</option>
                <option>Further Clarification Required</option>
                <option>Escalated</option>
                <option>Closed</option>
                <option>Converted to Action</option>
              </select>
            </label>
          </div>

          {loading ? (
            <p style={styles.empty}>Loading Supabase requests...</p>
          ) : filteredRequests.length === 0 ? (
            <p style={styles.empty}>No clarification requests found yet.</p>
          ) : (
            <div style={styles.requestList}>
              {filteredRequests.map((request) => {
                const isSelected = selectedRequest?.id === request.id;

                return (
                  <button
                    key={request.id}
                    style={{
                      ...styles.requestButton,
                      ...(isSelected ? styles.requestButtonActive : {}),
                    }}
                    onClick={() => setSelectedRequestId(request.id)}
                  >
                    <span style={styles.requestButtonTop}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...getStatusStyle(request.status),
                        }}
                      >
                        {request.status}
                      </span>
                    </span>

                    <span style={styles.requestButtonTitle}>
                      {request.request_title}
                    </span>

                    <span style={styles.requestButtonMeta}>
                      {request.issue_type} · {request.assigned_to}
                    </span>

                    <span style={styles.requestButtonMeta}>
                      {request.loan_account} · {request.member_name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section style={styles.detailPanel}>
          {!selectedRequest ? (
            <div style={styles.noSelection}>
              <h2 style={styles.sectionTitle}>No request selected</h2>
              <p style={styles.helper}>
                Create or select a clarification request to open the review
                workspace.
              </p>
            </div>
          ) : (
            <>
              <div style={styles.detailHeader}>
                <div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...getStatusStyle(selectedRequest.status),
                    }}
                  >
                    {selectedRequest.status}
                  </span>

                  <h2 style={styles.detailTitle}>
                    {selectedRequest.request_title}
                  </h2>

                  <p style={styles.detailMeta}>
                    Issue Type: <strong>{selectedRequest.issue_type}</strong>
                  </p>

                  <p style={styles.detailMeta}>
                    Loan Account: <strong>{selectedRequest.loan_account}</strong>{" "}
                    · Member: <strong>{selectedRequest.member_name}</strong>
                  </p>

                  <p style={styles.detailMeta}>
                    Requested by:{" "}
                    <strong>{selectedRequest.requested_by_role}</strong> ·
                    Assigned to: <strong>{selectedRequest.assigned_to}</strong>
                  </p>
                </div>

                <div style={styles.datePanel}>
                  <p>Requested: {formatDate(selectedRequest.created_at)}</p>
                  <p>Responded: {formatDate(selectedRequest.responded_at)}</p>
                  <p>Reviewed: {formatDate(selectedRequest.reviewed_at)}</p>
                </div>
              </div>

              <div style={styles.timeline}>
                <TimelineStep
                  label="Request Raised"
                  active={Boolean(selectedRequest.created_at)}
                />
                <TimelineStep
                  label="Management Response"
                  active={Boolean(selectedRequest.responded_at)}
                />
                <TimelineStep
                  label="Board Review"
                  active={Boolean(selectedRequest.reviewed_at)}
                />
                <TimelineStep
                  label="Final Decision"
                  active={
                    selectedRequest.status === "Closed" ||
                    selectedRequest.status === "Escalated" ||
                    selectedRequest.status === "Converted to Action"
                  }
                />
              </div>

              <div style={styles.infoBox}>
                <p style={styles.infoLabel}>Clarification Required</p>
                <p style={styles.infoText}>{selectedRequest.question}</p>
              </div>

              <div style={styles.splitGrid}>
                <label style={styles.label}>
                  Management Response
                  <textarea
                    style={styles.responseTextarea}
                    value={selectedRequest.management_response || ""}
                    onChange={(event) =>
                      updateManagementResponse(
                        selectedRequest.id,
                        event.target.value
                      )
                    }
                    placeholder="Management should respond here with explanation, action taken, next step and expected resolution date."
                  />
                </label>

                <label style={styles.label}>
                  Board Review Notes
                  <textarea
                    style={styles.responseTextarea}
                    value={selectedRequest.board_review_notes || ""}
                    onChange={(event) =>
                      updateBoardReviewNotes(
                        selectedRequest.id,
                        event.target.value
                      )
                    }
                    placeholder="Example: Response accepted, but recovery timeline should be monitored in the next board pack."
                  />
                </label>
              </div>

              <div style={styles.decisionPanel}>
                <div>
                  <h3 style={styles.decisionTitle}>Board Review Decision</h3>
                  <p style={styles.helperSmall}>
                    After management responds, the board can close, escalate,
                    request more information, or convert the matter into a
                    formal action.
                  </p>
                </div>

                <div style={styles.decisionRow}>
                  <button
                    style={styles.smallButton}
                    onClick={() =>
                      applyBoardDecision(selectedRequest.id, "Closed")
                    }
                  >
                    Accept & Close
                  </button>

                  <button
                    style={styles.smallButton}
                    onClick={() =>
                      applyBoardDecision(
                        selectedRequest.id,
                        "Further Clarification Required"
                      )
                    }
                  >
                    Request More Clarification
                  </button>

                  <button
                    style={styles.smallButtonDanger}
                    onClick={() =>
                      applyBoardDecision(selectedRequest.id, "Escalated")
                    }
                  >
                    Escalate
                  </button>

                  <button
                    style={styles.smallButtonOutline}
                    onClick={() =>
                      applyBoardDecision(
                        selectedRequest.id,
                        "Converted to Action"
                      )
                    }
                  >
                    Convert to Action
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </section>

      <section style={styles.warningBox}>
        <h2 style={styles.sectionTitle}>Supabase Governance Layer Active</h2>

        <p style={styles.helper}>
          Clarification requests are now stored in Supabase instead of browser
          localStorage. This is the first step toward real user accounts, role
          access, notifications, email alerts and protected audit history.
        </p>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.metricCard}>
      <p style={styles.metricLabel}>{label}</p>
      <h2 style={styles.metricValue}>{value}</h2>
    </div>
  );
}

function TimelineStep({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={styles.timelineStep}>
      <span
        style={{
          ...styles.timelineDot,
          ...(active ? styles.timelineDotActive : {}),
        }}
      />
      <span style={active ? styles.timelineTextActive : styles.timelineText}>
        {label}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(214,168,79,0.16), transparent 34%), linear-gradient(135deg, #05070d 0%, #080b12 44%, #111827 100%)",
    color: "#f5f0e6",
    padding: "48px",
    fontFamily: "Manrope, sans-serif",
  },
  header: {
    maxWidth: "1280px",
    margin: "0 auto 32px",
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  kicker: {
    color: "#d6a84f",
    fontSize: "13px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    marginBottom: "12px",
    fontWeight: 900,
  },
  title: {
    fontSize: "46px",
    margin: "0 0 12px",
    letterSpacing: "-0.04em",
  },
  subtitle: {
    color: "#b7bdc8",
    fontSize: "17px",
    lineHeight: 1.6,
    maxWidth: "820px",
  },
  headerPanel: {
    background: "rgba(16, 22, 33, 0.86)",
    border: "1px solid rgba(214,168,79,0.28)",
    borderRadius: "22px",
    padding: "20px",
    width: "320px",
  },
  headerPanelLabel: {
    color: "#d6a84f",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    margin: "0 0 8px",
    fontWeight: 900,
  },
  headerPanelValue: {
    color: "#fff",
    fontSize: "22px",
    margin: "0 0 8px",
  },
  headerPanelText: {
    color: "#b7bdc8",
    lineHeight: 1.5,
    margin: 0,
    fontSize: "14px",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    margin: "0 auto 24px",
    maxWidth: "1280px",
  },
  metricCard: {
    background: "rgba(16, 22, 33, 0.82)",
    border: "1px solid rgba(214,168,79,0.2)",
    borderRadius: "18px",
    padding: "20px",
  },
  metricLabel: {
    color: "#b7bdc8",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: "0 0 10px",
    fontWeight: 800,
  },
  metricValue: {
    color: "#fff",
    fontSize: "34px",
    margin: 0,
  },
  createCard: {
    maxWidth: "1280px",
    margin: "0 auto 24px",
    background: "rgba(16, 22, 33, 0.78)",
    border: "1px solid rgba(214,168,79,0.22)",
    borderRadius: "24px",
    padding: "26px",
  },
  createHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  sectionTitle: {
    margin: "0 0 8px",
    fontSize: "22px",
    color: "#fff",
  },
  helper: {
    color: "#b7bdc8",
    lineHeight: 1.6,
    margin: 0,
  },
  helperSmall: {
    color: "#9ca6b8",
    lineHeight: 1.5,
    margin: 0,
    fontSize: "13px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#e8e0d3",
    fontSize: "13px",
    fontWeight: 800,
  },
  input: {
    background: "rgba(5, 7, 13, 0.9)",
    color: "#fff",
    border: "1px solid #273244",
    borderRadius: "14px",
    padding: "12px 14px",
    fontSize: "14px",
    outline: "none",
  },
  textarea: {
    background: "rgba(5, 7, 13, 0.9)",
    color: "#fff",
    border: "1px solid #273244",
    borderRadius: "14px",
    padding: "12px 14px",
    fontSize: "14px",
    minHeight: "95px",
    resize: "vertical",
    outline: "none",
  },
  responseTextarea: {
    background: "rgba(5, 7, 13, 0.9)",
    color: "#fff",
    border: "1px solid #273244",
    borderRadius: "14px",
    padding: "13px 14px",
    fontSize: "14px",
    minHeight: "150px",
    resize: "vertical",
    outline: "none",
  },
  primaryButton: {
    background: "#d6a84f",
    color: "#080b12",
    border: "none",
    borderRadius: "999px",
    padding: "13px 20px",
    fontWeight: 900,
    cursor: "pointer",
  },
  message: {
    color: "#7ee787",
    marginTop: "16px",
    fontWeight: 800,
  },
  workspace: {
    maxWidth: "1280px",
    margin: "0 auto 24px",
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "22px",
    alignItems: "start",
  },
  registerPanel: {
    background: "rgba(16, 22, 33, 0.82)",
    border: "1px solid rgba(214,168,79,0.22)",
    borderRadius: "24px",
    padding: "22px",
    position: "sticky",
    top: "24px",
  },
  panelHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "18px",
  },
  filterLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#e8e0d3",
    fontSize: "13px",
    fontWeight: 800,
  },
  smallSelect: {
    background: "rgba(5, 7, 13, 0.9)",
    color: "#fff",
    border: "1px solid #273244",
    borderRadius: "12px",
    padding: "11px 12px",
    fontSize: "13px",
    outline: "none",
  },
  requestList: {
    display: "grid",
    gap: "12px",
  },
  requestButton: {
    textAlign: "left",
    width: "100%",
    background: "rgba(5, 7, 13, 0.76)",
    border: "1px solid #273244",
    borderRadius: "18px",
    padding: "16px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  requestButtonActive: {
    border: "1px solid rgba(214,168,79,0.7)",
    background: "rgba(214,168,79,0.08)",
  },
  requestButtonTop: {
    display: "flex",
    justifyContent: "space-between",
  },
  statusBadge: {
    display: "inline-flex",
    alignSelf: "flex-start",
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  requestButtonTitle: {
    color: "#fff",
    fontSize: "15px",
    fontWeight: 900,
    lineHeight: 1.35,
  },
  requestButtonMeta: {
    color: "#9ca6b8",
    fontSize: "12px",
    lineHeight: 1.35,
  },
  detailPanel: {
    background: "rgba(16, 22, 33, 0.82)",
    border: "1px solid rgba(214,168,79,0.22)",
    borderRadius: "24px",
    padding: "26px",
    minHeight: "520px",
  },
  noSelection: {
    padding: "60px 20px",
    textAlign: "center",
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "22px",
  },
  detailTitle: {
    color: "#fff",
    fontSize: "30px",
    letterSpacing: "-0.03em",
    margin: "14px 0 10px",
  },
  detailMeta: {
    color: "#b7bdc8",
    fontSize: "14px",
    margin: "6px 0",
  },
  datePanel: {
    background: "rgba(5, 7, 13, 0.7)",
    border: "1px solid #273244",
    borderRadius: "18px",
    padding: "16px",
    color: "#9ca6b8",
    fontSize: "13px",
    minWidth: "260px",
    lineHeight: 1.6,
  },
  timeline: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "22px",
  },
  timelineStep: {
    background: "rgba(5, 7, 13, 0.54)",
    border: "1px solid #273244",
    borderRadius: "14px",
    padding: "12px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },
  timelineDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#4b5563",
  },
  timelineDotActive: {
    background: "#d6a84f",
    boxShadow: "0 0 0 4px rgba(214,168,79,0.12)",
  },
  timelineText: {
    color: "#8b95a8",
    fontSize: "12px",
    fontWeight: 800,
  },
  timelineTextActive: {
    color: "#f5f0e6",
    fontSize: "12px",
    fontWeight: 900,
  },
  infoBox: {
    background: "rgba(214,168,79,0.08)",
    border: "1px solid rgba(214,168,79,0.24)",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "22px",
  },
  infoLabel: {
    color: "#d6a84f",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 900,
    margin: "0 0 8px",
  },
  infoText: {
    color: "#f5f0e6",
    lineHeight: 1.6,
    margin: 0,
  },
  splitGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "18px",
    marginBottom: "22px",
  },
  decisionPanel: {
    background: "rgba(5, 7, 13, 0.58)",
    border: "1px solid rgba(214,168,79,0.24)",
    borderRadius: "18px",
    padding: "20px",
  },
  decisionTitle: {
    color: "#fff",
    margin: "0 0 8px",
    fontSize: "18px",
  },
  decisionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "16px",
  },
  smallButton: {
    background: "#d6a84f",
    color: "#080b12",
    border: "none",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "13px",
  },
  smallButtonDanger: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "13px",
  },
  smallButtonOutline: {
    background: "transparent",
    color: "#f5f0e6",
    border: "1px solid rgba(214,168,79,0.4)",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "13px",
  },
  empty: {
    color: "#b7bdc8",
    padding: "16px 0",
  },
  warningBox: {
    maxWidth: "1280px",
    margin: "0 auto",
    background: "rgba(214,168,79,0.08)",
    border: "1px solid rgba(214,168,79,0.35)",
    borderRadius: "24px",
    padding: "26px",
  },
};