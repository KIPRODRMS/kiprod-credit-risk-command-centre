"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";

type LoanRecord = {
  member_name: string;
  member_number: string;
  loan_account: string;
  loan_product: string;
  branch: string;
  employer: string;
  sector: string;
  loan_amount: number;
  outstanding_balance: number;
  arrears_amount: number;
  days_in_arrears: number;
  repayment_status: string;
  responsible_officer: string;
  restructured: string;
  risk_status: RiskStatus;
  risk_flags?: string[];
};

type ActionItem = {
  action_id: string;
  loan_account: string;
  member_name: string;
  risk_status: RiskStatus;
  risk_source: string;
  action_required: string;
  assigned_to: string;
  due_date: string;
  status: string;
  escalation_level: string;
  board_visible: boolean;
  notes: string;
  last_updated: string;
};

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

const requiredColumns = [
  "member_name",
  "member_number",
  "loan_account",
  "loan_product",
  "branch",
  "employer",
  "sector",
  "loan_amount",
  "outstanding_balance",
  "arrears_amount",
  "days_in_arrears",
  "repayment_status",
  "responsible_officer",
  "restructured",
];

const numericColumns = [
  "loan_amount",
  "outstanding_balance",
  "arrears_amount",
  "days_in_arrears",
];

const sampleCsv = `member_name,member_number,loan_account,loan_product,branch,employer,sector,loan_amount,outstanding_balance,arrears_amount,days_in_arrears,repayment_status,responsible_officer,restructured
Mary Wanjiku,M001,LN001,Salary Loan,Nairobi,County Government,Public Sector,500000,420000,0,0,Performing,Faith Njeri,No
Peter Otieno,M002,LN002,Business Loan,Kisumu,Self Employed,Trade,300000,250000,15000,18,In Arrears,Daniel Mwangi,No
Grace Achieng,M003,LN003,Emergency Loan,Eldoret,ABC School,Education,120000,90000,30000,45,In Arrears,Caroline Wairimu,Yes
John Mwangi,M004,LN004,Development Loan,Nakuru,XYZ Factory,Manufacturing,800000,650000,120000,95,Default,Peter Maina,Yes
Samuel Kiptoo,M005,LN005,Salary Loan,Mombasa,Port Services,Logistics,450000,300000,5000,7,In Arrears,Faith Njeri,No`;

function getRiskStatus(days: number): RiskStatus {
  if (days === 0) return "Green";
  if (days <= 30) return "Amber";
  if (days <= 90) return "Red";
  return "NPL";
}

function parseCsvRows(csvText: string) {
  const workbook = XLSX.read(csvText, { type: "string", raw: false });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) return { headers: [], rows: [] };

  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (matrix.length < 2) return { headers: [], rows: [] };

  const headers = matrix[0].map((header) => String(header).trim());
  const rows = matrix.slice(1).map((values) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = String(values[index] ?? "").trim();
    });
    return row;
  });

  return { headers, rows };
}

function validateRows(headers: string[], rows: Record<string, string>[]) {
  const errors: string[] = [];

  const missingColumns = requiredColumns.filter(
    (column) => !headers.includes(column)
  );

  if (missingColumns.length > 0) {
    errors.push(
      `Upload failed. Missing required columns: ${missingColumns.join(", ")}.`
    );
  }

  if (rows.length === 0) {
    errors.push("Upload failed. No loan records found in the uploaded file.");
  }

  const loanAccounts = new Set<string>();
  const duplicateLoanAccounts = new Set<string>();

  rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;

    requiredColumns.forEach((column) => {
      if (!row[column] || row[column].trim() === "") {
        errors.push(`Row ${rowNumber}: ${column} is required.`);
      }
    });

    numericColumns.forEach((column) => {
      const value = Number(row[column]);
      if (row[column] === "" || Number.isNaN(value)) {
        errors.push(`Row ${rowNumber}: ${column} must be numeric.`);
      }
    });

    if (row.loan_account) {
      if (loanAccounts.has(row.loan_account)) {
        duplicateLoanAccounts.add(row.loan_account);
      }
      loanAccounts.add(row.loan_account);
    }
  });

  if (duplicateLoanAccounts.size > 0) {
    errors.push(
      `Upload failed. Duplicate loan accounts found: ${Array.from(
        duplicateLoanAccounts
      ).join(", ")}.`
    );
  }

  return errors;
}

function buildLoanRecords(rows: Record<string, string>[]): LoanRecord[] {
  const records = rows.map((row) => {
    const daysInArrears = Number(row.days_in_arrears || 0);

    return {
      member_name: row.member_name || "",
      member_number: row.member_number || "",
      loan_account: row.loan_account || "",
      loan_product: row.loan_product || "",
      branch: row.branch || "",
      employer: row.employer || "",
      sector: row.sector || "",
      loan_amount: Number(row.loan_amount || 0),
      outstanding_balance: Number(row.outstanding_balance || 0),
      arrears_amount: Number(row.arrears_amount || 0),
      days_in_arrears: daysInArrears,
      repayment_status: row.repayment_status || "",
      responsible_officer: row.responsible_officer || "",
      restructured: row.restructured || "No",
      risk_status: getRiskStatus(daysInArrears),
      risk_flags:
        row.restructured?.toLowerCase() === "yes"
          ? ["Restructured Risk"]
          : [],
    };
  });

  const highExposureAccounts = new Set(
    [...records]
      .filter((record) => record.risk_status !== "Green")
      .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
      .slice(0, Math.min(10, records.length))
      .map((record) => record.loan_account)
  );

  return records.map((record) => ({
    ...record,
    risk_flags: highExposureAccounts.has(record.loan_account)
      ? [...(record.risk_flags || []), "High Exposure"]
      : record.risk_flags,
  }));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

function buildInitialActions(records: LoanRecord[]): ActionItem[] {
  const today = new Date();

  return records
    .filter(
      (record) =>
        record.risk_status !== "Green" ||
        record.risk_flags?.includes("High Exposure")
    )
    .map((record, index) => {
      const isNpl = record.risk_status === "NPL";
      const isRed = record.risk_status === "Red";
      const isHighExposure =
        record.risk_flags?.includes("High Exposure") ?? false;
      const dueInDays = isNpl ? 0 : isRed || isHighExposure ? 3 : 7;

      return {
        action_id: `ACT-${String(index + 1).padStart(4, "0")}`,
        loan_account: record.loan_account,
        member_name: record.member_name,
        risk_status: record.risk_status,
        risk_source: isHighExposure
          ? "High Exposure"
          : isNpl
            ? "NPL"
            : "Early Warning",
        action_required: isNpl
          ? "Move to recovery attention and prepare an account recovery strategy."
          : isRed || isHighExposure
            ? "Escalate for manager review and agree a structured intervention plan."
            : "Contact borrower, confirm the cause of arrears and agree a repayment correction.",
        assigned_to: record.responsible_officer || "",
        due_date: addDays(today, dueInDays),
        status: record.responsible_officer ? "Assigned" : "New",
        escalation_level:
          isNpl || isHighExposure
            ? "Level 3: Senior Management Escalation"
            : isRed
              ? "Level 2: Credit Manager Review"
              : "Level 1: Officer Follow-up",
        board_visible: isNpl || isHighExposure,
        notes: "Automatically created from the latest portfolio upload.",
        last_updated: new Date().toISOString(),
      };
    });
}

function getActionSequence(actionId: string) {
  const match = /^ACT-(\d+)$/.exec(String(actionId || ""));
  return match ? Number(match[1]) : 0;
}

function mergeExecutionActions(
  records: LoanRecord[],
  generatedActions: ActionItem[]
) {
  let existingActions: ActionItem[] = [];

  try {
    const parsed = JSON.parse(
      localStorage.getItem("kiprod_action_items") || "[]"
    );
    if (Array.isArray(parsed)) {
      existingActions = parsed.filter(
        (action) =>
          action &&
          typeof action === "object" &&
          typeof action.loan_account === "string" &&
          action.loan_account.trim().length > 0
      );
    }
  } catch {
    existingActions = [];
  }

  if (existingActions.length === 0) {
    return {
      actions: generatedActions,
      preservedCount: 0,
      createdCount: generatedActions.length,
    };
  }

  const recordMap = new Map(
    records.map((record) => [record.loan_account, record])
  );

  const preservedActions = existingActions.map((action) => {
    const record = recordMap.get(action.loan_account);
    if (!record) return action;

    const isHighExposure =
      record.risk_flags?.includes("High Exposure") ?? false;

    return {
      ...action,
      member_name: record.member_name || action.member_name,
      risk_status: record.risk_status,
      risk_source: isHighExposure
        ? "High Exposure"
        : record.risk_status === "NPL"
          ? "NPL"
          : record.risk_status === "Amber" || record.risk_status === "Red"
            ? "Early Warning"
            : action.risk_source,
    };
  });

  const existingLoanAccounts = new Set(
    preservedActions.map((action) => action.loan_account)
  );

  let nextSequence =
    Math.max(0, ...preservedActions.map((action) => getActionSequence(action.action_id))) + 1;

  const newActions = generatedActions
    .filter((action) => !existingLoanAccounts.has(action.loan_account))
    .map((action) => ({
      ...action,
      action_id: `ACT-${String(nextSequence++).padStart(4, "0")}`,
    }));

  return {
    actions: [...preservedActions, ...newActions],
    preservedCount: preservedActions.length,
    createdCount: newActions.length,
  };
}

function writePortfolioUploadAudit(
  records: LoanRecord[],
  sourceName: string,
  riskCounts: { green: number; amber: number; red: number; npl: number }
) {
  let logs: AuditLog[] = [];

  try {
    const storedLogs = JSON.parse(
      localStorage.getItem("kiprodAuditLogs") || "[]"
    );
    logs = Array.isArray(storedLogs) ? storedLogs : [];
  } catch {
    logs = [];
  }

  const totalPortfolio = records.reduce(
    (sum, record) => sum + record.loan_amount,
    0
  );
  const outstandingBalance = records.reduce(
    (sum, record) => sum + record.outstanding_balance,
    0
  );
  const totalArrears = records.reduce(
    (sum, record) => sum + record.arrears_amount,
    0
  );
  const role = localStorage.getItem("kiprodCurrentRole") || "MVP User";
  const timestamp = new Date().toISOString();
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: timestamp,
    module: "Portfolio Upload",
    actionType: "PORTFOLIO_UPLOADED",
    recordRef: sourceName,
    oldValue: "No active portfolio",
    newValue: `${records.length} accounts processed successfully`,
    role,
    user: role,
    note:
      `Successful portfolio upload. Records: ${records.length}; ` +
      `Total portfolio: KES ${totalPortfolio.toLocaleString()}; ` +
      `Outstanding: KES ${outstandingBalance.toLocaleString()}; ` +
      `Arrears: KES ${totalArrears.toLocaleString()}; ` +
      `Green: ${riskCounts.green}; Amber: ${riskCounts.amber}; ` +
      `Red: ${riskCounts.red}; NPL: ${riskCounts.npl}.`,
  };

  localStorage.setItem("kiprodAuditLogs", JSON.stringify([log, ...logs]));
}

export default function PortfolioUploadPage() {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [sourceName, setSourceName] = useState("Pasted portfolio data");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [isReadingFile, setIsReadingFile] = useState(false);

  function handleSaveData() {
    setSuccessMessage("");
    setErrorMessages([]);

    const { headers, rows } = parseCsvRows(csvText);
    const validationErrors = validateRows(headers, rows);

    if (validationErrors.length > 0) {
      setErrorMessages([
        ...validationErrors,
        "Please use the official KIPROD portfolio template.",
      ]);
      return;
    }

    const records = buildLoanRecords(rows);
    const generatedActions = buildInitialActions(records);
    const { actions, preservedCount, createdCount } = mergeExecutionActions(
      records,
      generatedActions
    );
    const uploadedAt = new Date().toISOString();

    localStorage.setItem("kiprod_loan_records", JSON.stringify(records));
    localStorage.setItem("kiprod_action_items", JSON.stringify(actions));
    localStorage.setItem(
      "kiprod_portfolio_source",
      JSON.stringify({
        sourceName,
        uploadedAt,
        recordCount: records.length,
      })
    );

    const amberCount = records.filter(
      (record) => record.risk_status === "Amber"
    ).length;
    const redCount = records.filter(
      (record) => record.risk_status === "Red"
    ).length;
    const nplCount = records.filter(
      (record) => record.risk_status === "NPL"
    ).length;
    const watchlistCount = records.filter((record) =>
      ["Amber", "Red", "NPL"].includes(record.risk_status)
    ).length;
    const greenCount = records.filter(
      (record) => record.risk_status === "Green"
    ).length;

    writePortfolioUploadAudit(records, sourceName, {
      green: greenCount,
      amber: amberCount,
      red: redCount,
      npl: nplCount,
    });

    setSuccessMessage(
      `Portfolio saved successfully. ${records.length} loan accounts processed. ` +
        `Risk classification completed. Green: ${greenCount}, Amber: ${amberCount}, ` +
        `Red: ${redCount}, NPL: ${nplCount}, Watchlist: ${watchlistCount}. ` +
        `Execution accountability preserved: ${preservedCount} existing actions retained and ` +
        `${createdCount} new actions created. Executive Cockpit, Early Warning Register, ` +
        `Watchlist, Board Report, and Execution Tracker have been refreshed.`
    );
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    setSuccessMessage("");
    setErrorMessages([]);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !["csv", "xlsx", "xls"].includes(extension)) {
        throw new Error("Please select a CSV or Excel file (.csv, .xlsx or .xls). ");
      }

      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        raw: false,
      });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("The selected file does not contain a worksheet.");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const normalizedCsv = XLSX.utils.sheet_to_csv(worksheet, {
        blankrows: false,
      });
      if (!normalizedCsv.trim()) {
        throw new Error("The selected worksheet is empty.");
      }

      setCsvText(normalizedCsv);
      setSourceName(file.name);
    } catch (error) {
      setErrorMessages([
        error instanceof Error
          ? error.message
          : "The selected file could not be read. Please use the official KIPROD template.",
      ]);
      event.target.value = "";
    } finally {
      setIsReadingFile(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            KIPROD Credit Risk Command Centre
          </p>

          <h1 className="text-3xl font-bold text-slate-950">
            Portfolio Upload
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Upload or paste the official KIPROD portfolio template in CSV or
            Excel format. The system validates the file, classifies accounts by
            days in arrears, and updates the Executive Cockpit, Early Warning
            Register, Watchlist, Board Report, and Execution Tracker.
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
            Required MVP Template Fields
          </p>

          <p className="mt-3 leading-7 text-slate-300">
            member_name, member_number, loan_account, loan_product, branch,
            employer, sector, loan_amount, outstanding_balance, arrears_amount,
            days_in_arrears, repayment_status, responsible_officer, restructured
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-slate-950 p-6 text-center shadow-md">
            <p className="text-lg font-bold text-white">Upload portfolio file</p>
            <p className="mt-1 text-sm font-medium text-slate-200">
              Accepted formats: CSV, Excel XLSX and Excel XLS
            </p>

            <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-full bg-amber-400 px-8 py-3.5 text-base font-bold text-slate-950 shadow-lg transition hover:bg-amber-300 focus-within:ring-4 focus-within:ring-amber-200">
              {isReadingFile ? "Reading file…" : "Choose CSV or Excel File"}
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileUpload}
                disabled={isReadingFile}
                className="sr-only"
              />
            </label>

            <p className="mt-4 text-sm text-slate-300">
              {sourceName === "Pasted portfolio data"
                ? "No file selected yet"
                : `Selected: ${sourceName}`}
            </p>
          </div>

          <label className="mt-6 block text-sm font-semibold text-slate-700">
            Portfolio data preview
          </label>

          <textarea
            value={csvText}
            onChange={(event) => {
              setCsvText(event.target.value);
              setSuccessMessage("");
              setErrorMessages([]);
            }}
            rows={14}
            className="mt-3 w-full rounded-xl border border-slate-300 p-4 font-mono text-sm text-slate-800"
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleSaveData}
              className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950"
            >
              Save Portfolio Data
            </button>

            <a
              href="/executive-dashboard"
              className="rounded-full border border-slate-300 px-6 py-3 text-center font-semibold text-slate-800"
            >
              View Executive Cockpit
            </a>

            <a
              href="/watchlist"
              className="rounded-full border border-slate-300 px-6 py-3 text-center font-semibold text-slate-800"
            >
              View Watchlist
            </a>
          </div>

          {errorMessages.length > 0 && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-bold text-red-800">Upload validation failed</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-red-700">
                {errorMessages.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {successMessage && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="font-bold text-green-800">
                Portfolio saved successfully
              </p>
              <p className="mt-2 text-sm leading-6 text-green-700">
                {successMessage}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
