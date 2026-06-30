"use client";

import { useState } from "react";

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
  risk_status: "Green" | "Amber" | "Red" | "NPL";
};

const sampleCsv = `member_name,member_number,loan_account,loan_product,branch,employer,sector,loan_amount,outstanding_balance,arrears_amount,days_in_arrears,repayment_status
Mary Wanjiku,M001,LN001,Salary Loan,Nairobi,County Government,Public Sector,500000,420000,0,0,Performing
Peter Otieno,M002,LN002,Business Loan,Kisumu,Self Employed,Trade,300000,250000,15000,18,In Arrears
Grace Achieng,M003,LN003,Emergency Loan,Eldoret,ABC School,Education,120000,90000,30000,45,In Arrears
John Mwangi,M004,LN004,Development Loan,Nakuru,XYZ Factory,Manufacturing,800000,650000,120000,95,Default
Samuel Kiptoo,M005,LN005,Salary Loan,Mombasa,Port Services,Logistics,450000,300000,5000,7,In Arrears`;

function getRiskStatus(days: number): LoanRecord["risk_status"] {
  if (days === 0) return "Green";
  if (days <= 30) return "Amber";
  if (days <= 90) return "Red";
  return "NPL";
}

function parseCsv(csvText: string): LoanRecord[] {
  const lines = csvText.trim().split(/\r?\n/);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

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
      risk_status: getRiskStatus(daysInArrears),
    };
  });
}

export default function PortfolioUploadPage() {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [message, setMessage] = useState("");

  function handleSaveData() {
    const records = parseCsv(csvText);

    if (records.length === 0) {
      setMessage("No valid records found. Please check the CSV data.");
      return;
    }

    localStorage.setItem("kiprod_loan_records", JSON.stringify(records));
    setMessage(`${records.length} loan records saved successfully.`);
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result;

      if (typeof text === "string") {
        setCsvText(text);
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
            Upload or paste a loan portfolio CSV. The system will classify loans
            into Green, Amber, Red, and NPL based on days in arrears.
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
            onChange={(event) => setCsvText(event.target.value)}
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
              href="/dashboard"
              className="rounded-full border border-slate-300 px-6 py-3 text-center font-semibold text-slate-800"
            >
              View Dashboard
            </a>
          </div>

          {message && (
            <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm font-medium text-slate-700">
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}