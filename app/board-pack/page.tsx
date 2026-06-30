"use client";

import { useEffect, useMemo, useState } from "react";

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

function formatKes(value: number) {
  return `KES ${value.toLocaleString("en-KE")}`;
}

function countBy(records: LoanRecord[], key: keyof LoanRecord) {
  const result: Record<string, number> = {};

  records.forEach((record) => {
    const value = String(record[key] || "Unknown");
    result[value] = (result[value] || 0) + 1;
  });

  return Object.entries(result)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export default function BoardPackPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("kiprod_loan_records");

    if (saved) {
      setRecords(JSON.parse(saved));
    }
  }, []);

  const report = useMemo(() => {
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

    const amber = records.filter((record) => record.risk_status === "Amber");
    const red = records.filter((record) => record.risk_status === "Red");
    const npl = records.filter((record) => record.risk_status === "NPL");

    const riskyRecords = records.filter(
      (record) => record.risk_status !== "Green"
    );

    const topEmployers = countBy(riskyRecords, "employer").slice(0, 3);
    const topBranches = countBy(riskyRecords, "branch").slice(0, 3);
    const topProducts = countBy(riskyRecords, "loan_product").slice(0, 3);

    const par30 = records.filter((record) => record.days_in_arrears > 30);
    const par90 = records.filter((record) => record.days_in_arrears > 90);

    return {
      totalPortfolio,
      outstandingBalance,
      totalArrears,
      amberCount: amber.length,
      redCount: red.length,
      nplCount: npl.length,
      riskyCount: riskyRecords.length,
      par30Count: par30.length,
      par90Count: par90.length,
      topEmployers,
      topBranches,
      topProducts,
    };
  }, [records]);

  const arrearsRatio =
    report.outstandingBalance > 0
      ? (report.totalArrears / report.outstandingBalance) * 100
      : 0;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              Board Credit Risk Pack
            </p>
            <h1 className="text-3xl font-bold text-slate-950">
              Monthly Credit Risk Board Summary
            </h1>
            <p className="mt-2 text-slate-600">
              Auto-generated from uploaded portfolio data.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Print / Save as PDF
          </button>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              No portfolio data available
            </h2>
            <p className="mt-2 text-slate-600">
              Upload portfolio data first, then return here to generate the
              board pack.
            </p>
            <a
              href="/portfolio-upload"
              className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950"
            >
              Upload Portfolio
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-950">
                Executive Credit Risk Summary
              </h2>

              <p className="mt-4 leading-7 text-slate-700">
                The uploaded loan portfolio contains{" "}
                <strong>{records.length}</strong> loan accounts with a total
                approved portfolio value of{" "}
                <strong>{formatKes(report.totalPortfolio)}</strong>. The
                current outstanding balance stands at{" "}
                <strong>{formatKes(report.outstandingBalance)}</strong>, while
                total arrears amount to{" "}
                <strong>{formatKes(report.totalArrears)}</strong>. This
                represents an arrears ratio of{" "}
                <strong>{arrearsRatio.toFixed(1)}%</strong> against the
                outstanding balance.
              </p>

              <p className="mt-4 leading-7 text-slate-700">
                The early warning position shows{" "}
                <strong>{report.amberCount}</strong> Amber accounts,{" "}
                <strong>{report.redCount}</strong> Red accounts, and{" "}
                <strong>{report.nplCount}</strong> NPL accounts. Management
                should prioritize follow-up on Red and NPL accounts and review
                the concentration of risk by employer, branch, and loan product.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total Portfolio</p>
                <h3 className="mt-2 text-xl font-bold text-slate-950">
                  {formatKes(report.totalPortfolio)}
                </h3>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total Arrears</p>
                <h3 className="mt-2 text-xl font-bold text-red-600">
                  {formatKes(report.totalArrears)}
                </h3>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">PAR 30 Accounts</p>
                <h3 className="mt-2 text-xl font-bold text-red-600">
                  {report.par30Count}
                </h3>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">PAR 90 Accounts</p>
                <h3 className="mt-2 text-xl font-bold text-red-700">
                  {report.par90Count}
                </h3>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Key Risk Concentrations
              </h2>

              <div className="mt-6 grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="font-bold text-slate-900">Employers</h3>
                  <ul className="mt-3 space-y-2 text-slate-700">
                    {report.topEmployers.map((item) => (
                      <li key={item.name}>
                        {item.name}: <strong>{item.count}</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">Branches</h3>
                  <ul className="mt-3 space-y-2 text-slate-700">
                    {report.topBranches.map((item) => (
                      <li key={item.name}>
                        {item.name}: <strong>{item.count}</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">Loan Products</h3>
                  <ul className="mt-3 space-y-2 text-slate-700">
                    {report.topProducts.map((item) => (
                      <li key={item.name}>
                        {item.name}: <strong>{item.count}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Recommended Management Actions
              </h2>

              <ol className="mt-4 list-decimal space-y-3 pl-5 leading-7 text-slate-700">
                <li>
                  Review all Red and NPL accounts and assign specific recovery
                  actions with clear due dates.
                </li>
                <li>
                  Engage employers appearing in the top risky employer list to
                  confirm remittance stability and payroll reliability.
                </li>
                <li>
                  Investigate branches with repeated arrears concentration and
                  confirm whether the issue is underwriting, monitoring, or
                  recovery follow-up.
                </li>
                <li>
                  Present the PAR 30 and PAR 90 movement to management and
                  agree on immediate containment measures.
                </li>
                <li>
                  Prepare an action tracker for weekly management follow-up.
                </li>
              </ol>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}