"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/Pagination";
import RegisterSearch from "../../components/RegisterSearch";
import { isActionOverdue, isClosedActionStatus } from "@/lib/riskPolicy";

type ActionItem = { action_id?:string; loan_account:string; member_name:string; risk_status:string; risk_source?:string; action_required?:string; assigned_to?:string; due_date?:string; status?:string; escalation_level?:string; board_visible?:boolean };
const PAGE_SIZE = 15;

export default function BoardActionsPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("kiprod_action_items") || "[]") as ActionItem[];
      setActions(all.filter((action) => !isClosedActionStatus(action.status)));
    } catch { setActions([]); }
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return actions;
    return actions.filter((action) => [action.action_id, action.loan_account, action.member_name, action.risk_status, action.risk_source, action.action_required, action.assigned_to, action.status, action.escalation_level].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [actions, query]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8"><div className="mx-auto max-w-[1500px] space-y-6">
    <header className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl"><p className="text-xs font-black uppercase tracking-[.2em] text-amber-400">Board Portal · Read-only accountability register</p><h1 className="mt-2 text-3xl font-black">Open Management Actions</h1><p className="mt-3 text-slate-300">All unresolved Execution Tracker actions, displayed 15 actions per page. Overdue remains derived from due date and closure status.</p><Link href="/board-portal#reports" className="mt-5 inline-flex rounded-xl border border-amber-400/50 px-4 py-2 text-sm font-black text-amber-300">Back to Board Dashboard</Link></header>
    <section className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase text-slate-500">Total open actions</p><p className="mt-1 text-4xl font-black">{actions.length}</p></div><div className="w-full max-w-xl"><RegisterSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search action, account, member, owner, status or escalation" resultCount={filtered.length} /></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1150px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500">{["Action ID","Account","Member","Risk","Action required","Owner","Due date","Position","Escalation"].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{visible.map((action) => <tr key={action.action_id || action.loan_account} className="border-b border-slate-100"><td className="px-3 py-3 font-bold">{action.action_id || "Legacy"}</td><td className="px-3 py-3">{action.loan_account}</td><td className="px-3 py-3 font-semibold">{action.member_name}</td><td className="px-3 py-3 font-black">{action.risk_status}</td><td className="max-w-xs px-3 py-3">{action.action_required || "Follow-up required"}</td><td className="px-3 py-3">{action.assigned_to || "Unassigned"}</td><td className="px-3 py-3">{action.due_date || "Not set"}</td><td className={`px-3 py-3 font-black ${isActionOverdue(action) ? "text-red-700" : "text-slate-700"}`}>{isActionOverdue(action) ? "Overdue" : action.status || "Open"}</td><td className="px-3 py-3">{action.escalation_level || "Not set"}</td></tr>)}</tbody></table></div>
      <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
    </section>
  </div></main>;
}
