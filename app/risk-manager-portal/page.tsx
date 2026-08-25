"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  defaultInstitutionProfile,
  loadMasterInstitutionProfile,
  type InstitutionProfile,
} from "@/lib/institutionMaster";
import { cachePortalClarifications, isManagementPending, type PortalClarification } from "@/lib/portalRouting";
import {
  getHighExposureLoanAccounts,
  isActionOverdue,
  isClosedActionStatus,
  isPar30,
  isPar90,
  isRestructured,
  isWatchlistStatus,
  PAR30_SHORTHAND,
  PAR90_SHORTHAND,
} from "@/lib/riskPolicy";
import { supabase } from "@/lib/supabaseClient";

type Loan = {
  loan_account: string;
  member_name: string;
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
type Action = {
  action_id?: string;
  loan_account: string;
  member_name: string;
  risk_status?: string;
  assigned_to?: string;
  due_date?: string;
  status?: string;
  escalation_level?: string;
};
type Audit = { id: string; created_at: string; action_type: string; record_ref: string; role: string; note: string };

const institutionId = () => process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";
const readLocal = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || "") as T; }
  catch { return fallback; }
};
const total = (values: number[]) => values.reduce((sum, value) => sum + Number(value || 0), 0);
const percentage = (part: number, whole: number) => whole ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%";
const assignedToRisk = (value: string | null | undefined) => String(value || "").toLowerCase().includes("risk");

export default function RiskManagerPortalPage() {
  const [profile, setProfile] = useState<InstitutionProfile>(defaultInstitutionProfile);
  const [records, setRecords] = useState<Loan[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [requests, setRequests] = useState<PortalClarification[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [response, setResponse] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setRecords(readLocal("kiprod_loan_records", []));
    setActions(readLocal("kiprod_action_items", []));
    const id = institutionId();
    if (!id) { setMessage("Institution ID is not configured for Board-request routing."); return; }
    const [clarifications, audit] = await Promise.all([
      supabase.from("clarification_requests").select("*").eq("institution_id", id).order("created_at", { ascending: false }),
      supabase.from("audit_logs").select("id,created_at,action_type,record_ref,role,note").eq("institution_id", id).in("module", ["Clarification Requests", "Execution Tracker", "Early Warning", "Watchlist"]).order("created_at", { ascending: false }).limit(12),
    ]);
    if (clarifications.error) { setMessage(clarifications.error.message); return; }
    const all = (clarifications.data || []) as PortalClarification[];
    cachePortalClarifications(all);
    setRequests(all);
    setAudits((audit.data || []) as Audit[]);
    const first = all.find((item) => assignedToRisk(item.assigned_to) && isManagementPending(item.status));
    setSelectedId((current) => current || first?.id || "");
    if (first) setResponse(first.management_response || "");
    setMessage("");
  }

  useEffect(() => {
    localStorage.setItem("kiprodCurrentRole", "Risk Manager");
    loadMasterInstitutionProfile().then((result) => setProfile(result.profile));
    void load();
  }, []);

  const assignedRequests = useMemo(() => requests.filter((item) => assignedToRisk(item.assigned_to)), [requests]);
  const pendingRequests = assignedRequests.filter((item) => isManagementPending(item.status));
  const selected = assignedRequests.find((item) => item.id === selectedId) || null;
  const analysis = useMemo(() => {
    const outstanding = total(records.map((record) => record.outstanding_balance));
    const par30Records = records.filter((record) => isPar30(record.days_in_arrears));
    const par90Records = records.filter((record) => isPar90(record.days_in_arrears));
    const watchlist = records.filter((record) => isWatchlistStatus(record.risk_status));
    const earlyWarning = records.filter((record) => record.risk_status === "Amber" || record.risk_status === "Red");
    const amber = records.filter((record) => record.risk_status === "Amber");
    const red = records.filter((record) => record.risk_status === "Red");
    const npl = records.filter((record) => record.risk_status === "NPL");
    const highExposureIds = getHighExposureLoanAccounts(records);
    const highExposure = records.filter((record) => highExposureIds.has(record.loan_account));
    const restructured = records.filter((record) => isRestructured(record));
    const deteriorating = records.filter((record) => (record.risk_flags || []).some((flag) => flag.toLowerCase().includes("deterior")));
    const open = actions.filter((action) => !isClosedActionStatus(action.status));
    const overdue = open.filter((action) => isActionOverdue(action));
    const escalated = open.filter((action) => /Level [34]/.test(String(action.escalation_level || "")));
    const assigned = open.filter((action) => assignedToRisk(action.assigned_to));
    const priority = [...watchlist].sort((a, b) => Number(b.outstanding_balance || 0) - Number(a.outstanding_balance || 0)).slice(0, 10);
    return { outstanding, par30Records, par90Records, watchlist, earlyWarning, amber, red, npl, highExposure, restructured, deteriorating, open, overdue, escalated, assigned, priority };
  }, [records, actions]);

  const money = (value: number) => `${profile.reportingCurrency || "KES"} ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
  const metric = (label: string, value: string | number, note: string, href?: string, tone = "text-slate-950") => {
    const content = <><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className={`mt-2 text-3xl font-black ${tone}`}>{value}</p><p className="mt-2 text-xs text-slate-600">{note}</p>{href && <span className="mt-3 inline-block text-[11px] font-black uppercase tracking-wide text-cyan-700">Open full register</span>}</>;
    return href ? <Link href={href} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-cyan-500 hover:shadow-md focus:ring-2 focus:ring-cyan-400">{content}</Link> : <article className="rounded-2xl border bg-white p-5 shadow-sm">{content}</article>;
  };

  async function submitResponse() {
    if (!selected || !response.trim()) { setMessage("Select a Board request and add the Risk Manager response."); return; }
    setSaving(true);
    const { error } = await supabase.from("clarification_requests").update({ management_response: response.trim(), responded_at: new Date().toISOString(), status: "Management Responded" }).eq("id", selected.id);
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    await supabase.from("audit_logs").insert({ institution_id: institutionId(), module: "Clarification Requests", action_type: "MANAGEMENT_RESPONSE_SUBMITTED", record_ref: `${selected.loan_account || "No account"} - ${selected.request_title}`, old_value: selected.management_response || "No response", new_value: response.trim(), role: "Risk Manager", user_name: "Risk Manager", note: "Risk Manager response submitted to the Board Portal." });
    setResponse("");
    setSelectedId("");
    setMessage("Risk Manager response submitted. The Board has been notified.");
    await load();
  }

  return (
    <main className="min-h-screen bg-[#eef2f6] p-4 text-slate-950 sm:p-8">
      <div id="dashboard" className="mx-auto max-w-[1500px] space-y-7">
        <header className="rounded-[2rem] bg-[#071426] p-8 text-white shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">Portfolio risk surveillance and control</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Command Centre Risk Manager Dashboard</h1>
          <p className="mt-4 max-w-3xl text-slate-300">Portfolio risk position, early-warning signals, action accountability and Board clarification tasks for the Risk function.</p>
        </header>

        <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5">
          <p className="text-xs font-black uppercase text-cyan-900">Risk Manager attention queue</p>
          <p className="mt-1 font-semibold">{pendingRequests.length} Board tasks · {analysis.overdue.length} overdue actions · {analysis.escalated.length} escalated actions · {analysis.deteriorating.length} deterioration flags</p>
        </section>

        <section id="portfolio" className="scroll-mt-24 space-y-4">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-700">Locked portfolio intelligence</p><h2 className="mt-1 text-2xl font-black">Portfolio risk position</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metric("Outstanding portfolio", money(analysis.outstanding), `${records.length} accounts`)}
            {metric(`PAR30 · ${PAR30_SHORTHAND}`, percentage(total(analysis.par30Records.map((record) => record.outstanding_balance)), analysis.outstanding), `${analysis.par30Records.length} accounts · ${money(total(analysis.par30Records.map((record) => record.outstanding_balance)))}`, "/risk-manager-portal/accounts?filter=par30", "text-amber-800")}
            {metric(`PAR90 · ${PAR90_SHORTHAND}`, percentage(total(analysis.par90Records.map((record) => record.outstanding_balance)), analysis.outstanding), `${analysis.par90Records.length} accounts · ${money(total(analysis.par90Records.map((record) => record.outstanding_balance)))}`, "/risk-manager-portal/accounts?filter=par90", "text-red-700")}
            {metric("Watchlist", analysis.watchlist.length, `${money(total(analysis.watchlist.map((record) => record.outstanding_balance)))} exposure`, "/risk-manager-portal/accounts?filter=watchlist")}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-3xl bg-[#071426] p-6 text-white shadow-xl">
            <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Approved risk bands</p>
            <h2 className="mt-2 text-2xl font-black">Risk distribution</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Link href="/risk-manager-portal/accounts?filter=amber" className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-5"><strong className="text-3xl">{analysis.amber.length}</strong><span className="mt-2 block text-sm text-amber-100">Amber · 1–30 DPD</span></Link>
              <Link href="/risk-manager-portal/accounts?filter=red" className="rounded-2xl border border-red-300/40 bg-red-400/10 p-5"><strong className="text-3xl">{analysis.red.length}</strong><span className="mt-2 block text-sm text-red-100">Red · 31–90 DPD</span></Link>
              <Link href="/risk-manager-portal/accounts?filter=npl" className="rounded-2xl border border-fuchsia-300/40 bg-fuchsia-400/10 p-5"><strong className="text-3xl">{analysis.npl.length}</strong><span className="mt-2 block text-sm text-fuchsia-100">NPL · 91+ DPD</span></Link>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-700">Risk overlays</p>
            <h2 className="mt-2 text-2xl font-black">Surveillance priorities</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href="/risk-manager-portal/accounts?filter=early-warning" className="rounded-2xl border p-4"><strong className="text-2xl">{analysis.earlyWarning.length}</strong><span className="mt-1 block text-sm text-slate-600">Early warning · Amber + Red</span></Link>
              <Link href="/risk-manager-portal/accounts?filter=high-exposure" className="rounded-2xl border p-4"><strong className="text-2xl">{analysis.highExposure.length}</strong><span className="mt-1 block text-sm text-slate-600">Top high exposure</span></Link>
              <Link href="/risk-manager-portal/accounts?filter=restructured" className="rounded-2xl border p-4"><strong className="text-2xl">{analysis.restructured.length}</strong><span className="mt-1 block text-sm text-slate-600">Restructured risk</span></Link>
              <div className="rounded-2xl border p-4"><strong className="text-2xl">{analysis.deteriorating.length}</strong><span className="mt-1 block text-sm text-slate-600">Deterioration flags</span></div>
            </div>
          </div>
        </section>

        <section id="actions" className="scroll-mt-24 space-y-4">
          <h2 className="text-2xl font-black">Risk action accountability</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metric("Open actions", analysis.open.length, "All unresolved portfolio actions", "/risk-manager-portal/actions?filter=open")}
            {metric("Overdue", analysis.overdue.length, "Due date passed and not closed", "/risk-manager-portal/actions?filter=overdue", "text-red-700")}
            {metric("Escalated", analysis.escalated.length, "Level 3 and Level 4", "/risk-manager-portal/actions?filter=escalated")}
            {metric("Assigned to Risk", analysis.assigned.length, "Direct Risk Manager ownership", "/risk-manager-portal/actions?filter=assigned")}
          </div>
        </section>

        <section className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase text-cyan-700">Exposure-led review</p><h2 className="mt-1 text-2xl font-black">Priority risk accounts</h2></div><Link href="/risk-manager-portal/accounts?filter=watchlist" className="rounded-xl border px-4 py-2 text-sm font-black">Open full Watchlist</Link></div>
          <table className="mt-5 w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500">{["Account", "Member", "Risk", "DPD", "Outstanding", "Branch", "Responsible officer"].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{analysis.priority.map((record) => <tr key={record.loan_account} className="border-b"><td className="px-3 py-3 font-bold">{record.loan_account}</td><td className="px-3 py-3">{record.member_name}</td><td className="px-3 py-3 font-black">{record.risk_status}</td><td className="px-3 py-3">{record.days_in_arrears || 0}</td><td className="px-3 py-3">{money(record.outstanding_balance)}</td><td className="px-3 py-3">{record.branch || "—"}</td><td className="px-3 py-3">{record.responsible_officer || "Unassigned"}</td></tr>)}</tbody></table>
        </section>

        <section id="board-requests" className="grid scroll-mt-24 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex justify-between gap-4"><div><h2 className="text-2xl font-black">Board clarification inbox</h2><p className="text-sm text-slate-600">Only matters routed to the Risk Manager.</p></div><button type="button" onClick={() => void load()} className="rounded-xl border px-4 py-2 font-bold">Refresh</button></div>
            <div className="mt-5 space-y-3">{pendingRequests.map((request) => <button key={request.id} type="button" onClick={() => { setSelectedId(request.id); setResponse(request.management_response || ""); }} className={`w-full rounded-2xl border p-4 text-left ${selectedId === request.id ? "border-cyan-500 bg-cyan-50" : ""}`}><strong>{request.request_title}</strong><p className="mt-2 text-xs">{request.loan_account || "Portfolio-level"} · {request.status}</p></button>)}{!pendingRequests.length && <p className="rounded-2xl border border-dashed p-5 text-slate-600">No Board clarification is awaiting a Risk Manager response.</p>}</div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">Respond to the Board</h2>
            {selected ? <div className="mt-5 space-y-4"><div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Board question</p><p className="mt-2 whitespace-pre-wrap text-sm">{selected.question}</p></div><textarea value={response} onChange={(event) => setResponse(event.target.value)} className="min-h-40 w-full rounded-xl border p-3" placeholder="Risk assessment, evidence, corrective action, owner and timeline" /><button type="button" disabled={saving} onClick={() => void submitResponse()} className="rounded-xl bg-cyan-700 px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Submitting…" : "Submit response to Board"}</button></div> : <p className="mt-5 text-slate-600">Select a Board request to review and respond.</p>}
          </div>
        </section>

        <section id="audit" className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Risk-relevant audit trail</h2>
          <div className="mt-4 divide-y">{audits.map((audit) => <div key={audit.id} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr_150px]"><span className="text-xs text-slate-500">{new Date(audit.created_at).toLocaleString("en-KE")}</span><div><strong>{audit.action_type.replaceAll("_", " ")}</strong><p className="text-xs text-slate-600">{audit.record_ref} · {audit.note}</p></div><span className="text-xs font-bold">{audit.role}</span></div>)}{!audits.length && <p className="py-5 text-slate-500">No relevant audit events are available.</p>}</div>
        </section>
        {message && <p className="rounded-2xl bg-slate-950 p-4 text-sm font-bold text-white">{message}</p>}
      </div>
    </main>
  );
}
