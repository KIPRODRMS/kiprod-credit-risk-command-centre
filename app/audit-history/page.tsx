"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  getCurrentActor,
  getInstitutionId,
} from "@/lib/institutionMaster";
import Pagination from "../components/Pagination";
import RegisterSearch from "../components/RegisterSearch";
import {
  assignedRolesFromUser,
  normaliseRole,
  type PortalRole,
} from "@/lib/accessControl";

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

type AuditChange = {
  label: string;
  oldValue: string;
  newValue: string;
};

type AuditChangeSummary = {
  headline: string;
  changes: AuditChange[];
};

const FIELD_LABELS: Record<string, string> = {
  institutionName: "Institution name",
  institutionType: "Institution type",
  reportingMonth: "Reporting month",
  reportingCurrency: "Reporting currency",
  riskLead: "Risk lead",
  creditManager: "Credit manager",
  recoveryLead: "Recovery lead",
  boardChair: "Board Chair / Risk Lead",
  countyRegion: "County / region",
  primaryContact: "Primary contact",
  boardReportingFrequency: "Board reporting frequency",
  governanceMode: "Governance mode",
};

function readAuditLogs(): AuditLog[] {
  const raw = localStorage.getItem("kiprodAuditLogs");

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function parseAuditObject(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionLabel(actionType: string): string {
  return titleCase(actionType || "Audit event");
}

function changeSubject(log: AuditLog): string {
  const executionField = log.actionType.match(/^EXECUTION_(.+)_UPDATED$/)?.[1];
  if (executionField) return titleCase(executionField);
  if (log.module === "Clarification Requests") return "Clarification status";
  if (log.module === "Board Report") return "Board Report value";
  if (log.module === "Board Oversight") return "Board review outcome";
  if (log.module === "Portfolio Upload") return "Portfolio record";
  return "Recorded value";
}

function buildChangeSummary(log: AuditLog): AuditChangeSummary {
  const oldObject = parseAuditObject(log.oldValue);
  const newObject = parseAuditObject(log.newValue);

  if (newObject) {
    const keys = Array.from(
      new Set([...Object.keys(oldObject || {}), ...Object.keys(newObject)])
    );
    const changes = keys
      .filter((key) => {
        if (!oldObject) return formatAuditValue(newObject[key]) !== "Not set";
        return JSON.stringify(oldObject[key]) !== JSON.stringify(newObject[key]);
      })
      .map((key) => ({
        label: FIELD_LABELS[key] || titleCase(key),
        oldValue: oldObject ? formatAuditValue(oldObject[key]) : "Not previously recorded",
        newValue: formatAuditValue(newObject[key]),
      }));

    if (!oldObject) {
      return {
        headline: `Master Institution Profile created with ${changes.length} populated ${
          changes.length === 1 ? "field" : "fields"
        }.`,
        changes,
      };
    }

    return {
      headline:
        changes.length > 0
          ? `${changes.length} Institution Profile ${
              changes.length === 1 ? "field was" : "fields were"
            } updated.`
          : "Institution Profile saved with no master-field changes.",
      changes,
    };
  }

  const oldValue = formatAuditValue(log.oldValue);
  const newValue = formatAuditValue(log.newValue);

  if (log.actionType === "PORTFOLIO_UPLOADED") {
    return {
      headline: `Portfolio upload completed: ${newValue}.`,
      changes: [{ label: "Portfolio state", oldValue, newValue }],
    };
  }

  if (oldValue === "Not set") {
    return {
      headline: `${actionLabel(log.actionType)} recorded as ${newValue}.`,
      changes: [],
    };
  }

  if (oldValue === newValue) {
    return {
      headline: `${actionLabel(log.actionType)} recorded with no value change.`,
      changes: [],
    };
  }

  const subject = changeSubject(log);
  return {
    headline: `${subject} changed from ${oldValue} to ${newValue}.`,
    changes: [{ label: subject, oldValue, newValue }],
  };
}

function technicalValue(value: string): string {
  const objectValue = parseAuditObject(value);
  return objectValue ? JSON.stringify(objectValue, null, 2) : formatAuditValue(value);
}

function auditVisibleToRole(role: PortalRole | null, log: AuditLog): boolean {
  if (!role || role === "KIPROD Admin" || role === "Institution Admin") return true;

  const moduleName = log.module.toLowerCase();
  const evidence = [
    log.module,
    log.actionType,
    log.recordRef,
    log.oldValue,
    log.newValue,
    log.note,
  ].join(" ").toLowerCase();
  const containsAny = (...terms: string[]) => terms.some((term) => evidence.includes(term));

  if (role === "Board Chair" || role === "Board Member" || role === "Board Secretary") {
    return containsAny("board", "clarification", "escalat", "governance", "report opened", "report downloaded", "closed");
  }
  if (role === "CEO") {
    return containsAny("executive", "board", "clarification", "escalat", "overdue", "management response", "portfolio upload", "report");
  }
  if (role === "Risk Manager") {
    return containsAny("risk", "early warning", "watchlist", "execution", "clarification", "escalat");
  }
  if (role === "Credit Manager") {
    return containsAny("credit", "early warning", "watchlist", "execution", "clarification", "arrears");
  }
  if (role === "Portfolio/Loans Manager") {
    return containsAny("portfolio", "loan", "upload", "execution", "clarification", "watchlist");
  }
  if (role === "Recovery Manager") {
    return containsAny("recovery", "npl", "execution", "clarification", "watchlist");
  }
  return moduleName.length > 0;
}

export default function AuditHistoryPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [viewerRole, setViewerRole] = useState<PortalRole | null>(null);
  const [filterModule, setFilterModule] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading protected audit records...");
  const pageSize = 10;

  const loadAuditHistory = useCallback(async () => {
    setLoading(true);
    const institutionId = getInstitutionId();
    const localLogs = readAuditLogs();
    const { data: authData } = await supabase.auth.getUser();
    const { data: profile } = authData.user
      ? await supabase
          .from("user_profiles")
          .select("roles")
          .eq("user_id", authData.user.id)
          .maybeSingle()
      : { data: null };
    const profileRoles = Array.isArray(profile?.roles)
      ? profile.roles.map(normaliseRole).filter((role): role is PortalRole => Boolean(role))
      : [];
    const assignedRoles = profileRoles.length
      ? profileRoles
      : assignedRolesFromUser(authData.user);
    const simulatedRole = normaliseRole(localStorage.getItem("kiprodCurrentRole"));
    const currentRole = simulatedRole && assignedRoles.includes(simulatedRole)
      ? simulatedRole
      : assignedRoles[0] || null;
    setViewerRole(currentRole);

    if (localLogs.length > 0) setLogs(localLogs);

    if (!institutionId && currentRole !== "KIPROD Admin") {
      setLogs(localLogs);
      setMessage(
        "Database audit history is waiting for NEXT_PUBLIC_DEFAULT_INSTITUTION_ID. Local fallback is active."
      );
      setLoading(false);
      return;
    }

    if (localLogs.length > 0) {
      const actor = await getCurrentActor();
      const { error: migrationError } = await supabase.from("audit_logs").insert(
        localLogs.map((log) => ({
          institution_id: institutionId,
          module: log.module,
          action_type: log.actionType,
          record_ref: log.recordRef,
          old_value: log.oldValue,
          new_value: log.newValue,
          role: log.role || actor.role,
          user_name: log.user || actor.name,
          note: log.note,
          created_at: log.createdAt,
        }))
      );
      if (!migrationError) localStorage.removeItem("kiprodAuditLogs");
    }

    let auditQuery = supabase
      .from("audit_logs")
      .select(
        "id,created_at,module,action_type,record_ref,old_value,new_value,role,user_name,note"
      )
      .order("created_at", { ascending: false });
    if (currentRole !== "KIPROD Admin") {
      auditQuery = auditQuery.eq("institution_id", institutionId);
    }
    const { data, error } = await auditQuery;

    if (error) {
      setLogs(localLogs);
      setMessage(`Database audit history unavailable: ${error.message}`);
      setLoading(false);
      return;
    }

    setLogs(
      (data || []).map((row) => ({
        id: String(row.id),
        createdAt: String(row.created_at || ""),
        module: String(row.module || ""),
        actionType: String(row.action_type || ""),
        recordRef: String(row.record_ref || ""),
        oldValue: String(row.old_value || ""),
        newValue: String(row.new_value || ""),
        role: String(row.role || ""),
        user: String(row.user_name || ""),
        note: String(row.note || ""),
      }))
    );
    setMessage(currentRole === "KIPROD Admin"
      ? "Showing the platform-wide, append-only support and diagnostic trail."
      : `Showing the read-only ${currentRole || "role"} audit view for this institution.`);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAuditHistory(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAuditHistory]);

  const modules = useMemo(() => {
    const uniqueModules = Array.from(new Set(logs.map((log) => log.module)));
    return ["All", ...uniqueModules];
  }, [logs]);

  const actionTypes = useMemo(() => {
    const uniqueActions = Array.from(new Set(logs.map((log) => log.actionType)));
    return ["All", ...uniqueActions];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!auditVisibleToRole(viewerRole, log)) return false;
      const moduleMatches =
        filterModule === "All" || log.module === filterModule;

      const actionMatches =
        filterAction === "All" || log.actionType === filterAction;

      const query = searchQuery.trim().toLowerCase();
      const searchMatches = !query || [log.module, log.actionType, log.recordRef,
        log.oldValue, log.newValue, log.role, log.user, log.note]
        .some((value) => String(value || "").toLowerCase().includes(query));
      return moduleMatches && actionMatches && searchMatches;
    });
  }, [logs, viewerRole, filterModule, filterAction, searchQuery]);

  const auditSummary = useMemo(() => {
    const modulesTracked = new Set(
      filteredLogs.map((log) => log.module.trim()).filter(Boolean)
    );
    const actionTypesTracked = new Set(
      filteredLogs.map((log) => log.actionType.trim()).filter(Boolean)
    );

    return {
      totalRecords: filteredLogs.length,
      modulesTracked: modulesTracked.size,
      actionTypesTracked: actionTypesTracked.size,
    };
  }, [filteredLogs]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <p style={styles.kicker}>Read-only governance evidence</p>

        <h1 style={styles.title}>Audit History</h1>

        <p style={styles.subtitle}>
          {viewerRole || "Your role"} sees the audit evidence relevant to its
          responsibility. Records can be reviewed and searched, but never edited
          or deleted from this workspace.
        </p>

        <div style={styles.actions}>
          <button
            style={styles.primaryButton}
            onClick={() => void loadAuditHistory()}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Audit History"}
          </button>
        </div>
        <p style={styles.syncMessage} role="status">{message}</p>
      </section>

      <section style={styles.metricsGrid}>
        <MetricCard
          label="Total Audit Records"
          value={loading && logs.length === 0 ? "—" : auditSummary.totalRecords}
        />
        <MetricCard
          label="Modules Tracked"
          value={loading && logs.length === 0 ? "—" : auditSummary.modulesTracked}
        />
        <MetricCard
          label="Action Types"
          value={loading && logs.length === 0 ? "—" : auditSummary.actionTypesTracked}
        />
      </section>

      <p style={styles.metricContext}>
        Summary counters use the same {filteredLogs.length}-record dataset shown
        in the register below and update with its filters and search.
      </p>

      <section style={styles.card}>
        <div style={styles.filterRow}>
          <label style={styles.label}>
            Filter by Module
            <select
              style={styles.select}
              value={filterModule}
              onChange={(event) => {
                setFilterModule(event.target.value);
                setPage(1);
              }}
            >
              {modules.map((module) => (
                <option key={module}>{module}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Filter by Action Type
            <select
              style={styles.select}
              value={filterAction}
              onChange={(event) => {
                setFilterAction(event.target.value);
                setPage(1);
              }}
            >
              {actionTypes.map((actionType) => (
                <option key={actionType}>{actionType}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginTop: 16 }}>
          <RegisterSearch
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setPage(1);
            }}
            resultCount={filteredLogs.length}
            placeholder="Search record, module, action, user or note..."
          />
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Audit Log Records</h2>

        <p style={{ ...styles.helper, color: "#cbd5e1", fontWeight: 600 }}>
          Audit records are read from the institution&apos;s shared database trail.
          Each change is summarized in plain language; expand its technical
          details to inspect the complete old and new values. The Command Centre
          client can append records but cannot silently edit or delete them.
        </p>

        {filteredLogs.length === 0 ? (
          <p style={styles.empty}>
            No audit records match the selected filters.
          </p>
        ) : (
          <div className="audit-history-register" style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date / Time</th>
                  <th style={styles.th}>Module</th>
                  <th style={styles.th}>Action Type</th>
                  <th style={styles.th}>Record</th>
                  <th style={styles.th}>Change Summary</th>
                  <th style={styles.th}>Performed By</th>
                  <th style={styles.th}>Note</th>
                </tr>
              </thead>

              <tbody>
                {paginatedLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={styles.td}>{formatDate(log.createdAt)}</td>
                    <td style={styles.tdStrong}>{log.module}</td>
                    <td style={styles.td}>{actionLabel(log.actionType)}</td>
                    <td style={styles.td}>{log.recordRef}</td>
                    <td style={styles.changeCell}>
                      <ChangeSummary log={log} />
                    </td>
                    <td style={styles.td}>
                      <strong style={styles.actorName}>{log.user || "MVP User"}</strong>
                      <span style={styles.actorRole}>{log.role || "Role not recorded"}</span>
                    </td>
                    <td style={styles.td}>{log.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={filteredLogs.length}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>

      <section style={styles.warningBox}>
        <h2 style={styles.sectionTitle}>Why This Matters</h2>

        <p style={styles.helper}>
          The audit history protects the accountability trail. Management can
          update actions, but the institution should still retain a record of
          what changed, when it changed, and under whose role. This becomes very
          important for board oversight, internal audit, risk governance and
          KIPROD assurance reviews.
        </p>
      </section>
    </main>
  );
}

function ChangeSummary({ log }: { log: AuditLog }) {
  const summary = buildChangeSummary(log);
  const visibleChanges = summary.changes.slice(0, 4);
  const remainingChanges = summary.changes.length - visibleChanges.length;

  return (
    <div style={styles.changeSummary}>
      <p className="audit-history-headline" style={styles.changeHeadline}>
        {summary.headline}
      </p>

      {visibleChanges.length > 0 ? (
        <div style={styles.changeList}>
          {visibleChanges.map((change) => (
            <div style={styles.changeItem} key={`${change.label}-${change.oldValue}-${change.newValue}`}>
              <span className="audit-history-field-label" style={styles.changeLabel}>
                {change.label}
              </span>
              <span style={styles.changeValues}>
                <span className="audit-history-old-value" style={styles.oldValue}>
                  {change.oldValue}
                </span>
                <span
                  aria-hidden="true"
                  className="audit-history-arrow"
                  style={styles.changeArrow}
                >
                  →
                </span>
                <span className="audit-history-new-value" style={styles.newValue}>
                  {change.newValue}
                </span>
              </span>
            </div>
          ))}
          {remainingChanges > 0 ? (
            <p className="audit-history-more" style={styles.moreChanges}>
              +{remainingChanges} more {remainingChanges === 1 ? "field" : "fields"} in the full details
            </p>
          ) : null}
        </div>
      ) : null}

      <details style={styles.technicalDetails}>
        <summary className="audit-history-technical-summary" style={styles.technicalSummary}>
          View full technical details
        </summary>
        <div style={styles.technicalGrid}>
          <div style={styles.technicalPanel}>
            <p className="audit-history-technical-label" style={styles.technicalLabel}>
              Old value
            </p>
            <pre className="audit-history-technical-value" style={styles.technicalValue}>
              {technicalValue(log.oldValue)}
            </pre>
          </div>
          <div style={styles.technicalPanel}>
            <p className="audit-history-technical-label" style={styles.technicalLabel}>
              New value
            </p>
            <pre className="audit-history-technical-value" style={styles.technicalValue}>
              {technicalValue(log.newValue)}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={styles.metricCard}>
      <p style={styles.metricLabel}>{label}</p>
      <h2 style={styles.metricValue}>{value}</h2>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#080b12",
    color: "#f5f0e6",
    padding: "32px clamp(20px, 4vw, 48px)",
    fontFamily: "Manrope, sans-serif",
  },

  header: {
    maxWidth: "1500px",
    marginBottom: "32px",
  },

  kicker: {
    color: "#d6a84f",
    fontSize: "13px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    marginBottom: "12px",
  },

  title: {
    fontSize: "42px",
    margin: "0 0 12px",
  },

  subtitle: {
    color: "#b7bdc8",
    fontSize: "17px",
    lineHeight: 1.6,
    maxWidth: "920px",
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    marginTop: "24px",
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

  secondaryButton: {
    background: "rgba(16, 22, 33, 0.88)",
    color: "#f5f0e6",
    border: "1px solid rgba(214,168,79,0.3)",
    borderRadius: "999px",
    padding: "13px 20px",
    fontWeight: 800,
    cursor: "pointer",
  },

  syncMessage: {
    marginTop: "14px",
    color: "#cbd5e1",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "18px",
    marginBottom: "10px",
    maxWidth: "1500px",
  },

  metricContext: {
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: 1.5,
    margin: "0 0 28px",
    maxWidth: "1500px",
  },

  metricCard: {
    background: "#101621",
    border: "1px solid rgba(214,168,79,0.22)",
    borderRadius: "18px",
    padding: "22px",
  },

  metricLabel: {
    color: "#b7bdc8",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: "0 0 10px",
  },

  metricValue: {
    color: "#fff",
    fontSize: "38px",
    margin: "0",
  },

  card: {
    background: "#101621",
    border: "1px solid rgba(214,168,79,0.25)",
    borderRadius: "20px",
    padding: "28px",
    maxWidth: "1500px",
    marginBottom: "28px",
  },

  warningBox: {
    background: "rgba(214,168,79,0.08)",
    border: "1px solid rgba(214,168,79,0.35)",
    borderRadius: "20px",
    padding: "28px",
    maxWidth: "1500px",
  },

  sectionTitle: {
    margin: "0 0 10px",
    fontSize: "22px",
    color: "#ffffff",
  },

  helper: {
    color: "#e2e8f0",
    lineHeight: 1.6,
  },

  empty: {
    color: "#b7bdc8",
    padding: "18px 0",
  },

  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "18px",
  },

  label: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#e8e0d3",
    fontSize: "14px",
    fontWeight: 700,
  },

  select: {
    background: "#080b12",
    color: "#fff",
    border: "1px solid #273244",
    borderRadius: "12px",
    padding: "12px 14px",
    minWidth: "260px",
  },

  tableWrap: {
    overflowX: "auto",
    marginTop: "18px",
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
  },

  table: {
    width: "100%",
    minWidth: "1320px",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "14px",
    color: "#ffffff",
    background: "#12304d",
    borderBottom: "1px solid #273244",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "12px 14px",
    borderBottom: "1px solid #1d2635",
    color: "#26364a",
    verticalAlign: "top",
    fontSize: "14px",
  },

  tdStrong: {
    padding: "12px 14px",
    borderBottom: "1px solid #1d2635",
    color: "#17263a",
    fontWeight: 800,
    verticalAlign: "top",
    fontSize: "14px",
  },

  changeCell: {
    padding: "12px 14px",
    borderBottom: "1px solid #1d2635",
    color: "#26364a",
    verticalAlign: "top",
    fontSize: "14px",
    minWidth: "380px",
    maxWidth: "520px",
  },

  changeSummary: {
    display: "grid",
    gap: "10px",
  },

  changeHeadline: {
    color: "#17263a",
    fontWeight: 800,
    lineHeight: 1.45,
    margin: 0,
  },

  changeList: {
    display: "grid",
    gap: "7px",
  },

  changeItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "9px",
    display: "grid",
    gap: "4px",
    padding: "8px 10px",
  },

  changeLabel: {
    color: "#475569",
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },

  changeValues: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    lineHeight: 1.4,
  },

  oldValue: {
    color: "#64748b",
    textDecoration: "line-through",
    textDecorationColor: "#cbd5e1",
  },

  changeArrow: {
    color: "#b58128",
    fontWeight: 900,
  },

  newValue: {
    color: "#0f5132",
    fontWeight: 800,
  },

  moreChanges: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
    margin: 0,
  },

  technicalDetails: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "8px",
  },

  technicalSummary: {
    color: "#8a5b12",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 900,
  },

  technicalGrid: {
    display: "grid",
    gap: "8px",
    marginTop: "9px",
  },

  technicalPanel: {
    background: "#0f172a",
    borderRadius: "8px",
    minWidth: 0,
    padding: "9px",
  },

  technicalLabel: {
    color: "#d6a84f",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    margin: "0 0 5px",
    textTransform: "uppercase",
  },

  technicalValue: {
    color: "#e2e8f0",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "11px",
    lineHeight: 1.45,
    margin: 0,
    maxHeight: "230px",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  actorName: {
    color: "#17263a",
    display: "block",
    lineHeight: 1.4,
  },

  actorRole: {
    color: "#64748b",
    display: "block",
    fontSize: "12px",
    marginTop: "3px",
  },
};
