"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/Pagination";
import RegisterSearch from "../../components/RegisterSearch";
import { isWatchlistStatus } from "@/lib/riskPolicy";

type LoanRecord = {
  member_name: string;
  loan_account: string;
  branch?: string;
  loan_product?: string;
  outstanding_balance: number;
  arrears_amount?: number;
  days_in_arrears?: number;
  responsible_officer?: string;
  risk_status: "Green" | "Amber" | "Red" | "NPL";
};

const PAGE_SIZE = 15;

export default function BoardWatchlistPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("kiprod_loan_records") || "[]") as LoanRecord[];
      setRecords(all.filter((record) => isWatchlistStatus(record.risk_status)));
    } catch { setRecords([]); }
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) => [record.member_name, record.loan_account, record.branch, record.loan_product, record.responsible_officer, record.risk_status].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [query, records]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const money = (value: number) => `KES ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8"><div className="mx-auto max-w-[1500px] space-y-6">
    <header className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl"><p className="text-xs font-black uppercase tracking-[.2em] text-amber-400">Board Portal · Read-only register</p><h1 className="mt-2 text-3xl font-black">Watchlist Accounts</h1><p className="mt-3 text-slate-300">The complete approved Watchlist: Amber + Red + NPL. Displayed 15 accounts per page.</p><Link href="/board-portal#reports" className="mt-5 inline-flex rounded-xl border border-amber-400/50 px-4 py-2 text-sm font-black text-amber-300">Back to Board Dashboard</Link></header>
    <section className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase text-slate-500">Total Watchlist</p><p className="mt-1 text-4xl font-black">{records.length}</p></div><div className="w-full max-w-xl"><RegisterSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search member, account, branch, product, officer or risk" resultCount={filtered.length} /></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500">{["Member","Loan account","Branch","Product","Outstanding","Arrears","DPD","Risk","Responsible officer"].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{visible.map((record) => <tr key={record.loan_account} className="border-b border-slate-100"><td className="px-3 py-3 font-bold">{record.member_name}</td><td className="px-3 py-3">{record.loan_account}</td><td className="px-3 py-3">{record.branch || "—"}</td><td className="px-3 py-3">{record.loan_product || "—"}</td><td className="px-3 py-3">{money(record.outstanding_balance)}</td><td className="px-3 py-3">{money(Number(record.arrears_amount || 0))}</td><td className="px-3 py-3">{record.days_in_arrears || 0}</td><td className="px-3 py-3 font-black">{record.risk_status}</td><td className="px-3 py-3">{record.responsible_officer || "Unassigned"}</td></tr>)}</tbody></table></div>
      <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
    </section>
  </div></main>;
}
