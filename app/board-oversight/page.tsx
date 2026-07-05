"use client";

import { useEffect, useMemo, useState } from "react";

type PortfolioRow = {
  member_name?: string;
  memberName?: string;
  member?: string;
  member_number?: string;
  loan_account?: string;
  loanAccount?: string;
  loan_product?: string;
  branch?: string;
  employer?: string;
  sector?: string;
  loan_amount?: string | number;
  outstanding_balance?: string | number;
  arrears_amount?: string | number;
  arrearsAmount?: string | number;
  days_in_arrears?: string | number;
  daysInArrears?: string | number;
  repayment_status?: string;
  responsible_officer?: string;
  responsibleOfficer?: string;
  assignedTo?: string;
  restructured?: string;
  risk_status?: string;
  riskStatus?: string;
  risk?: string;
};

type ActionItem = {
  loan_account?: string;
  loanAccount?: string;
  member_name?: string;
  memberName?: string;
  member?: string;
  risk?: string;
  responsible_officer?: string;
  responsibleOfficer?: string;
  assignedOfficer?: string;
  assignedTo?: string;
  due_date?: string;
  dueDate?: string;
  status?: string;
  notes?: string;
  actionRequired?: string;
};

type InstitutionProfile = {
  institutionName?: string;
  institutionType?: string;
  reportingMonth?: string;
};

function toNumber(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readObject<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getAllLocalStorageArrays(): { key: string; value: any[] }[] {
  const results: { key: string; value: any[] }[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        results.push({ key, value: parsed });
      }
    } catch {
      continue;
    }
  }

  return results;
}

function looksLikePortfolioArray(items: any[]): boolean {
  if (!items.length) return false;

  const sample = items[0];

  return Boolean(
    sample.loan_account ||
      sample.loanAccount ||
      sample.days_in_arrears ||
      sample.daysInArrears ||
      sample.outstanding_balance ||
      sample.arrears_amount ||
      sample.arrearsAmount
  );
}

function looksLikeActionArray(items: any[]): boolean {
  if (!items.length) return false;

  const sample = items[0];

  return Boolean(
    sample.actionRequired ||
      sample.dueDate ||
      sample.due_date ||
      sample.assignedTo ||
      sample.assignedOfficer ||
      sample.status ||
      sample.notes
  );
}

function findPortfolioData(): PortfolioRow[] {
  const preferredKeys = [
    "kiprodPortfolioData",
    "portfolioData",
    "uploadedPortfolioData",
    "portfolioRows",
    "creditPortfolioData",
  ];

  for (const key of preferredKeys) {
    const data = readObject<PortfolioRow[]>(key);
    if (Array.isArray(data) && data.length) return data;
  }

  const arrays = getAllLocalStorageArrays();
  const match = arrays.find((item) => looksLikePortfolioArray(item.value));

  return match ? match.value : [];
}

function findActionData(): ActionItem[] {
  const preferredKeys = [
    "kiprodExecutionActions",
    "executionTrackerActions",
    "actionItems",
    "actionTrackerItems",
    "actions",
    "trackerActions",
    "creditRiskActions",
  ];

  for (const key of preferredKeys) {
    const data = readObject<ActionItem[]>(key);
    if (Array.isArray(data) && data.length) return data;
  }

  const arrays = getAllLocalStorageArrays();
  const match = arrays.find((item) => looksLikeActionArray(item.value));

  return match ? match.value : [];
}

function getRiskStatus(row: PortfolioRow | ActionItem): string {
  const explicitStatus =
    (row as PortfolioRow).risk_status ||
    (row as PortfolioRow).riskStatus ||
    row.risk;

  if (explicitStatus) return String(explicitStatus);

  const days = toNumber(
    (row as PortfolioRow).days_in_arrears || (row as PortfolioRow).daysInArrears
  );

  if (days === 0) return "Green";
  if (days >= 1 && days <= 30) return "Amber";
  if (days >= 31 && days <= 90) return "Red";
  return "NPL";
}

function isRisky(row: PortfolioRow): boolean {
  return getRiskStatus(row) !== "Green";
}

function isNpl(row: PortfolioRow | ActionItem): boolean {
  return getRiskStatus(row) === "NPL";
}

function getMemberName(row: PortfolioRow | ActionItem): string {
  return (
    row.member_name ||
    row.memberName ||
    row.member ||
    "N/A"
  );
}

function getLoanAccount(row: PortfolioRow | ActionItem): string {
  return (
    row.loan_account ||
    row.loanAccount ||
    "N/A"
  );
}

function getOfficer(row: PortfolioRow | ActionItem): string {
  return (
    row.responsible_officer ||
    row.responsibleOfficer ||
    row.assignedOfficer ||
    row.assignedTo ||
    "Unassigned"
  );
}

function getArrearsAmount(row: PortfolioRow): number {
  return toNumber(row.arrears_amount || row.arrearsAmount);
}

function isActionClosed(action: ActionItem): boolean {
  const status = String(action.status || "").toLowerCase();

  return (
    status.includes("complete") ||
    status.includes("completed") ||
    status.includes("closed") ||
    status.includes("done")
  );
}

function isActionOverdue(action: ActionItem): boolean {
  const dueValue = action.due_date || action.dueDate;
  if (!dueValue || isActionClosed(action)) return false;

  const dueDate = new Date(dueValue);
  const today = new Date();

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function isEscalated(action: ActionItem): boolean {
  const status = String(action.status || "").toLowerCase();
  const notes = String(action.notes || "").toLowerCase();
  const actionRequired = String(action.actionRequired || "").toLowerCase();

  return (
    status.includes("escalated") ||
    status.includes("critical") ||
    notes.includes("escalated") ||
    notes.includes("board") ||
    actionRequired.includes("escalate") ||
    actionRequired.includes("board")
  );
}

export default function BoardOversightPage() {
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [profile, setProfile] = useState<InstitutionProfile | null>(null);
  const [currentRole, setCurrentRole] = useState("Not selected");

  useEffect(() => {
    setPortfolio(findPortfolioData());
    setActions(findActionData());
    setProfile(readObject<InstitutionProfile>("kiprodInstitutionProfile"));

    const role = localStorage.getItem("kiprodCurrentRole");
    if (role) setCurrentRole(role);
  }, []);

  const oversight = useMemo(() => {
    const riskyAccounts = portfolio.filter(isRisky);
    const nplAccounts = portfolio.filter(isNpl);

    const unassignedRiskyAccounts = riskyAccounts.filter(
      (row) => getOfficer(row) === "Unassigned"
    );

    const overdueActions = actions.filter(isActionOverdue);
    const escalatedActions = actions.filter(isEscalated);

    const boardAttentionItems = [
      ...unassignedRiskyAccounts.map((row) => ({
        type: "Unassigned Risk",
        account: getLoanAccount(row),
        member: getMemberName(row),
        officer: getOfficer(row),
        issue: `${getRiskStatus(row)} account has no responsible officer.`,
      })),

      ...overdueActions.map((action) => ({
        type: "Overdue Action",
        account: getLoanAccount(action),
        member: getMemberName(action),
        officer: getOfficer(action),
        issue: "Management action is overdue.",
      })),

      ...escalatedActions.map((action) => ({
        type: "Escalated Action",
        account: getLoanAccount(action),
        member: getMemberName(action),
        officer: getOfficer(action),
        issue: "Action has been escalated and requires oversight visibility.",
      })),

      ...nplAccounts.slice(0, 10).map((row) => ({
        type: "NPL Exposure",
        account: getLoanAccount(row),
        member: getMemberName(row),
        officer: getOfficer(row),
        issue: "Account is in NPL status and requires board-level visibility.",
      })),
    ];

    const accountabilityMap = new Map<
      string,
      {
        officer: string;
        riskyCount: number;
        nplCount: number;
        arrearsAmount: number;
        overdueActions: number;
        escalatedActions: number;
      }
    >();

    riskyAccounts.forEach((row) => {
      const officer = getOfficer(row);

      if (!accountabilityMap.has(officer)) {
        accountabilityMap.set(officer, {
          officer,
          riskyCount: 0,
          nplCount: 0,
          arrearsAmount: 0,
          overdueActions: 0,
          escalatedActions: 0,
        });
      }

      const record = accountabilityMap.get(officer)!;
      record.riskyCount += 1;
      record.arrearsAmount += getArrearsAmount(row);
      if (isNpl(row)) record.nplCount += 1;
    });

    overdueActions.forEach((action) => {
      const officer = getOfficer(action);

      if (!accountabilityMap.has(officer)) {
        accountabilityMap.set(officer, {
          officer,
          riskyCount: 0,
          nplCount: 0,
          arrearsAmount: 0,
          overdueActions: 0,
          escalatedActions: 0,
        });
      }

      const record = accountabilityMap.get(officer)!;
      record.overdueActions += 1;
    });

    escalatedActions.forEach((action) => {
      const officer = getOfficer(action);

      if (!accountabilityMap.has(officer)) {
        accountabilityMap.set(officer, {
          officer,
          riskyCount: 0,
          nplCount: 0,
          arrearsAmount: 0,
          overdueActions: 0,
          escalatedActions: 0,
        });
      }

      const record = accountabilityMap.get(officer)!;
      record.escalatedActions += 1;
    });

    const accountabilitySummary = Array.from(accountabilityMap.values()).sort(
      (a, b) =>
        b.nplCount - a.nplCount ||
        b.escalatedActions - a.escalatedActions ||
        b.overdueActions - a.overdueActions ||
        b.riskyCount - a.riskyCount
    );

    return {
      riskyAccounts,
      nplAccounts,
      unassignedRiskyAccounts,
      overdueActions,
      escalatedActions,
      boardAttentionItems,
      accountabilitySummary,
    };
  }, [portfolio, actions]);

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <p style={styles.kicker}>Board Oversight Layer</p>

        <h1 style={styles.title}>Board Oversight & Accountability</h1>

        <p style={styles.subtitle}>
          View unresolved credit risk, overdue management actions, NPL exposure,
          escalation items, and accountability gaps without giving the board
          operational edit rights.
        </p>
        <div style={styles.actions}>
  <a style={styles.primaryButton} href="/clarification-requests">
    Open Clarification Requests
  </a>

  <a style={styles.secondaryButton} href="/audit-history">
    View Audit History
  </a>
</div>
<div style={styles.actions}>
  <a style={styles.primaryButton} href="/clarification-requests">
    Open Clarification Requests
  </a>

  <a style={styles.secondaryButton} href="/audit-history">
    View Audit History
  </a>
</div>
        <div style={styles.contextBox}>
          <span>
            Institution:{" "}
            <strong>{profile?.institutionName || "Not configured"}</strong>
          </span>

          <span>
            Reporting Month:{" "}
            <strong>{profile?.reportingMonth || "Not configured"}</strong>
          </span>

          <span>
            Current Role: <strong>{currentRole}</strong>
          </span>
        </div>
      </section>

      <section style={styles.metricsGrid}>
        <MetricCard
          label="Total Risky Accounts"
          value={oversight.riskyAccounts.length}
          note="Amber, Red and NPL accounts"
        />

        <MetricCard
          label="Unassigned Risky Accounts"
          value={oversight.unassignedRiskyAccounts.length}
          note="Risk exists but ownership is missing"
        />

        <MetricCard
          label="Overdue Actions"
          value={oversight.overdueActions.length}
          note="Management follow-ups past due date"
        />

        <MetricCard
          label="Escalated Actions"
          value={oversight.escalatedActions.length}
          note="Items marked escalated or critical"
        />

        <MetricCard
          label="NPL Accounts"
          value={oversight.nplAccounts.length}
          note="91+ days or NPL classified"
        />

        <MetricCard
          label="Board Attention Items"
          value={oversight.boardAttentionItems.length}
          note="Items requiring oversight visibility"
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Board Attention Items</h2>

        <p style={styles.helper}>
          These are not operational tasks for the board to edit. They are issues
          the board may question, challenge, or request clarification on.
        </p>

        {oversight.boardAttentionItems.length === 0 ? (
          <p style={styles.empty}>
            No board attention items found yet. Upload portfolio data and create
            tracker actions first.
          </p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Loan Account</th>
                  <th style={styles.th}>Member</th>
                  <th style={styles.th}>Responsible Officer</th>
                  <th style={styles.th}>Issue</th>
                </tr>
              </thead>

              <tbody>
                {oversight.boardAttentionItems.slice(0, 30).map((item, index) => (
                  <tr key={`${item.type}-${item.account}-${index}`}>
                    <td style={styles.tdStrong}>{item.type}</td>
                    <td style={styles.td}>{item.account}</td>
                    <td style={styles.td}>{item.member}</td>
                    <td style={styles.td}>{item.officer}</td>
                    <td style={styles.td}>{item.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Management Accountability Summary</h2>

        <p style={styles.helper}>
          This helps the board see where accountability sits: who owns risky
          accounts, where NPLs are concentrated, and which officers have overdue
          or escalated follow-up actions.
        </p>

        {oversight.accountabilitySummary.length === 0 ? (
          <p style={styles.empty}>
            No accountability data found yet. Once portfolio and action tracker
            data exists, this section will populate automatically.
          </p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Officer</th>
                  <th style={styles.th}>Risky Accounts</th>
                  <th style={styles.th}>NPL Accounts</th>
                  <th style={styles.th}>Arrears Amount</th>
                  <th style={styles.th}>Overdue Actions</th>
                  <th style={styles.th}>Escalated Actions</th>
                </tr>
              </thead>

              <tbody>
                {oversight.accountabilitySummary.map((row) => (
                  <tr key={row.officer}>
                    <td style={styles.tdStrong}>{row.officer}</td>
                    <td style={styles.td}>{row.riskyCount}</td>
                    <td style={styles.td}>{row.nplCount}</td>
                    <td style={styles.td}>
                      {row.arrearsAmount.toLocaleString()}
                    </td>
                    <td style={styles.td}>{row.overdueActions}</td>
                    <td style={styles.td}>{row.escalatedActions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={styles.warningBox}>
        <h2 style={styles.sectionTitle}>MVP Governance Note</h2>

        <p style={styles.helper}>
          Management can still operate the portfolio, early warning, watchlist
          and action tracker. The board layer is designed to preserve oversight,
          accountability, and unresolved-risk visibility. In the backend phase,
          management should not be able to delete audit history or remove board
          visibility once an issue has been escalated.
        </p>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div style={styles.metricCard}>
      <p style={styles.metricLabel}>{label}</p>
      <h2 style={styles.metricValue}>{value}</h2>
      <p style={styles.metricNote}>{note}</p>
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

  contextBox: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    marginTop: "22px",
    padding: "16px",
    background: "#101621",
    border: "1px solid rgba(214,168,79,0.25)",
    borderRadius: "16px",
    color: "#c9d0dc",
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

  metricNote: {
    color: "#d6a84f",
    margin: "8px 0 0",
    fontSize: "14px",
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
  },

  td: {
    padding: "14px",
    borderBottom: "1px solid #1d2635",
    color: "#d7dce5",
    verticalAlign: "top",
  },

  tdStrong: {
    padding: "14px",
    borderBottom: "1px solid #1d2635",
    color: "#fff",
    fontWeight: 800,
    verticalAlign: "top",
  },
};