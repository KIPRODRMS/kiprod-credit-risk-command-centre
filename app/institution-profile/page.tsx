"use client";

import { useEffect, useState } from "react";

type InstitutionProfile = {
  institutionName: string;
  institutionType: string;
  primaryContact: string;
  riskLead: string;
  boardChair: string;
  reportingMonth: string;
  governanceMode: string;
};

const defaultProfile: InstitutionProfile = {
  institutionName: "",
  institutionType: "SACCO",
  primaryContact: "",
  riskLead: "",
  boardChair: "",
  reportingMonth: "",
  governanceMode: "Management prepares. Board oversees.",
};

export default function InstitutionProfilePage() {
  const [profile, setProfile] = useState<InstitutionProfile>(defaultProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("kiprodInstitutionProfile");
    if (stored) {
      setProfile(JSON.parse(stored));
    }
  }, []);

  function updateField(field: keyof InstitutionProfile, value: string) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaved(false);
  }

  function saveProfile() {
    localStorage.setItem("kiprodInstitutionProfile", JSON.stringify(profile));
    setSaved(true);
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <p style={styles.kicker}>KIPROD Credit Risk Command Centre</p>
        <h1 style={styles.title}>Institution Profile</h1>
        <p style={styles.subtitle}>
          Configure the institution identity, reporting context, and governance
          ownership before management and board reporting begins.
        </p>
      </section>

      <section style={styles.card}>
        <div style={styles.grid}>
          <label style={styles.label}>
            Institution Name
            <input
              style={styles.input}
              value={profile.institutionName}
              onChange={(e) => updateField("institutionName", e.target.value)}
              placeholder="Example: Wananchi SACCO"
            />
          </label>

          <label style={styles.label}>
            Institution Type
            <select
              style={styles.input}
              value={profile.institutionType}
              onChange={(e) => updateField("institutionType", e.target.value)}
            >
              <option>SACCO</option>
              <option>Bank</option>
              <option>Microfinance Institution</option>
              <option>Fintech Lender</option>
              <option>Credit Provider</option>
            </select>
          </label>

          <label style={styles.label}>
            Primary Contact
            <input
              style={styles.input}
              value={profile.primaryContact}
              onChange={(e) => updateField("primaryContact", e.target.value)}
              placeholder="CEO / Senior Contact"
            />
          </label>

          <label style={styles.label}>
            Risk Lead
            <input
              style={styles.input}
              value={profile.riskLead}
              onChange={(e) => updateField("riskLead", e.target.value)}
              placeholder="Risk Manager / Credit Risk Lead"
            />
          </label>

          <label style={styles.label}>
            Board Chair / Board Risk Lead
            <input
              style={styles.input}
              value={profile.boardChair}
              onChange={(e) => updateField("boardChair", e.target.value)}
              placeholder="Board Chair or Board Risk Committee Chair"
            />
          </label>

          <label style={styles.label}>
            Reporting Month
            <input
              style={styles.input}
              value={profile.reportingMonth}
              onChange={(e) => updateField("reportingMonth", e.target.value)}
              placeholder="Example: July 2026"
            />
          </label>
        </div>

        <label style={styles.label}>
          Governance Mode
          <textarea
            style={styles.textarea}
            value={profile.governanceMode}
            onChange={(e) => updateField("governanceMode", e.target.value)}
          />
        </label>

        <button style={styles.button} onClick={saveProfile}>
          Save Institution Profile
        </button>

        {saved && (
          <p style={styles.success}>
            Institution profile saved. Board Oversight and reporting context can
            now use this institution setup.
          </p>
        )}
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
    maxWidth: "980px",
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
    maxWidth: "850px",
  },
  card: {
    background: "#101621",
    border: "1px solid rgba(214,168,79,0.25)",
    borderRadius: "20px",
    padding: "28px",
    maxWidth: "1000px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
    marginBottom: "20px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#e8e0d3",
    fontSize: "14px",
    fontWeight: 600,
  },
  input: {
    background: "#080b12",
    color: "#fff",
    border: "1px solid #273244",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "14px",
  },
  textarea: {
    background: "#080b12",
    color: "#fff",
    border: "1px solid #273244",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "14px",
    minHeight: "100px",
    resize: "vertical",
  },
  button: {
    marginTop: "24px",
    background: "#d6a84f",
    color: "#080b12",
    border: "none",
    borderRadius: "999px",
    padding: "13px 22px",
    fontWeight: 800,
    cursor: "pointer",
  },
  success: {
    color: "#7ee787",
    marginTop: "18px",
    fontWeight: 600,
  },
};