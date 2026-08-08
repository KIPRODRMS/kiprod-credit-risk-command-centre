"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  defaultInstitutionProfile,
  loadMasterInstitutionProfile,
  saveMasterInstitutionProfile,
  type InstitutionProfile,
  type MasterProfileSource,
} from "@/lib/institutionMaster";

export default function InstitutionProfilePage() {
  const [profile, setProfile] = useState<InstitutionProfile>(defaultInstitutionProfile);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<MasterProfileSource>("default");
  const [message, setMessage] = useState("Loading shared master record...");

  useEffect(() => {
    let active = true;
    loadMasterInstitutionProfile().then((result) => {
      if (!active) return;
      setProfile(result.profile);
      setSource(result.source);
      setMessage(result.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function updateField(field: keyof InstitutionProfile, value: string) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaved(false);
  }

  async function saveProfile() {
    setSaving(true);
    setSaved(false);
    const result = await saveMasterInstitutionProfile(profile);
    if (result.profile) {
      setProfile(result.profile);
    }
    setSource(result.savedToDatabase ? "supabase" : "local");
    setMessage(result.message);
    setSaved(result.savedToDatabase);
    setSaving(false);
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <p style={styles.kicker}>KIPROD Credit Risk Command Centre</p>
        <h1 style={styles.title}>Institution Profile</h1>
        <p style={styles.subtitle}>
          This is the Command Centre master institutional record. Its identity,
          reporting period and governance ownership flow into every connected
          report and oversight module.
        </p>
        <div
          style={source === "supabase" ? styles.syncActive : styles.syncWarning}
          role="status"
        >
          <strong>
            {source === "supabase" ? "Shared master record active" : "Local fallback active"}
          </strong>
          <span>{message}</span>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.section}>
          <div style={styles.sectionHeading}>
            <span style={styles.sectionNumber}>01</span>
            <div>
              <h2 style={styles.sectionTitle}>Institution Identity</h2>
              <p style={styles.sectionDescription}>
                Identify the institution and its primary operational contact.
              </p>
            </div>
          </div>
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
              County / Region
              <input
                style={styles.input}
                value={profile.countyRegion}
                onChange={(e) => updateField("countyRegion", e.target.value)}
                placeholder="Example: Nairobi County"
              />
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
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeading}>
            <span style={styles.sectionNumber}>02</span>
            <div>
              <h2 style={styles.sectionTitle}>Reporting Context</h2>
              <p style={styles.sectionDescription}>
                Set the period and conventions used across management and Board
                reporting.
              </p>
            </div>
          </div>
          <div style={styles.grid}>
            <label style={styles.label}>
              Reporting Month
              <input
                style={styles.input}
                value={profile.reportingMonth}
                onChange={(e) => updateField("reportingMonth", e.target.value)}
                placeholder="Example: July 2026"
              />
            </label>

            <label style={styles.label}>
              Board Reporting Frequency
              <select
                style={styles.input}
                value={profile.boardReportingFrequency}
                onChange={(e) =>
                  updateField("boardReportingFrequency", e.target.value)
                }
              >
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Biannual</option>
                <option>Annual</option>
                <option>Ad hoc</option>
              </select>
            </label>

            <label style={styles.label}>
              Reporting Currency
              <select
                style={styles.input}
                value={profile.reportingCurrency}
                onChange={(e) =>
                  updateField("reportingCurrency", e.target.value)
                }
              >
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Pound Sterling</option>
              </select>
            </label>
          </div>
        </div>

        <div style={{ ...styles.section, ...styles.lastSection }}>
          <div style={styles.sectionHeading}>
            <span style={styles.sectionNumber}>03</span>
            <div>
              <h2 style={styles.sectionTitle}>Governance Ownership</h2>
              <p style={styles.sectionDescription}>
                Record responsibility for risk, credit performance, recovery,
                and Board oversight.
              </p>
            </div>
          </div>
          <div style={styles.grid}>
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
              Credit Manager
              <input
                style={styles.input}
                value={profile.creditManager}
                onChange={(e) => updateField("creditManager", e.target.value)}
                placeholder="Credit portfolio owner"
              />
            </label>

            <label style={styles.label}>
              Recovery Lead
              <input
                style={styles.input}
                value={profile.recoveryLead}
                onChange={(e) => updateField("recoveryLead", e.target.value)}
                placeholder="Recovery / Remedial Lead"
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
          </div>

          <div style={styles.governanceBox}>
            <p style={styles.governanceLabel}>Governance Mode</p>
            <p style={styles.governanceStatement}>{profile.governanceMode}</p>
            <p style={styles.governanceExplanation}>
              Management users prepare portfolio analysis, update actions, and
              generate reports. Board users review unresolved risks, overdue
              actions, escalations, and governance gaps without editing
              operational records.
            </p>
          </div>
        </div>

        <button
          style={{
            ...styles.button,
            ...(loading || saving ? styles.buttonDisabled : {}),
          }}
          onClick={saveProfile}
          disabled={loading || saving}
        >
          {saving ? "Saving master record..." : "Save Institution Profile"}
        </button>

        {saved && (
          <div style={styles.savedPanel} role="status">
            <p style={styles.success}>
              Shared master record saved successfully. The Board Pack and
              Command Centre header will now use these details.
            </p>
            <div style={styles.actions}>
              <Link href="/portfolio-upload" style={styles.primaryLink}>
                Upload Portfolio
              </Link>
              <Link href="/executive-dashboard" style={styles.secondaryLink}>
                Open Executive Cockpit
              </Link>
            </div>
          </div>
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
  syncActive: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginTop: "18px",
    maxWidth: "760px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "rgba(35,134,54,0.12)",
    border: "1px solid rgba(126,231,135,0.28)",
    color: "#c9f7d0",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  syncWarning: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginTop: "18px",
    maxWidth: "760px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "rgba(214,168,79,0.1)",
    border: "1px solid rgba(214,168,79,0.35)",
    color: "#f5dca9",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  section: {
    paddingBottom: "28px",
    marginBottom: "28px",
    borderBottom: "1px solid #273244",
  },
  lastSection: {
    marginBottom: "0",
  },
  sectionHeading: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    marginBottom: "20px",
  },
  sectionNumber: {
    color: "#d6a84f",
    border: "1px solid rgba(214,168,79,0.35)",
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.08em",
  },
  sectionTitle: {
    margin: "0 0 5px",
    fontSize: "21px",
    color: "#ffffff",
    fontWeight: 800,
  },
  sectionDescription: {
    color: "#c3ceda",
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
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
  governanceBox: {
    marginTop: "22px",
    padding: "20px",
    background: "#080b12",
    border: "1px solid rgba(214,168,79,0.28)",
    borderRadius: "14px",
  },
  governanceLabel: {
    color: "#d6a84f",
    margin: "0 0 8px",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  governanceStatement: {
    color: "#f5f0e6",
    margin: "0 0 9px",
    fontSize: "18px",
    fontWeight: 800,
  },
  governanceExplanation: {
    color: "#aeb6c3",
    margin: 0,
    maxWidth: "850px",
    fontSize: "14px",
    lineHeight: 1.65,
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
  buttonDisabled: {
    cursor: "wait",
    opacity: 0.65,
  },
  success: {
    color: "#7ee787",
    margin: 0,
    fontWeight: 600,
  },
  savedPanel: {
    marginTop: "20px",
    padding: "18px",
    background: "rgba(35,134,54,0.1)",
    border: "1px solid rgba(126,231,135,0.25)",
    borderRadius: "14px",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "16px",
  },
  primaryLink: {
    display: "inline-block",
    background: "#d6a84f",
    color: "#080b12",
    borderRadius: "999px",
    padding: "11px 18px",
    fontSize: "14px",
    fontWeight: 800,
    textDecoration: "none",
  },
  secondaryLink: {
    display: "inline-block",
    color: "#f5f0e6",
    border: "1px solid #465269",
    borderRadius: "999px",
    padding: "10px 18px",
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "none",
  },
};
