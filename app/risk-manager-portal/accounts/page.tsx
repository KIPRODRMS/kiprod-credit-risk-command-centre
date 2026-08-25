"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/Pagination";
import RegisterSearch from "../../components/RegisterSearch";
import {
  getHighExposureLoanAccounts,
  isPar30,
  isPar90,
  isRestructured,
  isWatchlistStatus,
} from "@/lib/riskPolicy";

type LoanRecord = {
  member_name: string;
  loan_account: string;
  branch?: string;
  loan_product?: string;
  employer?: string;
  outstanding_balance: number;
  arrears_amount?: number;
  days_in_arrears?: number;
  responsible_officer?: string;
  restructured?: string;
  risk_flags?: string[];
  risk_status: "Green" | "Amber" | "Red" | "NPL";
};

type Filter = "watchlist" | "early-warning" | "par30" | "par90" | "amber" | "red" | "npl" | "high-exposure" | "restructured";
const PAGE_SIZE = 15;
const labels: Record<Filter, string> = {
  watchlist: "Complete Watchlist",
  "early-warning": "Early Warning Accounts",
  par30: "PAR30 Accounts · 31+ DPD",
  par90: "PAR90 Accounts · 91+ DPD",
  amber: "Amber Accounts · 1–30 DPD",
  red: "Red Accounts · 31–90 DPD",
  npl: "NPL Accounts · 91+ DPD",
  "high-exposure": "High-Exposure Watchlist",
  restructured: "Restructured Risk Accounts",
};

export default function RiskManagerAccountsPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [filter, setFilter] = useState<Filter>("watchlist");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("filter") as Filter | null;
    if (requested && requested in labels) setFilter(requested);
    try {
      setRecords(JSON.parse(localStorage.getItem("kiprod_loan_records") || "[]") as LoanRecord[]);
    } catch {
      setRecords([]);
    }
  }, []);

  const highExposure = useMemo(() => getHighExposureLoanAccounts(records), [records]);
  const matches = (record: LoanRecord, selected: Filter) => {
    if (selected === "early-warning") return record.risk_status === "Amber" || record.risk_status === "Red";
    if (selected === "par30") return isPar30(record.days_in_arrears);
    if (selected === "par90") return isPar90(record.days_in_arrears);
    if (selected === "amber" || selected === "red" || selected === "npl") return record.risk_status.toLowerCase() === selected;
    if (selected === "high-exposure") return highExposure.has(record.loan_account);
    if (selected === "restructured") return isRestructured(record);
    return isWatchlistStatus(record.risk_status);
  };
  const category = useMemo(() => records.filter((record) => matches(record, filter)), [records, filter, highExposure]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return category;
    return category.filter((record) => [record.member_name, record.loan_account, record.branch, record.loan_product, record.employer, record.responsible_officer, record.risk_status, ...(record.risk_flags || [])].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [category, query]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const money = (value: number) => `KES ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
  const choose = (next: Filter) => {
    setFilter(next);
    setPage(1);
    setQuery("");
    window.history.replaceState(null, "", `/risk-manager-portal/accounts?filter=${next}`);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl bg-[#071426] p-7 text-white shadow-xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Risk Manager Portal · Portfolio intelligence register</p>
          <h1 className="mt-2 text-3xl font-black">{labels[filter]}</h1>
          <p className="mt-3 text-slate-300">Approved portfolio definitions with 15 accounts displayed per page.</p>
          <Link href="/risk-manager-portal#portfolio" className="mt-5 inline-flex rounded-xl border border-cyan-400/50 px-4 py-2 text-sm font-black text-cyan-300">Back to Risk Dashboard</Link>
        </header>
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(labels) as Filter[]).map((key) => (
              <button key={key} type="button" onClick={() => choose(key)} className={`rounded-full px-4 py-2 text-sm font-black ${filter === key ? "bg-slate-950 text-white" : "border bg-white text-slate-700"}`}>
                {labels[key].replace(/ Accounts.*| ·.*/, "")} ({records.filter((record) => matches(record, key)).length})
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-black uppercase text-slate-500">Matching accounts</p><p className="mt-1 text-4xl font-black">{category.length}</p></div>
            <div className="w-full max-w-xl"><RegisterSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search member, account, branch, product, owner or risk" resultCount={filtered.length} /></div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead><tr className="border-b text-xs uppercase text-slate-500">{["Member", "Loan account", "Branch", "Product", "Outstanding", "Arrears", "DPD", "Risk", "Risk overlays", "Responsible officer"].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead>
              <tbody>{visible.map((record) => <tr key={record.loan_account} className="border-b border-slate-100"><td className="px-3 py-3 font-bold">{record.member_name}</td><td className="px-3 py-3">{record.loan_account}</td><td className="px-3 py-3">{record.branch || "—"}</td><td className="px-3 py-3">{record.loan_product || "—"}</td><td className="px-3 py-3">{money(record.outstanding_balance)}</td><td className="px-3 py-3">{money(Number(record.arrears_amount || 0))}</td><td className="px-3 py-3 font-bold">{record.days_in_arrears || 0}</td><td className="px-3 py-3 font-black">{record.risk_status}</td><td className="max-w-xs px-3 py-3 text-xs">{[highExposure.has(record.loan_account) ? "High Exposure" : "", isRestructured(record) ? "Restructured" : "", ...(record.risk_flags || [])].filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(" · ") || "None"}</td><td className="px-3 py-3">{record.responsible_officer || "Unassigned"}</td></tr>)}</tbody>
            </table>
            {!visible.length && <p className="py-10 text-center text-slate-500">No accounts match this category.</p>}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
        </section>
      </div>
    </main>
  );
}
