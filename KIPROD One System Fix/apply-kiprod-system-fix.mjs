import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function findProjectRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(scriptDir, ".."),
    path.resolve(scriptDir, "../.."),
  ];

  for (const candidate of candidates) {
    const packagePath = path.join(candidate, "package.json");
    if (!fs.existsSync(packagePath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      if (pkg.name === "kiprod-credit-risk-command-centre") return candidate;
    } catch {}
  }

  throw new Error(
    "Could not find the KIPROD Command Centre project root. Extract this folder inside the project and run again."
  );
}

const root = findProjectRoot();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(root, `kiprod-system-fix-backup-${stamp}`);

const changed = new Set();

function absolute(rel) {
  return path.join(root, rel);
}

function read(rel) {
  const file = absolute(rel);
  if (!fs.existsSync(file)) throw new Error(`Required file not found: ${rel}`);
  return fs.readFileSync(file, "utf8");
}

function backup(rel) {
  if (changed.has(rel)) return;
  const source = absolute(rel);
  const target = path.join(backupRoot, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  changed.add(rel);
}

function write(rel, content) {
  backup(rel);
  fs.mkdirSync(path.dirname(absolute(rel)), { recursive: true });
  fs.writeFileSync(absolute(rel), content, "utf8");
}

function replaceExact(rel, oldText, newText, label) {
  let text = read(rel);
  const occurrences = text.split(oldText).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `${label}: expected exactly 1 match in ${rel}, found ${occurrences}. No files after this point were intentionally changed. Backup: ${backupRoot}`
    );
  }
  backup(rel);
  text = text.replace(oldText, newText);
  fs.writeFileSync(absolute(rel), text, "utf8");
}

function replaceAllExact(rel, oldText, newText, expectedMinimum, label) {
  let text = read(rel);
  const occurrences = text.split(oldText).length - 1;
  if (occurrences < expectedMinimum) {
    throw new Error(
      `${label}: expected at least ${expectedMinimum} matches in ${rel}, found ${occurrences}. Backup: ${backupRoot}`
    );
  }
  backup(rel);
  text = text.split(oldText).join(newText);
  fs.writeFileSync(absolute(rel), text, "utf8");
}

function insertOnceAfter(rel, anchor, insertion, label) {
  let text = read(rel);
  if (text.includes(insertion.trim())) return;
  const occurrences = text.split(anchor).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${label}: expected 1 anchor in ${rel}, found ${occurrences}.`);
  }
  backup(rel);
  text = text.replace(anchor, anchor + insertion);
  fs.writeFileSync(absolute(rel), text, "utf8");
}

console.log(`KIPROD project: ${root}`);
console.log(`Backup folder: ${backupRoot}`);

// -----------------------------------------------------------------------------
// 1. SINGLE SOURCE OF TRUTH: lib/riskPolicy.ts
// -----------------------------------------------------------------------------
const riskPolicy = `export type RiskStatus = "Green" | "Amber" | "Red" | "NPL";

export type EscalationLevel =
  | "Level 1: Officer Follow-up"
  | "Level 2: Credit Manager Review"
  | "Level 3: Senior Management Escalation"
  | "Level 4: Board Visibility";

export type RiskRecordLike = {
  loan_account?: string;
  outstanding_balance?: number;
  days_in_arrears?: number;
  risk_status: RiskStatus;
  restructured?: string;
  risk_flags?: string[];
};

export type ActionLike = {
  due_date?: string;
  status?: string;
};

export const PAR30_THRESHOLD_DAYS = 30;
export const PAR90_THRESHOLD_DAYS = 90;

export const PAR30_SHORTHAND = "31+ DPD";
export const PAR90_SHORTHAND = "91+ DPD";

export const PAR30_DESCRIPTION =
  "more than 30 days past due (31+ DPD)";
export const PAR90_DESCRIPTION =
  "more than 90 days past due (91+ DPD)";

const CLOSED_ACTION_STATUSES = new Set(["closed", "completed", "done"]);

export function classifyRisk(daysValue: number): RiskStatus {
  const parsed = Number(daysValue);
  const days = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

  if (days === 0) return "Green";
  if (days <= 30) return "Amber";
  if (days <= 90) return "Red";
  return "NPL";
}

export function isWatchlistStatus(status: string | undefined): boolean {
  return status === "Amber" || status === "Red" || status === "NPL";
}

export function isPar30(daysValue: number | undefined): boolean {
  return Number(daysValue || 0) > PAR30_THRESHOLD_DAYS;
}

export function isPar90(daysValue: number | undefined): boolean {
  return Number(daysValue || 0) > PAR90_THRESHOLD_DAYS;
}

export function isClosedActionStatus(status: string | undefined): boolean {
  return CLOSED_ACTION_STATUSES.has(String(status || "").toLowerCase());
}

export function isActionOverdue(
  action: ActionLike | undefined,
  now = Date.now()
): boolean {
  if (!action?.due_date || isClosedActionStatus(action.status)) return false;

  const due = new Date(\`\${action.due_date}T23:59:59\`);
  return !Number.isNaN(due.getTime()) && due.getTime() < now;
}

export function hasRiskFlag(
  record: Pick<RiskRecordLike, "risk_flags">,
  flag: string
): boolean {
  return record.risk_flags?.includes(flag) ?? false;
}

export function isRestructured(
  record: Pick<RiskRecordLike, "restructured" | "risk_flags">
): boolean {
  return (
    String(record.restructured || "").toLowerCase() === "yes" ||
    hasRiskFlag(record, "Restructured Risk")
  );
}

export function getHighExposureLoanAccounts<
  T extends {
    loan_account: string;
    outstanding_balance: number;
    risk_status: RiskStatus;
  }
>(records: T[], limit = 10): Set<string> {
  return new Set(
    [...records]
      .filter((record) => isWatchlistStatus(record.risk_status))
      .sort(
        (a, b) =>
          Number(b.outstanding_balance || 0) -
          Number(a.outstanding_balance || 0)
      )
      .slice(0, Math.min(limit, records.length))
      .map((record) => record.loan_account)
  );
}

export function getDefaultEscalationLevel(
  record: RiskRecordLike
): EscalationLevel {
  const highExposure = hasRiskFlag(record, "High Exposure");
  const restructured = isRestructured(record);

  if (record.risk_status === "NPL" && highExposure) {
    return "Level 4: Board Visibility";
  }

  if (record.risk_status === "NPL" || highExposure) {
    return "Level 3: Senior Management Escalation";
  }

  if (record.risk_status === "Red" || restructured) {
    return "Level 2: Credit Manager Review";
  }

  return "Level 1: Officer Follow-up";
}

export function getActionDueDays(record: RiskRecordLike): number {
  if (record.risk_status === "NPL") return 0;

  if (
    record.risk_status === "Red" ||
    hasRiskFlag(record, "High Exposure")
  ) {
    return 3;
  }

  return 7;
}

export function addDaysIso(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

export function getInitialActionDueDate(
  record: RiskRecordLike,
  baseDate = new Date()
): string {
  return addDaysIso(baseDate, getActionDueDays(record));
}

export function getDefaultActionText(record: RiskRecordLike): string {
  if (record.risk_status === "NPL") {
    return "Move to recovery attention and prepare an account recovery strategy.";
  }

  if (
    record.risk_status === "Red" ||
    hasRiskFlag(record, "High Exposure")
  ) {
    return "Escalate for manager review and agree a structured intervention plan.";
  }

  return "Contact borrower, confirm the cause of arrears and agree a repayment correction.";
}
`;

const riskPolicyPath = "lib/riskPolicy.ts";
if (fs.existsSync(absolute(riskPolicyPath))) backup(riskPolicyPath);
fs.mkdirSync(path.dirname(absolute(riskPolicyPath)), { recursive: true });
fs.writeFileSync(absolute(riskPolicyPath), riskPolicy, "utf8");
changed.add(riskPolicyPath);

// -----------------------------------------------------------------------------
// 2. PORTFOLIO UPLOAD: frozen classification + safe input + shared escalation
// -----------------------------------------------------------------------------
const upload = "app/portfolio-upload/page.tsx";

insertOnceAfter(
  upload,
  'import * as XLSX from "xlsx";\n',
  `import {
  classifyRisk,
  getActionDueDays,
  getDefaultEscalationLevel,
  getHighExposureLoanAccounts,
  isWatchlistStatus,
} from "@/lib/riskPolicy";
`,
  "Portfolio Upload risk-policy import"
);

replaceExact(
  upload,
  `function getRiskStatus(days: number): RiskStatus {
  if (days === 0) return "Green";
  if (days <= 30) return "Amber";
  if (days <= 90) return "Red";
  return "NPL";
}`,
  `function getRiskStatus(days: number): RiskStatus {
  return classifyRisk(days);
}`,
  "Portfolio Upload risk classification"
);

replaceExact(
  upload,
  `    numericColumns.forEach((column) => {
      const value = Number(row[column]);
      if (row[column] === "" || Number.isNaN(value)) {
        errors.push(\`Row \${rowNumber}: \${column} must be numeric.\`);
      }
    });`,
  `    numericColumns.forEach((column) => {
      const value = Number(row[column]);

      if (row[column] === "" || Number.isNaN(value)) {
        errors.push(\`Row \${rowNumber}: \${column} must be numeric.\`);
        return;
      }

      if (value < 0) {
        errors.push(\`Row \${rowNumber}: \${column} cannot be negative.\`);
      }

      if (column === "days_in_arrears" && !Number.isInteger(value)) {
        errors.push(
          \`Row \${rowNumber}: days_in_arrears must be a whole number of days.\`
        );
      }
    });`,
  "Portfolio Upload numeric validation"
);

replaceExact(
  upload,
  `  const highExposureAccounts = new Set(
    [...records]
      .filter((record) => record.risk_status !== "Green")
      .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
      .slice(0, Math.min(10, records.length))
      .map((record) => record.loan_account)
  );`,
  `  const highExposureAccounts = getHighExposureLoanAccounts(records);`,
  "Portfolio Upload high-exposure rule"
);

replaceExact(
  upload,
  `      const dueInDays = isNpl ? 0 : isRed || isHighExposure ? 3 : 7;`,
  `      const dueInDays = getActionDueDays(record);`,
  "Portfolio Upload action due-date policy"
);

replaceExact(
  upload,
  `        escalation_level:
          isNpl || isHighExposure
            ? "Level 3: Senior Management Escalation"
            : isRed
              ? "Level 2: Credit Manager Review"
              : "Level 1: Officer Follow-up",`,
  `        escalation_level: getDefaultEscalationLevel(record),`,
  "Portfolio Upload escalation policy"
);

replaceExact(
  upload,
  `    const watchlistCount = records.filter((record) =>
      ["Amber", "Red", "NPL"].includes(record.risk_status)
    ).length;`,
  `    const watchlistCount = records.filter((record) =>
      isWatchlistStatus(record.risk_status)
    ).length;`,
  "Portfolio Upload watchlist definition"
);

// -----------------------------------------------------------------------------
// 3. EXECUTIVE COCKPIT: shared PAR/overdue + precise labels
// -----------------------------------------------------------------------------
const executive = "app/executive-dashboard/page.tsx";

insertOnceAfter(
  executive,
  'import { useEffect, useMemo, useState } from "react";\n',
  `import {
  isActionOverdue,
  isPar30,
  isPar90,
  PAR30_SHORTHAND,
  PAR90_SHORTHAND,
} from "@/lib/riskPolicy";
`,
  "Executive Cockpit risk-policy import"
);

replaceExact(
  executive,
  `function isOverdue(action: ActionItem) {
  if (
    !action.due_date ||
    ["closed", "completed", "done"].includes(
      String(action.status || "").toLowerCase()
    )
  ) {
    return false;
  }

  const dueDate = new Date(\`\${action.due_date}T23:59:59\`);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}`,
  `function isOverdue(action: ActionItem) {
  return isActionOverdue(action);
}`,
  "Executive Cockpit overdue policy"
);

replaceExact(
  executive,
  `    const parBalance = (days: number) => records
      .filter((r) => Number(r.days_in_arrears || 0) > days)
      .reduce((sum, r) => sum + Number(r.outstanding_balance || 0), 0);
    const parAccounts = (days: number) => records.filter(
      (r) => Number(r.days_in_arrears || 0) > days
    ).length;`,
  `    const matchesPar = (record: LoanRecord, days: number) =>
      days === 30
        ? isPar30(record.days_in_arrears)
        : days === 90
          ? isPar90(record.days_in_arrears)
          : Number(record.days_in_arrears || 0) > days;
    const parBalance = (days: number) => records
      .filter((record) => matchesPar(record, days))
      .reduce(
        (sum, record) => sum + Number(record.outstanding_balance || 0),
        0
      );
    const parAccounts = (days: number) =>
      records.filter((record) => matchesPar(record, days)).length;`,
  "Executive Cockpit PAR policy"
);

replaceAllExact(
  executive,
  "Performing portfolio",
  "Current accounts",
  1,
  "Executive Cockpit count-basis label"
);
replaceAllExact(
  executive,
  "Performing {metrics.performingRate.toFixed(1)}%",
  "Current accounts {metrics.performingRate.toFixed(1)}%",
  1,
  "Executive Cockpit exposure-scale label"
);
replaceAllExact(
  executive,
  "<h2>Board attention</h2>",
  "<h2>Management attention</h2>",
  1,
  "Executive Cockpit governance label"
);
replaceAllExact(
  executive,
  `{metrics.par30Accounts} accounts · 30+ DPD`,
  `{metrics.par30Accounts} accounts · {PAR30_SHORTHAND}`,
  1,
  "Executive Cockpit PAR30 wording"
);
replaceAllExact(
  executive,
  `{metrics.par90Accounts} accounts · 90+ DPD`,
  `{metrics.par90Accounts} accounts · {PAR90_SHORTHAND}`,
  1,
  "Executive Cockpit PAR90 wording"
);

// -----------------------------------------------------------------------------
// 4. PORTFOLIO HEALTH DASHBOARD: same frozen PAR boundary
// -----------------------------------------------------------------------------
const dashboard = "app/dashboard/page.tsx";
insertOnceAfter(
  dashboard,
  'import Pagination from "../components/Pagination";\n',
  `import { isPar30, isPar90 } from "@/lib/riskPolicy";
`,
  "Portfolio Dashboard risk-policy import"
);

replaceExact(
  dashboard,
  `    const par30 = records.filter(
      (record) => Number(record.days_in_arrears || 0) > 30
    ).length;

    const par90 = records.filter(
      (record) => Number(record.days_in_arrears || 0) > 90
    ).length;`,
  `    const par30 = records.filter((record) =>
      isPar30(record.days_in_arrears)
    ).length;

    const par90 = records.filter((record) =>
      isPar90(record.days_in_arrears)
    ).length;`,
  "Portfolio Dashboard PAR policy"
);

// -----------------------------------------------------------------------------
// 5. EARLY WARNING: watchlist universe + high exposure + terminology
// -----------------------------------------------------------------------------
const early = "app/early-warning/page.tsx";
insertOnceAfter(
  early,
  'import RegisterSearch from "../components/RegisterSearch";\n',
  `import {
  getHighExposureLoanAccounts,
  isWatchlistStatus,
} from "@/lib/riskPolicy";
`,
  "Early Warning risk-policy import"
);

replaceExact(
  early,
  `  const topAccounts = new Set(
    records
      .filter((record) => record.risk_status !== "Green")
      .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
      .slice(0, 10)
      .map((record) => record.loan_account)
  );`,
  `  const topAccounts = getHighExposureLoanAccounts(records);`,
  "Early Warning high-exposure rule"
);

replaceExact(
  early,
  `      .filter(
        (record) =>
          record.risk_status !== "Green" || hasFlag(record, "High Exposure")
      )`,
  `      .filter((record) => isWatchlistStatus(record.risk_status))`,
  "Early Warning risk-universe definition"
);

replaceAllExact(
  early,
  "Total Exposure at Risk",
  "Watchlist Exposure",
  1,
  "Early Warning exposure terminology"
);

// -----------------------------------------------------------------------------
// 6. WATCHLIST: membership must be Amber + Red + NPL only; statuses align
// -----------------------------------------------------------------------------
const watchlist = "app/watchlist/page.tsx";
insertOnceAfter(
  watchlist,
  'import RegisterSearch from "../components/RegisterSearch";\n',
  `import {
  getDefaultEscalationLevel,
  getHighExposureLoanAccounts,
  isActionOverdue,
  isWatchlistStatus,
} from "@/lib/riskPolicy";
`,
  "Watchlist risk-policy import"
);

replaceExact(
  watchlist,
  `  const topAccounts = new Set(
    records
      .filter((record) => record.risk_status !== "Green")
      .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
      .slice(0, 10)
      .map((record) => record.loan_account)
  );`,
  `  const topAccounts = getHighExposureLoanAccounts(records);`,
  "Watchlist high-exposure rule"
);

replaceExact(
  watchlist,
  `function escalationLevel(record: LoanRecord) {
  if (record.risk_status === "NPL" && isHighExposure(record)) {
    return "Level 4: Board Visibility";
  }
  if (record.risk_status === "NPL" || isHighExposure(record)) {
    return "Level 3: Senior Management Escalation";
  }
  if (record.risk_status === "Red" || isRestructured(record)) {
    return "Level 2: Credit Manager Review";
  }
  return "Level 1: Officer Follow-up";
}`,
  `function escalationLevel(record: LoanRecord) {
  return getDefaultEscalationLevel(record);
}`,
  "Watchlist escalation policy"
);

replaceExact(
  watchlist,
  `function operationalStatus(action?: ActionItem) {
  if (action?.status === "Completed" || action?.status === "Closed") return "Closed";
  if (action?.status === "Escalated") return "Escalated";
  if (action?.status === "In Progress") return "Under Review";
  return "New";
}`,
  `function operationalStatus(action?: ActionItem) {
  const status = String(action?.status || "New");
  if (["Completed", "Done", "Closed"].includes(status)) return "Closed";
  if (status === "Overdue") return action?.assigned_to ? "Assigned" : "New";
  return status;
}`,
  "Watchlist operational status alignment"
);

replaceExact(
  watchlist,
  `function isOverdue(action?: ActionItem) {
  if (!action?.due_date || ["Completed", "Closed"].includes(action.status || "")) return false;

  const dueDate = new Date(\`\${action.due_date}T23:59:59\`);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}`,
  `function isOverdue(action?: ActionItem) {
  return isActionOverdue(action);
}`,
  "Watchlist overdue policy"
);

replaceExact(
  watchlist,
  `      .filter(
        (record) =>
          record.risk_status === "Amber" ||
          record.risk_status === "Red" ||
          record.risk_status === "NPL" ||
          isRestructured(record) ||
          isHighExposure(record)
      )`,
  `      .filter((record) => isWatchlistStatus(record.risk_status))`,
  "Watchlist membership definition"
);

replaceAllExact(
  watchlist,
  "Statuses: New · Under Review · Contacted · Intervention Agreed\n                  · Escalated · Moved to Recovery · Closed",
  "Statuses: New · Assigned · In Progress · Awaiting Borrower Response · Intervention Agreed\n                  · Escalated · Moved to Recovery · Closed",
  1,
  "Watchlist status legend"
);

// -----------------------------------------------------------------------------
// 7. EXECUTION TRACKER: overdue is derived; no destructive regeneration
// -----------------------------------------------------------------------------
const actions = "app/action-tracker/page.tsx";
insertOnceAfter(
  actions,
  'import RegisterSearch from "../components/RegisterSearch";\n',
  `import {
  getDefaultActionText,
  getDefaultEscalationLevel,
  getInitialActionDueDate,
  isActionOverdue,
  isWatchlistStatus,
} from "@/lib/riskPolicy";
`,
  "Execution Tracker risk-policy import"
);

replaceExact(
  actions,
  `  "Moved to Recovery",
  "Closed",
  "Overdue",
];`,
  `  "Moved to Recovery",
  "Closed",
];`,
  "Execution Tracker selectable statuses"
);

replaceExact(
  actions,
  `function getDefaultAction(record: LoanRecord): string {
  if (record.risk_status === "Amber")
    return "Contact borrower, confirm the cause of arrears and agree a repayment correction.";
  if (record.risk_status === "Red")
    return "Escalate for manager review and agree a structured intervention plan.";
  return "Move to recovery attention and prepare an account recovery strategy.";
}`,
  `function getDefaultAction(record: LoanRecord): string {
  return getDefaultActionText(record);
}`,
  "Execution Tracker default action policy"
);

replaceExact(
  actions,
  `function getEscalation(record: LoanRecord): EscalationLevel {
  if (record.risk_status === "NPL")
    return "Level 3: Senior Management Escalation";
  if ((record.risk_flags || []).includes("High Exposure"))
    return "Level 3: Senior Management Escalation";
  if (record.risk_status === "Red")
    return "Level 2: Credit Manager Review";
  return "Level 1: Officer Follow-up";
}`,
  `function getEscalation(record: LoanRecord): EscalationLevel {
  return getDefaultEscalationLevel(record) as EscalationLevel;
}`,
  "Execution Tracker escalation policy"
);

replaceExact(
  actions,
  `function isOverdue(action: ActionItem): boolean {
  if (!action.due_date || action.status === "Closed") return false;
  return new Date(\`\${action.due_date}T23:59:59\`).getTime() < Date.now();
}`,
  `function isOverdue(action: ActionItem): boolean {
  return isActionOverdue(action);
}`,
  "Execution Tracker overdue policy"
);

replaceExact(
  actions,
  `    Completed: "Closed",
    Escalated: "Escalated",`,
  `    Completed: "Closed",
    Escalated: "Escalated",
    Overdue: "Assigned",`,
  "Execution Tracker legacy overdue normalization"
);

replaceExact(
  actions,
  `function createActions(records: LoanRecord[]): ActionItem[] {
  return records
    .filter((record) => record.risk_status !== "Green")
    .map((record, index) => ({
      action_id: \`ACT-\${String(index + 1).padStart(4, "0")}\`,
      loan_account: record.loan_account,
      member_name: record.member_name,
      risk_status: record.risk_status,
      risk_source: getRiskSource(record),
      action_required: getDefaultAction(record),
      assigned_to: record.responsible_officer || "",
      due_date: "",
      status: record.responsible_officer ? "Assigned" : "New",
      escalation_level: getEscalation(record),
      board_visible:
        record.risk_status === "NPL" ||
        (record.risk_flags || []).includes("High Exposure"),
      notes: "",
      last_updated: new Date().toISOString(),
    }));
}`,
  `function createActions(records: LoanRecord[]): ActionItem[] {
  const baseDate = new Date();

  return records
    .filter((record) => isWatchlistStatus(record.risk_status))
    .map((record, index) => {
      const escalation = getEscalation(record);

      return {
        action_id: \`ACT-\${String(index + 1).padStart(4, "0")}\`,
        loan_account: record.loan_account,
        member_name: record.member_name,
        risk_status: record.risk_status,
        risk_source: getRiskSource(record),
        action_required: getDefaultAction(record),
        assigned_to: record.responsible_officer || "",
        due_date: getInitialActionDueDate(record, baseDate),
        status: record.responsible_officer ? "Assigned" : "New",
        escalation_level: escalation,
        board_visible:
          record.risk_status === "NPL" ||
          (record.risk_flags || []).includes("High Exposure") ||
          escalation === "Level 4: Board Visibility",
        notes: "Automatically created from the current portfolio risk position.",
        last_updated: new Date().toISOString(),
      };
    });
}`,
  "Execution Tracker action creation policy"
);

replaceExact(
  actions,
  `  function resetActionsFromPortfolio() {
    const nextActions = createActions(records);
    setActions(nextActions);
    localStorage.setItem("kiprod_action_items", JSON.stringify(nextActions));
    setMessage("Execution register regenerated from the latest portfolio.");
  }`,
  `  function syncActionsFromPortfolio() {
    const generatedActions = createActions(records);
    const existingLoanAccounts = new Set(
      actions.map((action) => action.loan_account)
    );

    const highestSequence = actions.reduce((highest, action) => {
      const match = /^ACT-(\\d+)$/.exec(String(action.action_id || ""));
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);

    let nextSequence = highestSequence + 1;
    const additions = generatedActions
      .filter((action) => !existingLoanAccounts.has(action.loan_account))
      .map((action) => ({
        ...action,
        action_id: \`ACT-\${String(nextSequence++).padStart(4, "0")}\`,
      }));

    const nextActions = [...actions, ...additions];
    setActions(nextActions);
    localStorage.setItem("kiprod_action_items", JSON.stringify(nextActions));
    setMessage(
      additions.length > 0
        ? \`\${additions.length} new risk action\${additions.length === 1 ? "" : "s"} added. \${actions.length} existing action\${actions.length === 1 ? "" : "s"} preserved.\`
        : \`No new risk actions were required. All \${actions.length} existing actions were preserved.\`
    );
  }`,
  "Execution Tracker non-destructive sync"
);

replaceAllExact(
  actions,
  "onClick={resetActionsFromPortfolio}",
  "onClick={syncActionsFromPortfolio}",
  1,
  "Execution Tracker sync handler"
);
replaceAllExact(
  actions,
  "Regenerate from Portfolio",
  "Sync New Risk Accounts",
  1,
  "Execution Tracker sync button"
);

// -----------------------------------------------------------------------------
// 8. BOARD REPORT / PDF: terminology, PAR wording, live clarifications
// -----------------------------------------------------------------------------
const board = "app/board-pack/page.tsx";

insertOnceAfter(
  board,
  '} from "@/lib/institutionMaster";\n',
  `import { supabase } from "@/lib/supabaseClient";
import {
  isActionOverdue,
  isClosedActionStatus,
  isPar30,
  isPar90,
  isWatchlistStatus,
  PAR30_DESCRIPTION,
  PAR90_DESCRIPTION,
} from "@/lib/riskPolicy";
`,
  "Board Report shared imports"
);

replaceExact(
  board,
  `function isClosed(action: ActionItem) {
  return ["closed", "completed", "done"].includes(
    String(action.status || "").toLowerCase()
  );
}`,
  `function isClosed(action: ActionItem) {
  return isClosedActionStatus(action.status);
}`,
  "Board Report closed-action policy"
);

replaceExact(
  board,
  `function isOverdue(action: ActionItem) {
  if (!action.due_date || isClosed(action)) return false;
  return new Date(\`\${action.due_date}T23:59:59\`).getTime() < Date.now();
}`,
  `function isOverdue(action: ActionItem) {
  return isActionOverdue(action);
}`,
  "Board Report overdue policy"
);

replaceExact(
  board,
  `    const par30 = records.filter((row) => Number(row.days_in_arrears || 0) > 30);
    const par90 = records.filter((row) => Number(row.days_in_arrears || 0) > 90);`,
  `    const par30 = records.filter((row) => isPar30(row.days_in_arrears));
    const par90 = records.filter((row) => isPar90(row.days_in_arrears));`,
  "Board Report PAR policy"
);

replaceExact(
  board,
  `    const watchlist = records.filter((row) =>
      ["Amber", "Red", "NPL"].includes(row.risk_status)
    );`,
  `    const watchlist = records.filter((row) =>
      isWatchlistStatus(row.risk_status)
    );`,
  "Board Report watchlist policy"
);

replaceExact(
  board,
  `    queueMicrotask(() => {
      if (cancelled) return;
      setRecords(storedRecords);
      setActions(storedActions);
      setClarifications(storedClarifications);
    });
    loadMasterInstitutionProfile().then(async (result) => {`,
  `    queueMicrotask(() => {
      if (cancelled) return;
      setRecords(storedRecords);
      setActions(storedActions);
      setClarifications(storedClarifications);
    });

    const institutionId =
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";

    if (institutionId) {
      supabase
        .from("clarification_requests")
        .select("status")
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (cancelled || error) return;
          const latest = (data || []) as ClarificationRequest[];
          setClarifications(latest);
          localStorage.setItem(
            "kiprodClarificationRequests",
            JSON.stringify(latest)
          );
        });
    }

    loadMasterInstitutionProfile().then(async (result) => {`,
  "Board Report clarification refresh"
);

replaceAllExact(
  board,
  `"Portfolio at Risk Ratio"`,
  `"Arrears to Outstanding Ratio"`,
  2,
  "Board Report arrears-ratio terminology"
);
replaceAllExact(
  board,
  `"Portfolio at Risk"`,
  `"Total Arrears"`,
  2,
  "Board Report arrears terminology"
);

replaceAllExact(
  board,
  `PAR 30 includes exposures at 30 days past due or more. PAR 90 includes exposures at 90 days past due or more.`,
  `PAR 30 includes outstanding exposures \${PAR30_DESCRIPTION}. PAR 90 includes outstanding exposures \${PAR90_DESCRIPTION}.`,
  2,
  "Board Report PAR explanation"
);

// The previous replacement is inside a normal quoted string in two locations.
// Convert those two strings to template literals so constants interpolate.
replaceAllExact(
  board,
  `paragraph("PAR 30 includes outstanding exposures \${PAR30_DESCRIPTION}. PAR 90 includes outstanding exposures \${PAR90_DESCRIPTION}.");`,
  `paragraph(\`PAR 30 includes outstanding exposures \${PAR30_DESCRIPTION}. PAR 90 includes outstanding exposures \${PAR90_DESCRIPTION}.\`);`,
  1,
  "Board Report PDF PAR interpolation"
);
replaceAllExact(
  board,
  `                PAR 30 includes outstanding exposures \${PAR30_DESCRIPTION}. PAR 90 includes outstanding exposures \${PAR90_DESCRIPTION}.`,
  `                PAR 30 includes outstanding exposures {PAR30_DESCRIPTION}. PAR 90 includes outstanding exposures {PAR90_DESCRIPTION}.`,
  1,
  "Board Report screen PAR interpolation"
);

replaceExact(
  board,
  `      paragraph(
        "Overdue actions count only actions whose due date is before today and whose status is not Closed. Open actions are not treated as overdue by default."
      );`,
  `      paragraph(
        \`\${report.openActions.length} actions are currently open. \${report.overdueActions.length} of those open actions are past their due date. Overdue is derived from due date and closure status; an open action is not automatically overdue.\`
      );`,
  "Board Report PDF open/overdue explanation"
);

replaceExact(
  board,
  `              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-700">
                <strong>Overdue definition:</strong> due date is before today and
                status is not Closed. Open actions are not overdue by default.
              </p>`,
  `              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-700">
                <strong>Action status interpretation:</strong>{" "}
                {report.openActions.length} actions are currently open;{" "}
                {report.overdueActions.length} of them are past their due date.
                Overdue is derived from due date and closure status. An open
                action is not automatically overdue.
              </p>`,
  "Board Report screen open/overdue explanation"
);

// -----------------------------------------------------------------------------
// 9. BOARD OVERSIGHT: current clarifications, shared governance rules, clear 17
// -----------------------------------------------------------------------------
const oversight = "app/board-oversight/page.tsx";

insertOnceAfter(
  oversight,
  'import { supabase } from "@/lib/supabaseClient";\n',
  `import {
  getHighExposureLoanAccounts,
  isActionOverdue,
  isClosedActionStatus,
  isWatchlistStatus,
} from "@/lib/riskPolicy";
`,
  "Board Oversight risk-policy import"
);

replaceExact(
  oversight,
  `function isClosed(action: ActionItem) {
  return CLOSED_STATUSES.includes(String(action.status || "").toLowerCase());
}`,
  `function isClosed(action: ActionItem) {
  return isClosedActionStatus(action.status);
}`,
  "Board Oversight closed-action policy"
);

replaceExact(
  oversight,
  `function isOverdue(action: ActionItem) {
  if (!action.due_date || isClosed(action)) return false;
  const due = new Date(\`\${action.due_date}T23:59:59\`);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}`,
  `function isOverdue(action: ActionItem) {
  return isActionOverdue(action);
}`,
  "Board Oversight overdue policy"
);

replaceExact(
  oversight,
  `    const watchlist = records.filter((record) =>
      ["Amber", "Red", "NPL"].includes(record.risk_status)
    );`,
  `    const watchlist = records.filter((record) =>
      isWatchlistStatus(record.risk_status)
    );`,
  "Board Oversight watchlist definition"
);

replaceExact(
  oversight,
  `    const highExposureRecords = [...watchlist]
      .sort(
        (a, b) =>
          Number(b.outstanding_balance || 0) -
          Number(a.outstanding_balance || 0)
      )
      .slice(0, Math.min(10, watchlist.length));
    const highExposureLoans = new Set(
      highExposureRecords.map((record) => record.loan_account)
    );`,
  `    const highExposureLoans = getHighExposureLoanAccounts(watchlist);
    const highExposureRecords = [...watchlist]
      .filter((record) => highExposureLoans.has(record.loan_account))
      .sort(
        (a, b) =>
          Number(b.outstanding_balance || 0) -
          Number(a.outstanding_balance || 0)
      );`,
  "Board Oversight high-exposure policy"
);

replaceExact(
  oversight,
  `    const storedClarifications = readStored<ClarificationRequest[]>(
      "kiprodClarificationRequests",
      []
    );
    if (storedClarifications.length > 0) {
      return;
    }

    const institutionId =
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";
    if (institutionId) {`,
  `    const storedClarifications = readStored<ClarificationRequest[]>(
      "kiprodClarificationRequests",
      []
    );

    if (storedClarifications.length > 0) {
      setClarifications(storedClarifications);
    }

    const institutionId =
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";
    if (institutionId) {`,
  "Board Oversight clarification refresh"
);

replaceAllExact(
  oversight,
  `Metric label="Last Report Generated" value={lastReport} note="Formal Board Report reference"`,
  `Metric label="Reporting Period" value={lastReport} note="Current Board Report period"`,
  1,
  "Board Oversight reporting-period label"
);

replaceExact(
  oversight,
  `        <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
          Summary figures use the same complete Command Centre action,
          portfolio, and clarification records as the Board Report. The
          detailed register below is the Board-visible governance subset.
        </p>`,
  `        <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
          Summary figures use the same complete Command Centre action,
          portfolio, and clarification records as the Board Report. The
          detailed register below is the Board-visible governance subset.
          Board-visible risks are unique matters; trigger counters such as NPL,
          overdue, high exposure and clarification can overlap and must not be
          added together.
        </p>`,
  "Board Oversight unique-matter explanation"
);

// -----------------------------------------------------------------------------
// 10. REPOSITORY POLICY: add interpretation rules that prevent future drift
// -----------------------------------------------------------------------------
const agents = "AGENTS.md";
let agentsText = read(agents);
const policyMarker = "## Locked Interpretation Rules";
if (!agentsText.includes(policyMarker)) {
  backup(agents);
  agentsText = agentsText.trimEnd() + `

## Locked Interpretation Rules

- User-facing PAR30 wording must say **more than 30 days past due (31+ DPD)**.
- User-facing PAR90 wording must say **more than 90 days past due (91+ DPD)**.
- Never describe the locked PAR thresholds as "30 days or more", "30+ DPD", "90 days or more", or "90+ DPD".
- **Overdue is a derived condition**, calculated from due date plus closure status. It is not a manually selectable action status.
- **Open and overdue are different measures.** An open action is unresolved; it becomes overdue only after its due date passes.
- **Board-visible risks are unique governance matters**, not the arithmetic sum of trigger counters. NPL, overdue, high exposure, clarification, deterioration and ownership triggers can overlap on the same account.
- Restructured and High Exposure are **risk overlays inside the Watchlist**. They must not add Green accounts to the Watchlist.
- High Exposure means the top 10 outstanding exposures **within the current Watchlist**, unless KIPROD explicitly approves a different policy.
- A destructive "regenerate actions" operation is prohibited. Portfolio/action synchronization may add genuinely new risk actions but must preserve existing accountability records.
- "Portfolio at Risk" must not be used as a label for raw arrears. Use **Total Arrears** and **Arrears to Outstanding Ratio** for arrears measures; reserve PAR terminology for the approved DPD exposure thresholds.
`;
  fs.writeFileSync(absolute(agents), agentsText, "utf8");
}

// -----------------------------------------------------------------------------
// 11. REGRESSION / STATIC VERIFIER
// -----------------------------------------------------------------------------
const verifier = `import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const failures = [];
const pass = [];

function requireText(rel, text, label) {
  if (read(rel).includes(text)) pass.push(label);
  else failures.push(\`\${label} — missing in \${rel}\`);
}

function forbidText(rel, text, label) {
  if (!read(rel).includes(text)) pass.push(label);
  else failures.push(\`\${label} — forbidden text still present in \${rel}\`);
}

const classify = (days) =>
  days === 0 ? "Green" : days <= 30 ? "Amber" : days <= 90 ? "Red" : "NPL";
const par30 = (days) => days > 30;
const par90 = (days) => days > 90;

const boundaryTests = [
  [0, "Green", false, false],
  [1, "Amber", false, false],
  [30, "Amber", false, false],
  [31, "Red", true, false],
  [90, "Red", true, false],
  [91, "NPL", true, true],
];

for (const [days, expectedStatus, expectedPar30, expectedPar90] of boundaryTests) {
  if (
    classify(days) !== expectedStatus ||
    par30(days) !== expectedPar30 ||
    par90(days) !== expectedPar90
  ) {
    failures.push(\`Boundary regression failed at \${days} DPD\`);
  }
}

if (!failures.some((item) => item.startsWith("Boundary regression"))) {
  pass.push("DPD boundary regression: 0 / 1 / 30 / 31 / 90 / 91");
}

requireText(
  "lib/riskPolicy.ts",
  'return Number(daysValue || 0) > PAR30_THRESHOLD_DAYS;',
  "PAR30 remains strictly >30"
);
requireText(
  "lib/riskPolicy.ts",
  'return Number(daysValue || 0) > PAR90_THRESHOLD_DAYS;',
  "PAR90 remains strictly >90"
);
requireText(
  "lib/riskPolicy.ts",
  'status === "Amber" || status === "Red" || status === "NPL"',
  "Watchlist remains Amber + Red + NPL"
);

forbidText(
  "app/executive-dashboard/page.tsx",
  "30+ DPD",
  "Executive Cockpit does not misstate PAR30"
);
forbidText(
  "app/executive-dashboard/page.tsx",
  "90+ DPD",
  "Executive Cockpit does not misstate PAR90"
);
forbidText(
  "app/board-pack/page.tsx",
  "at 30 days past due or more",
  "Board Report does not misstate PAR30"
);
forbidText(
  "app/board-pack/page.tsx",
  "at 90 days past due or more",
  "Board Report does not misstate PAR90"
);
forbidText(
  "app/board-pack/page.tsx",
  'metric("Portfolio at Risk"',
  "Board Report does not label arrears as Portfolio at Risk"
);
forbidText(
  "app/action-tracker/page.tsx",
  "Regenerate from Portfolio",
  "Execution Tracker destructive regenerate button removed"
);
forbidText(
  "app/action-tracker/page.tsx",
  "resetActionsFromPortfolio",
  "Execution Tracker destructive reset function removed"
);

const tracker = read("app/action-tracker/page.tsx");
const statusBlock =
  tracker.match(/const statuses: ActionStatus\\[\\] = \\[([\\s\\S]*?)\\];/)?.[1] || "";
if (statusBlock.includes('"Overdue"')) {
  failures.push("Overdue is still a manually selectable action status");
} else {
  pass.push("Overdue is derived, not manually selectable");
}

requireText(
  "app/watchlist/page.tsx",
  ".filter((record) => isWatchlistStatus(record.risk_status))",
  "Watchlist membership uses frozen status definition"
);
requireText(
  "app/board-oversight/page.tsx",
  "trigger counters such as NPL,",
  "Board Oversight explains overlapping governance triggers"
);
requireText(
  "AGENTS.md",
  "## Locked Interpretation Rules",
  "Repository policy contains interpretation safeguards"
);

console.log("\\nKIPROD RISK POLICY VERIFICATION");
console.log("================================");
for (const item of pass) console.log(\`PASS  \${item}\`);

if (failures.length) {
  console.error("\\nFAILED CHECKS");
  for (const item of failures) console.error(\`FAIL  \${item}\`);
  process.exit(1);
}

console.log("\\nAll locked risk-policy checks passed.");
`;

const verifierPath = "scripts/verify-risk-policy.mjs";
if (fs.existsSync(absolute(verifierPath))) backup(verifierPath);
fs.mkdirSync(path.dirname(absolute(verifierPath)), { recursive: true });
fs.writeFileSync(absolute(verifierPath), verifier, "utf8");
changed.add(verifierPath);

// package.json script
const packageRel = "package.json";
const packageJson = JSON.parse(read(packageRel));
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts["verify:risk"] = "node scripts/verify-risk-policy.mjs";
write(packageRel, JSON.stringify(packageJson, null, 2) + "\n");

console.log("\\nSystem fix applied successfully.");
console.log(`Changed files: ${[...changed].sort().join(", ")}`);
console.log("\\nNEXT:");
console.log("  npm run verify:risk");
console.log("  npm run build");
console.log("\\nDo not push until both commands pass.");
