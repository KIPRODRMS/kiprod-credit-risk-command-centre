"use client";

import { useEffect, useState } from "react";

const roles = [
  "KIPROD Admin",
  "Board Viewer / Board Member",
  "CEO",
  "Risk Manager",
  "Credit Manager",
  "Portfolio Manager",
  "Loans Manager",
  "Recovery Manager",
];

const accessRows = [
  {
    module: "Institution Profile",
    board: "View",
    management: "View",
    kiprod: "Configure",
  },
  {
    module: "Portfolio Upload",
    board: "No access",
    management: "Upload / Validate",
    kiprod: "Configure / Support",
  },
  {
    module: "Executive Cockpit",
    board: "View",
    management: "View",
    kiprod: "View all institutions",
  },
  {
    module: "Early Warning",
    board: "View summary",
    management: "Manage",
    kiprod: "View / Support",
  },
  {
    module: "Watchlist",
    board: "View",
    management: "Manage",
    kiprod: "View / Support",
  },
  {
    module: "Execution Tracker",
    board: "View / Request clarification",
    management: "Update actions",
    kiprod: "Audit / Support",
  },
  {
    module: "Board Report",
    board: "View / Print",
    management: "Prepare",
    kiprod: "Configure template",
  },
  {
    module: "Board Oversight",
    board: "View accountability",
    management: "View limited",
    kiprod: "View all institutions",
  },
  {
    module: "Audit / Accountability History",
    board: "View",
    management: "No delete rights",
    kiprod: "System owner",
  },
];

export default function RoleAccessPage() {
  const [currentRole, setCurrentRole] = useState("CEO");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("kiprodCurrentRole");
    if (stored) setCurrentRole(stored);
  }, []);

  function saveRole() {
    localStorage.setItem("kiprodCurrentRole", currentRole);
    setSaved(true);
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <p style={styles.kicker}>Governance & Access Control</p>
        <h1 style={styles.title}>Role Access Matrix</h1>
        <p style={styles.subtitle}>
          Define who can prepare, manage, view, oversee, and challenge credit
          risk information. This MVP creates the access model before backend
          authentication is introduced.
        </p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Current User Role Simulation</h2>
        <p style={styles.helper}>
          For now this only simulates role behaviour in localStorage. Real access
          control will come later through login, database roles, and server-side
          permissions.
        </p>

        <div style={styles.roleRow}>
          <select
            style={styles.select}
            value={currentRole}
            onChange={(e) => {
              setCurrentRole(e.target.value);
              setSaved(false);
            }}
          >
            {roles.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>

          <button style={styles.button} onClick={saveRole}>
            Save Current Role
          </button>
        </div>

        {saved && (
          <p style={styles.success}>
            Current role saved as {currentRole}. Board Oversight can now read
            this role context.
          </p>
        )}
      </section>

      <section style={styles.tableCard}>
        <h2 style={styles.sectionTitle}>MVP Access Matrix</h2>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Module</th>
                <th style={styles.th}>Board</th>
                <th style={styles.th}>Management</th>
                <th style={styles.th}>KIPROD Admin</th>
              </tr>
            </thead>
            <tbody>
              {accessRows.map((row) => (
                <tr key={row.module}>
                  <td style={styles.tdStrong}>{row.module}</td>
                  <td style={styles.td}>{row.board}</td>
                  <td style={styles.td}>{row.management}</td>
                  <td style={styles.td}>{row.kiprod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
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
    maxWidth: "1000px",
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
    maxWidth: "880px",
  },
  card: {
    background: "#101621",
    border: "1px solid rgba(214,168,79,0.25)",
    borderRadius: "20px",
    padding: "28px",
    maxWidth: "1000px",
    marginBottom: "28px",
  },
  tableCard: {
    background: "#101621",
    border: "1px solid rgba(214,168,79,0.25)",
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
  roleRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginTop: "18px",
  },
  select: {
    background: "#080b12",
    color: "#fff",
    border: "1px solid #273244",
    borderRadius: "12px",
    padding: "12px 14px",
    minWidth: "280px",
  },
  button: {
    background: "#d6a84f",
    color: "#080b12",
    border: "none",
    borderRadius: "999px",
    padding: "12px 20px",
    fontWeight: 800,
    cursor: "pointer",
  },
  success: {
    color: "#7ee787",
    marginTop: "16px",
    fontWeight: 600,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "18px",
  },
  th: {
    textAlign: "left",
    padding: "14px",
    color: "#d6a84f",
    borderBottom: "1px solid #273244",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  td: {
    padding: "14px",
    borderBottom: "1px solid #1d2635",
    color: "#d7dce5",
  },
  tdStrong: {
    padding: "14px",
    borderBottom: "1px solid #1d2635",
    color: "#fff",
    fontWeight: 800,
  },
};