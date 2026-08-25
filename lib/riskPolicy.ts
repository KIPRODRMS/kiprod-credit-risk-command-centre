export type RiskStatus = "Green" | "Amber" | "Red" | "NPL";

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

  const due = new Date(`${action.due_date}T23:59:59`);
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
