"use client";

import { useEffect, useMemo, useState } from "react";

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

const sampleAuditLogs: AuditLog[] = [
  {
    id: "audit-001",
    createdAt: new Date().toISOString(),
    module: "Action Tracker",
    actionType: "ACTION_STATUS_CHANGED",
    recordRef: "Sample Loan Account",
    oldValue: "Pending",
    newValue: "In Progress",
    role: "Risk Manager",
    user: "MVP User",
    note: "Sample audit record showing how status changes will be preserved.",
  },
  {
    id: "audit-002",
    createdAt: new Date().toISOString(),
    module: "Board Oversight",
    actionType: "BOARD_REVIEWED_RISK",
    recordRef: "Sample NPL Exposure",
    oldValue: "Not reviewed",
    newValue: "Reviewed by board",
    role: "Board Viewer / Board Member",
    user: "MVP User",
    note: "Sample board oversight record for governance visibility.",
  },
];

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

function saveAuditLogs(logs: AuditLog[]) {
  localStorage.setItem("kiprodAuditLogs", JSON.stringify(logs));
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export default function AuditHistoryPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterModule, setFilterModule] = useState("All");
  const [filterAction, setFilterAction] = useState("All");

  useEffect(() => {
    const existingLogs = readAuditLogs();
    setLogs(existingLogs);
  }, []);

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
      const moduleMatches =
        filterModule === "All" || log.module === filterModule;

      const actionMatches =
        filterAction === "All" || log.actionType === filterAction;

      return moduleMatches && actionMatches;
    });
  }, [logs, filterModule, filterAction]);

  function addSampleLogs() {
    const existingLogs = readAuditLogs();

    const newLogs = sampleAuditLogs.map((log) => ({
      ...log,
      id: `${log.id}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      role: localStorage.getItem("kiprodCurrentRole") || log.role,
    }));

    const updatedLogs = [...newLogs, ...existingLogs];

    saveAuditLogs(updatedLogs);
    setLogs(updatedLogs);
  }

  function clearAuditLogs() {
    const confirmed = window.confirm(
      "This will clear MVP audit history from localStorage. Continue?"
    );

    if (!confirmed) return;

    localStorage.removeItem("kiprodAuditLogs");
    setLogs([]);
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <p style={styles.kicker}>Governance & Accountability</p>

        <h1 style={styles.title}>Audit History</h1>

        <p style={styles.subtitle}>
          Preserve a record of important changes across the Command Centre,
          including action updates, officer changes, status movement, board
          reviews, and clarification requests.
        </p>

        <div style={styles.actions}>
          <button style={styles.primaryButton} onClick={addSampleLogs}>
            Add Sample Audit Logs
          </button>

          <button style={styles.secondaryButton} onClick={clearAuditLogs}>
            Clear MVP Logs
          </button>
        </div>
      </section>

      <section style={styles.metricsGrid}>
        <MetricCard label="Total Audit Records" value={logs.length} />
        <MetricCard
          label="Modules Tracked"
          value={Array.from(new Set(logs.map((log) => log.module))).length}
        />
        <MetricCard
          label="Action Types"
          value={Array.from(new Set(logs.map((log) => log.actionType))).length}
        />
      </section>

      <section style={styles.card}>
        <div style={styles.filterRow}>
          <label style={styles.label}>
            Filter by Module
            <select
              style={styles.select}
              value={filterModule}
              onChange={(event) => setFilterModule(event.target.value)}
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
              onChange={(event) => setFilterAction(event.target.value)}
            >
              {actionTypes.map((actionType) => (
                <option key={actionType}>{actionType}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Audit Log Records</h2>

        <p style={styles.helper}>
          This page is currently reading from localStorage. In the backend phase,
          these records should be protected from management deletion or silent
          editing.
        </p>

        {filteredLogs.length === 0 ? (
          <p style={styles.empty}>
            No audit records found yet. Click “Add Sample Audit Logs” to preview
            the structure.
          </p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date / Time</th>
                  <th style={styles.th}>Module</th>
                  <th style={styles.th}>Action Type</th>
                  <th style={styles.th}>Record</th>
                  <th style={styles.th}>Old Value</th>
                  <th style={styles.th}>New Value</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Note</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={styles.td}>{formatDate(log.createdAt)}</td>
                    <td style={styles.tdStrong}>{log.module}</td>
                    <td style={styles.td}>{log.actionType}</td>
                    <td style={styles.td}>{log.recordRef}</td>
                    <td style={styles.td}>{log.oldValue}</td>
                    <td style={styles.td}>{log.newValue}</td>
                    <td style={styles.td}>{log.role}</td>
                    <td style={styles.td}>{log.user}</td>
                    <td style={styles.td}>{log.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function MetricCard({ label, value }: { label: string; value: number }) {
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
    padding: "48px",
    fontFamily: "Manrope, sans-serif",
  },

  header: {
    maxWidth: "1100px",
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

  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "18px",
    marginBottom: "28px",
    maxWidth: "1200px",
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
    maxWidth: "1200px",
    marginBottom: "28px",
  },

  warningBox: {
    background: "rgba(214,168,79,0.08)",
    border: "1px solid rgba(214,168,79,0.35)",
    borderRadius: "20px",
    padding: "28px",
    maxWidth: "1200px",
  },

  sectionTitle: {
    margin: "0 0 10px",
    fontSize: "22px",
  },

  helper: {
    color: "#b7bdc8",
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
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "14px",
    color: "#d6a84f",
    borderBottom: "1px solid #273244",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px",
    borderBottom: "1px solid #1d2635",
    color: "#d7dce5",
    verticalAlign: "top",
    fontSize: "14px",
  },

  tdStrong: {
    padding: "14px",
    borderBottom: "1px solid #1d2635",
    color: "#fff",
    fontWeight: 800,
    verticalAlign: "top",
    fontSize: "14px",
  },
};