export default function Home() {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.kicker}>KIPROD Risk Management Services</p>

        <h1 style={styles.title}>Credit Risk Command Centre</h1>

        <p style={styles.subtitle}>
          Board-ready credit risk visibility, early warning monitoring, and
          management action tracking for financial institutions.
        </p>

        <div style={styles.primaryActions}>
          <a style={styles.primaryButton} href="/portfolio-upload">
            Start with Portfolio Upload
          </a>

          <a style={styles.secondaryButton} href="/executive-dashboard">
            Open Executive Dashboard
          </a>
        </div>
      </section>

      <section style={styles.workflowIntro}>
        <h2 style={styles.workflowTitle}>Command Centre Workflow</h2>
        <p style={styles.workflowText}>
          The platform follows a simple risk governance journey: set up the
          institution, upload portfolio data, review risk signals, assign
          management actions, prepare board reporting, and preserve board
          oversight.
        </p>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.sectionKicker}>Step 1</p>
          <h2 style={styles.sectionTitle}>Start Here</h2>
          <p style={styles.sectionText}>
            Configure the institution and upload portfolio data before reviewing
            risk intelligence.
          </p>
        </div>

        <div style={styles.navGrid}>
          <a style={styles.navCard} href="/institution-profile">
            <span style={styles.navTitle}>Institution Profile</span>
            <span style={styles.navText}>
              Set the institution name, reporting month, risk lead and board
              oversight context.
            </span>
          </a>

          <a style={styles.navCard} href="/portfolio-upload">
            <span style={styles.navTitle}>Portfolio Upload</span>
            <span style={styles.navText}>
              Upload and validate portfolio data for credit risk classification.
            </span>
          </a>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.sectionKicker}>Step 2</p>
          <h2 style={styles.sectionTitle}>Management Workspace</h2>
          <p style={styles.sectionText}>
            Management reviews risk, monitors early warning accounts, updates
            actions and prepares board-ready reporting.
          </p>
        </div>

        <div style={styles.navGrid}>
          <a style={styles.navCard} href="/executive-dashboard">
            <span style={styles.navTitle}>Executive Dashboard</span>
            <span style={styles.navText}>
              View portfolio health, early warning signals, watchlist exposure
              and risk intelligence summaries.
            </span>
          </a>

          <a style={styles.navCard} href="/early-warning">
            <span style={styles.navTitle}>Early Warning</span>
            <span style={styles.navText}>
              Review Amber, Red and NPL accounts requiring management attention.
            </span>
          </a>

          <a style={styles.navCard} href="/watchlist">
            <span style={styles.navTitle}>Watchlist</span>
            <span style={styles.navText}>
              Track risky accounts requiring close monitoring, intervention and
              follow-up.
            </span>
          </a>

          <a style={styles.navCard} href="/action-tracker">
            <span style={styles.navTitle}>Action Tracker</span>
            <span style={styles.navText}>
              Assign officers, due dates, status updates and notes for risky
              accounts.
            </span>
          </a>

          <a style={styles.navCard} href="/board-report">
            <span style={styles.navTitle}>Board Report</span>
            <span style={styles.navText}>
              Prepare executive credit risk summaries for board reporting and
              oversight.
            </span>
          </a>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.sectionKicker}>Step 3</p>
          <h2 style={styles.sectionTitle}>Governance & Board Oversight</h2>
          <p style={styles.sectionText}>
            Board users view accountability gaps, unresolved risks, escalated
            actions and governance visibility without operational edit rights.
          </p>
        </div>

        <div style={styles.navGrid}>
          <a style={styles.navCard} href="/role-access">
            <span style={styles.navTitle}>Role Access</span>
            <span style={styles.navText}>
              Define access responsibilities for board, management and KIPROD
              Admin users.
            </span>
          </a>

          <a style={styles.navCard} href="/board-oversight">
            <span style={styles.navTitle}>Board Oversight</span>
            <span style={styles.navText}>
              View unresolved risks, overdue actions, escalated items, NPL
              exposure and accountability gaps.
            </span>
          </a>
<a style={styles.navCard} href="/clarification-requests">
  <span style={styles.navTitle}>Clarification Requests</span>
  <span style={styles.navText}>
    Allow board users to request management explanations on unresolved risks,
    overdue actions, NPL exposure and accountability gaps.
  </span>
</a>
          <a style={styles.navCard} href="/audit-history">
  <span style={styles.navTitle}>Audit History</span>
  <span style={styles.navText}>
    Preserve a record of action changes, status updates, officer changes and
    board clarification requests.
  </span>
</a>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(214,168,79,0.16), transparent 32%), linear-gradient(135deg, #05070d 0%, #080b12 45%, #111827 100%)",
    color: "#f5f0e6",
    fontFamily: "Manrope, sans-serif",
    padding: "56px",
  },

  hero: {
    maxWidth: "1180px",
    margin: "0 auto 46px",
  },

  kicker: {
    color: "#d6a84f",
    fontSize: "13px",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontWeight: 800,
    marginBottom: "18px",
  },

  title: {
    fontSize: "58px",
    lineHeight: 1.05,
    margin: "0 0 18px",
    maxWidth: "860px",
    letterSpacing: "-0.04em",
  },

  subtitle: {
    color: "#b7bdc8",
    fontSize: "20px",
    lineHeight: 1.65,
    maxWidth: "840px",
    marginBottom: "30px",
  },

  primaryActions: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
  },

  primaryButton: {
    background: "#d6a84f",
    color: "#080b12",
    textDecoration: "none",
    borderRadius: "999px",
    padding: "14px 22px",
    fontWeight: 900,
    boxShadow: "0 18px 45px rgba(214,168,79,0.22)",
  },

  secondaryButton: {
    background: "rgba(16, 22, 33, 0.88)",
    color: "#f5f0e6",
    textDecoration: "none",
    border: "1px solid rgba(214,168,79,0.3)",
    borderRadius: "999px",
    padding: "14px 22px",
    fontWeight: 800,
  },

  workflowIntro: {
    maxWidth: "1180px",
    margin: "0 auto 28px",
    background: "rgba(16, 22, 33, 0.72)",
    border: "1px solid rgba(214,168,79,0.22)",
    borderRadius: "22px",
    padding: "26px",
  },

  workflowTitle: {
    margin: "0 0 10px",
    fontSize: "24px",
  },

  workflowText: {
    color: "#b7bdc8",
    fontSize: "16px",
    lineHeight: 1.65,
    margin: 0,
    maxWidth: "940px",
  },

  section: {
    maxWidth: "1180px",
    margin: "0 auto 34px",
  },

  sectionHeader: {
    marginBottom: "16px",
  },

  sectionKicker: {
    color: "#d6a84f",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontWeight: 900,
    margin: "0 0 8px",
  },

  sectionTitle: {
    fontSize: "30px",
    margin: "0 0 8px",
  },

  sectionText: {
    color: "#b7bdc8",
    fontSize: "16px",
    lineHeight: 1.6,
    margin: 0,
    maxWidth: "860px",
  },

  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "18px",
  },

  navCard: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minHeight: "140px",
    textDecoration: "none",
    color: "#f5f0e6",
    background: "rgba(16, 22, 33, 0.88)",
    border: "1px solid rgba(214,168,79,0.24)",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
  },

  plannedCard: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minHeight: "140px",
    color: "#f5f0e6",
    background: "rgba(16, 22, 33, 0.45)",
    border: "1px dashed rgba(214,168,79,0.36)",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    opacity: 0.86,
  },

  badge: {
    alignSelf: "flex-start",
    background: "rgba(214,168,79,0.14)",
    color: "#d6a84f",
    border: "1px solid rgba(214,168,79,0.28)",
    borderRadius: "999px",
    padding: "5px 10px",
    fontSize: "11px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  navTitle: {
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: 900,
  },

  navText: {
    color: "#b7bdc8",
    fontSize: "14px",
    lineHeight: 1.55,
  },
};