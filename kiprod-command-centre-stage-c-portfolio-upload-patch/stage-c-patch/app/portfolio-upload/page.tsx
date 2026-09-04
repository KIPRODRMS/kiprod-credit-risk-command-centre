"use client";

import { useState } from "react";

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
  restructured: "Yes" | "No";
  risk_status: RiskStatus;
  risk_flags: string[];
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

const nonNegativeColumns = [
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

const classificationRules = [
  ["0 days in arrears", "Green / Performing"],
  ["1–30 days in arrears", "Amber / Early Warning"],
  ["31–90 days in arrears", "Red / High Risk"],
  ["91+ days in arrears", "NPL / Non-Performing"],
];

function getRiskStatus(days: number): RiskStatus {
  if (days === 0) return "Green";
  if (days <= 30) return "Amber";
  if (days <= 90) return "Red";
  return "NPL";
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

function parseCsvRows(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase()
  );

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
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
    errors.push(`Missing required fields: ${missingColumns.join(", ")}.`);
  }

  if (rows.length === 0) {
    errors.push("No loan records were found in the uploaded file.");
  }

  const loanAccounts = new Set<string>();
  const duplicateLoanAccounts = new Set<string>();

  rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;

    requiredColumns.forEach((column) => {
      if (!row[column]?.trim()) {
        errors.push(`Row ${rowNumber}: ${column} is required.`);
      }
    });

    numericColumns.forEach((column) => {
      if (row[column] !== undefined && row[column] !== "") {
        const value = Number(row[column]);
        if (!Number.isFinite(value)) {
          errors.push(`Row ${rowNumber}: ${column} must be numeric.`);
        }
      }
    });

    nonNegativeColumns.forEach((column) => {
      const value = Number(row[column]);
      if (Number.isFinite(value) && value < 0) {
        errors.push(`Row ${rowNumber}: ${column} cannot be negative.`);
      }
    });

    if (
      row.days_in_arrears &&
      Number.isFinite(Number(row.days_in_arrears)) &&
      !Number.isInteger(Number(row.days_in_arrears))
    ) {
      errors.push(`Row ${rowNumber}: days_in_arrears must be a whole number.`);
    }

    if (
      row.restructured &&
      !["yes", "no"].includes(row.restructured.trim().toLowerCase())
    ) {
      errors.push(`Row ${rowNumber}: restructured must be either Yes or No.`);
    }

    const loanAccount = row.loan_account?.trim().toLowerCase();
    if (loanAccount) {
      if (loanAccounts.has(loanAccount)) {
        duplicateLoanAccounts.add(row.loan_account);
      }
      loanAccounts.add(loanAccount);
    }
  });

  if (duplicateLoanAccounts.size > 0) {
    errors.push(
      `Duplicate loan accounts found: ${Array.from(duplicateLoanAccounts).join(
        ", "
      )}.`
    );
  }

  return errors;
}

function buildLoanRecords(rows: Record<string, string>[]): LoanRecord[] {
  const highExposureAccounts = new Set(
    [...rows]
      .sort(
        (first, second) =>
          Number(second.outstanding_balance) -
          Number(first.outstanding_balance)
      )
      .slice(0, 10)
      .map((row) => row.loan_account)
  );

  return rows.map((row) => {
    const daysInArrears = Number(row.days_in_arrears);
    const restructured =
      row.restructured.trim().toLowerCase() === "yes" ? "Yes" : "No";
    const riskFlags: string[] = [];

    if (restructured === "Yes") riskFlags.push("Restructured Risk");
    if (daysInArrears > 0) riskFlags.push("Arrears Account");
    if (highExposureAccounts.has(row.loan_account)) {
      riskFlags.push("High Exposure");
    }

    return {
      member_name: row.member_name,
      member_number: row.member_number,
      loan_account: row.loan_account,
      loan_product: row.loan_product,
      branch: row.branch,
      employer: row.employer,
      sector: row.sector,
      loan_amount: Number(row.loan_amount),
      outstanding_balance: Number(row.outstanding_balance),
      arrears_amount: Number(row.arrears_amount),
      days_in_arrears: daysInArrears,
      repayment_status: row.repayment_status,
      responsible_officer: row.responsible_officer,
      restructured,
      risk_status: getRiskStatus(daysInArrears),
      risk_flags: riskFlags,
    };
  });
}

export default function PortfolioUploadPage() {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [successMessage, setSuccessMessage] = useState("");
  const [processingSummary, setProcessingSummary] = useState("");
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  function clearStatus() {
    setSuccessMessage("");
    setProcessingSummary("");
    setErrorMessages([]);
  }

  function handleSaveData() {
    clearStatus();

    const { headers, rows } = parseCsvRows(csvText);
    const validationErrors = validateRows(headers, rows);

    if (validationErrors.length > 0) {
      setErrorMessages(validationErrors);
      return;
    }

    const records = buildLoanRecords(rows);
    localStorage.setItem("kiprod_loan_records", JSON.stringify(records));
    localStorage.removeItem("kiprod_action_items");

    const amberCount = records.filter(
      (record) => record.risk_status === "Amber"
    ).length;
    const redCount = records.filter(
      (record) => record.risk_status === "Red"
    ).length;
    const nplCount = records.filter(
      (record) => record.risk_status === "NPL"
    ).length;
    const watchlistCount = records.filter(
      (record) => record.risk_status !== "Green"
    ).length;

    setSuccessMessage(
      "The system has processed the uploaded loan records, completed risk classification, updated the Executive Cockpit, generated Early Warning and Watchlist records, prepared the Board Report summary, and created Execution Tracker items for management follow-up."
    );
    setProcessingSummary(
      `${records.length} accounts processed · Amber: ${amberCount} · Red: ${redCount} · NPL: ${nplCount} · Watchlist: ${watchlistCount}`
    );
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      clearStatus();
      setErrorMessages([
        "Only CSV files are accepted. Please use the official KIPROD portfolio template and try again.",
      ]);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const text = loadEvent.target?.result;
      if (typeof text === "string") {
        setCsvText(text);
        clearStatus();
      }
    };
    reader.onerror = () => {
      clearStatus();
      setErrorMessages([
        "The file could not be read. Please check the CSV file and try again.",
      ]);
    };
    reader.readAsText(file);
  }

  function handleDownloadTemplate() {
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "KIPROD-Portfolio-Upload-Template.csv";
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  const actionLinks = [
    ["View Executive Cockpit", "/executive-dashboard"],
    ["View Early Warning", "/early-warning"],
    ["View Watchlist", "/watchlist"],
    ["Open Board Report", "/board-pack"],
    ["Open Execution Tracker", "/action-tracker"],
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            KIPROD Credit Risk Command Centre
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Portfolio Upload
          </h1>
        </header>

        <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            1. Page Purpose
          </p>
          <h2 className="mt-2 text-xl font-bold">Institutional Data Intake</h2>
          <p className="mt-3 max-w-4xl leading-7 text-slate-300">
            Upload or paste the official KIPROD portfolio CSV template. The
            system will validate the portfolio data, classify accounts by days
            in arrears, flag high-risk records, and update the Executive
            Cockpit, Early Warning Register, Watchlist, Board Report, and
            Execution Tracker.
          </p>
          <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            For reliable reporting, ensure that outstanding balances, arrears
            amounts, days in arrears, responsible officers, and restructuring
            status are accurate before saving the portfolio.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                2. Download Template / Required Fields
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Official KIPROD CSV Template
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Required format: a comma-separated values file with a .csv
                extension and the approved column headings below.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="shrink-0 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Download CSV Template
            </button>
          </div>
          <div className="mt-5 rounded-xl bg-slate-100 p-4 font-mono text-xs leading-6 text-slate-700">
            {requiredColumns.join(", ")}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
            3. Upload or Paste CSV Data
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Portfolio Data
          </h2>

          <label
            htmlFor="portfolio-file"
            className="mt-5 block text-sm font-semibold text-slate-700"
          >
            Upload official CSV file
          </label>
          <input
            id="portfolio-file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="mt-3 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
          />

          <label
            htmlFor="portfolio-data"
            className="mt-6 block text-sm font-semibold text-slate-700"
          >
            Or paste CSV data
          </label>
          <textarea
            id="portfolio-data"
            value={csvText}
            onChange={(event) => {
              setCsvText(event.target.value);
              clearStatus();
            }}
            rows={14}
            className="mt-3 w-full rounded-xl border border-slate-300 p-4 font-mono text-sm text-slate-800"
          />

          <button
            type="button"
            onClick={handleSaveData}
            className="mt-5 rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950"
          >
            Validate and Save Portfolio
          </button>

          {errorMessages.length > 0 && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <p className="font-bold text-red-800">Upload failed</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-red-700">
                {errorMessages.map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-medium text-red-800">
                Please use the official KIPROD portfolio template and try
                again.
              </p>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
              4. Validation Rules
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Data Quality Checks
            </h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              <li>• Required columns and fields must be present.</li>
              <li>• Financial amounts and days in arrears must be numeric.</li>
              <li>• Loan accounts must not be duplicated.</li>
              <li>• Negative balances, arrears, or days are rejected.</li>
              <li>• Restructured must contain either Yes or No.</li>
              <li>• CSV files only; invalid uploads will not be saved.</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
              Risk Classification
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Portfolio Classification Rules
            </h2>
            <div className="mt-4 space-y-3">
              {classificationRules.map(([range, classification]) => (
                <div
                  key={range}
                  className="flex flex-col justify-between gap-1 rounded-xl bg-slate-100 px-4 py-3 text-sm sm:flex-row"
                >
                  <span className="font-medium text-slate-700">{range}</span>
                  <span className="font-bold text-slate-950">
                    {classification}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Additional flags: Restructured Risk, Arrears Account, and High
              Exposure. The top 10 outstanding balances are marked as High
              Exposure.
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
            5. Upload Results / Next Actions
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Processing Results
          </h2>

          {successMessage ? (
            <div
              role="status"
              className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5"
            >
              <p className="font-bold text-green-900">
                Portfolio saved successfully.
              </p>
              <p className="mt-2 text-sm leading-6 text-green-800">
                {successMessage}
              </p>
              <p className="mt-3 text-sm font-semibold text-green-900">
                {processingSummary}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {actionLinks.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-full border border-green-300 bg-white px-4 py-2 text-center text-sm font-semibold text-green-900"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-600">
              Validation results and links to the updated management and Board
              workspaces will appear here after the portfolio is saved.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
