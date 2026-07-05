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
  restructured: string;
  risk_status: RiskStatus;
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
  const lines = csvText.trim().split(/\r?\n/);

  if (lines.length < 2) {
    return {
      headers: [],
      rows: [],
    };
  }

  const headers = lines[0].split(",").map((header) => header.trim());

  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row;
  });

  return {
    headers,
    rows,
  };
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
  return rows.map((row) => {
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
    };
  });
}

export default function PortfolioUploadPage() {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

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
      `Portfolio saved successfully. ${records.length} loan accounts processed. Risk classification completed. Amber: ${amberCount}, Red: ${redCount}, NPL: ${nplCount}, Watchlist: ${watchlistCount}. Executive Cockpit, Early Warning Register, Watchlist, Board Report, and Execution Tracker have been updated.`
    );
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result;

      if (typeof text === "string") {
        setCsvText(text);
        setSuccessMessage("");
        setErrorMessages([]);
      }
    };

    reader.readAsText(file);
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
            Upload or paste the official KIPROD portfolio CSV template. The
            system validates the file, classifies accounts by days in arrears,
            and updates the Executive Cockpit, Early Warning Register,
            Watchlist, Board Report, and Execution Tracker.
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
            Required MVP Template Fields
          </p>

          <p className="mt-3 leading-7 text-slate-300">
            member_name, member_number, loan_account, loan_product, branch,
            employer, sector, loan_amount, outstanding_balance, arrears_amount,
            days_in_arrears, repayment_status, responsible_officer,
            restructured
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            Upload CSV file
          </label>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="mt-3 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
          />

          <label className="mt-6 block text-sm font-semibold text-slate-700">
            CSV data
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