"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { defaultInstitutionProfile, getInstitutionId, loadMasterInstitutionProfile, type InstitutionProfile } from "@/lib/institutionMaster";
import { supabase } from "@/lib/supabaseClient";
import { createPortalUser, setInstitutionUserStatus } from "./actions";
import CockpitAccessControl from "./CockpitAccessControl";

type UserStatus = "Active" | "Disabled" | "Setup Required";
type PortalUser = { id: string; name: string; email: string; role: string; status: UserStatus; portal: string; createdAt: string };
type AuditRow = { id: string; created_at: string; action_type: string; record_ref: string; role: string; note: string };
type Source = { sourceName?: string; uploadedAt?: string; recordCount?: number };

const STORAGE_KEY = "kiprodPortalUsers";
const roles = ["Institution Admin", "Board Chair", "Board Member", "Board Secretary", "CEO", "Risk Manager", "Credit Manager", "Portfolio/Loans Manager", "Recovery Manager"];
const portalForRole: Record<string, string> = {
  "Institution Admin": "/admin-portal", "Board Chair": "/board-portal", "Board Member": "/board-portal", "Board Secretary": "/board-portal", CEO: "/ceo-portal", "Risk Manager": "/risk-manager-portal", "Credit Manager": "/credit-manager-portal", "Portfolio/Loans Manager": "/portfolio-manager-portal", "Recovery Manager": "/recovery-manager-portal",
};
const accessMatrix = [
  ["Board Chair / Member / Secretary", "Board oversight, reports, clarifications and decisions", "Read-only operational data"],
  ["CEO", "Institution-wide executive position, escalations and Board responses", "No formula or source-data editing"],
  ["Risk Manager", "Risk surveillance, Watchlist oversight, actions and Board responses", "No policy-definition changes"],
  ["Credit Manager", "Early warning, credit intervention, actions and Board responses", "No Board decision rights"],
  ["Portfolio/Loans Manager", "Portfolio servicing, officer ownership, actions and Board responses", "No Board decision rights"],
  ["Recovery Manager", "NPL recovery, handoffs, actions and Board responses", "No policy-definition changes"],
  ["Institution Admin", "Institution users, role assignment, profile and access administration", "No locked-risk formula changes"],
];
const portals = [
  ["Board Portal", "/board-portal"], ["CEO Portal", "/ceo-portal"], ["Risk Manager", "/risk-manager-portal"], ["Credit Manager", "/credit-manager-portal"], ["Portfolio/Loans", "/portfolio-manager-portal"], ["Recovery Manager", "/recovery-manager-portal"],
];

const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; } };

export default function AdminPortalPage() {
  const [profile, setProfile] = useState<InstitutionProfile>(defaultInstitutionProfile);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [source, setSource] = useState<Source>({});
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);
  const [clarificationCount, setClarificationCount] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Board Member");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [message, setMessage] = useState("");

  async function refreshAudit() {
    const id = getInstitutionId();
    if (!id) return;
    const { data } = await supabase.from("audit_logs").select("id,created_at,action_type,record_ref,role,note").eq("institution_id", id).order("created_at", { ascending: false }).limit(12);
    setAudits((data || []) as AuditRow[]);
  }

  useEffect(() => {
    localStorage.setItem("kiprodCurrentRole", "Institution Admin");
    loadMasterInstitutionProfile().then((result) => {
      setProfile(result.profile);
      const institutionId = getInstitutionId();
      if (institutionId) void supabase.from("user_profiles").select("user_id,full_name,email,roles,status,created_at").eq("institution_id", institutionId).order("created_at", { ascending: true }).then(({ data }) => {
        if (!data?.length) return;
        const registry = data.map((item) => { const itemRole = String(Array.isArray(item.roles) ? item.roles[0] || "" : ""); return { id: String(item.user_id), name: String(item.full_name || "Name not recorded"), email: String(item.email || ""), role: itemRole, status: String(item.status || "Active") as UserStatus, portal: portalForRole[itemRole] || "/", createdAt: String(item.created_at || "") }; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
        setUsers(registry);
      });
      const existing = read<PortalUser[]>(STORAGE_KEY, []);
      if (existing.length) setUsers(existing);
    });
    const records = read<unknown[]>("kiprod_loan_records", []);
    const actions = read<unknown[]>("kiprod_action_items", []);
    const clarifications = read<unknown[]>("kiprodClarificationRequests", []);
    setPortfolioCount(records.length); setActionCount(actions.length); setClarificationCount(clarifications.length);
    setSource(read<Source>("kiprod_portfolio_source", {}));
    void refreshAudit();
  }, []);

  const activeUsers = users.filter((user) => user.status === "Active").length;
  const setupRequired = users.filter((user) => user.status === "Setup Required").length;
  const coveredRoles = useMemo(() => new Set(users.filter((user) => user.status !== "Disabled").map((user) => user.role)).size, [users]);

  async function audit(actionType: string, recordRef: string, note: string) {
    const id = getInstitutionId();
    if (!id) return;
    await supabase.from("audit_logs").insert({ institution_id: id, module: "Role Access", action_type: actionType, record_ref: recordRef, old_value: "", new_value: note, role: "Institution Admin", user_name: "Institution Admin", note });
    await refreshAudit();
  }

  async function addUser() {
    const cleanName = name.trim(), cleanEmail = email.trim().toLowerCase();
    if (!cleanName || !cleanEmail) { setMessage("Enter the user's name and email address."); return; }
    if (users.some((user) => user.email.toLowerCase() === cleanEmail)) { setMessage("That email already exists in the access registry."); return; }
    const authResult = await createPortalUser({ name: cleanName, email: cleanEmail, temporaryPassword, role });
    if (!authResult.ok) { setMessage(authResult.message); return; }
    const next: PortalUser = { id: authResult.userId || crypto.randomUUID(), name: cleanName, email: cleanEmail, role, status: authResult.requiresEmailConfirmation ? "Setup Required" : "Active", portal: portalForRole[role] || "/", createdAt: new Date().toISOString() };
    const updated = [...users, next];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); setUsers(updated); setName(""); setEmail(""); setTemporaryPassword(""); setMessage(authResult.message);
    await audit("PORTAL_USER_CREATED", cleanEmail, `${cleanName} assigned to ${role} and routed to ${next.portal}.`);
  }

  async function toggleUser(user: PortalUser) {
    const status: UserStatus = user.status === "Active" ? "Disabled" : "Active";
    const result = await setInstitutionUserStatus(user.id, status as "Active" | "Disabled");
    if (!result.ok) { setMessage(result.message); return; }
    const updated = users.map((item) => item.id === user.id ? { ...item, status } : item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); setUsers(updated); setMessage(result.message);
    await audit(status === "Active" ? "PORTAL_USER_ENABLED" : "PORTAL_USER_DISABLED", user.email || user.name, `${user.role} access changed to ${status}.`);
  }

  const metric = (label: string, value: string | number, note: string) => <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-600">{note}</p></article>;

  return <main className="min-h-screen bg-[#eef2f6] p-4 text-slate-950 sm:p-8"><div id="dashboard" className="mx-auto max-w-[1500px] space-y-7">
    <header className="rounded-[2rem] bg-[#071426] p-8 text-white shadow-2xl"><p className="text-xs font-black uppercase tracking-[.22em] text-violet-300">Institution access and system control</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Command Centre System Administrator Dashboard</h1><p className="mt-4 max-w-3xl text-slate-300">{profile.institutionName || "Institution"}: create personal portal accounts, assign approved roles and manage institutional access.</p></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metric("Registered users", users.length, `${activeUsers} active`)}{metric("Setup required", setupRequired, "Users awaiting production authentication")}{metric("Roles covered", `${coveredRoles}/${roles.length}`, "Active institutional role coverage")}{metric("Portfolio source", portfolioCount, source.uploadedAt ? `Updated ${new Date(source.uploadedAt).toLocaleDateString("en-KE")}` : "No upload timestamp")}</section>

    <section id="users" className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm"><div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-700">Access administration</p><h2 className="mt-1 text-2xl font-black">Portal user registry</h2></div><div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"><label className="text-sm font-bold">Full name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border p-3" placeholder="User's full name" /></label><label className="text-sm font-bold">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border p-3" placeholder="name@institution.org" /></label><label className="text-sm font-bold">Account type<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 w-full rounded-xl border p-3">{roles.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-bold">Temporary password<input type="password" minLength={12} value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} className="mt-2 w-full rounded-xl border p-3" placeholder="12+ chars, upper/lower, number, symbol" /></label><button type="button" onClick={() => void addUser()} className="self-end rounded-xl bg-violet-700 px-5 py-3 font-black text-white">Create account</button></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500">{["User", "Email", "Role", "Assigned portal", "Status", "Control"].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b"><td className="px-3 py-3 font-bold">{user.name}</td><td className="px-3 py-3">{user.email || "Email pending"}</td><td className="px-3 py-3">{user.role}</td><td className="px-3 py-3"><Link href={user.portal} className="font-bold text-violet-700 underline">{user.portal}</Link></td><td className="px-3 py-3 font-bold">{user.status}</td><td className="px-3 py-3"><button type="button" onClick={() => void toggleUser(user)} className="rounded-lg border px-3 py-2 font-bold">{user.status === "Active" ? "Disable" : "Enable"}</button></td></tr>)}</tbody></table></div>{message && <p className="mt-4 rounded-xl bg-slate-950 p-3 text-sm font-bold text-white">{message}</p>}
    </section>

    <section id="access" className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[.18em] text-violet-700">Governance controls</p><h2 className="mt-1 text-2xl font-black">Portal access matrix</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="px-3 py-3">Role</th><th className="px-3 py-3">Approved access</th><th className="px-3 py-3">Control boundary</th></tr></thead><tbody>{accessMatrix.map(([matrixRole, access, boundary]) => <tr key={matrixRole} className="border-b"><td className="px-3 py-4 font-black">{matrixRole}</td><td className="px-3 py-4">{access}</td><td className="px-3 py-4 text-slate-600">{boundary}</td></tr>)}</tbody></table></div></section>

    <CockpitAccessControl />

    <section id="controls" className="scroll-mt-24 space-y-4"><h2 className="text-2xl font-black">System controls and readiness</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Link href="/institution-profile" className="rounded-2xl border bg-white p-5 shadow-sm"><strong>Institution Profile</strong><p className="mt-2 text-sm text-slate-600">Master institution and reporting configuration.</p></Link><Link href="/role-access" className="rounded-2xl border bg-white p-5 shadow-sm"><strong>Role Access</strong><p className="mt-2 text-sm text-slate-600">Legacy role simulator and access reference.</p></Link><Link href="/portfolio-upload" className="rounded-2xl border bg-white p-5 shadow-sm"><strong>Portfolio Source</strong><p className="mt-2 text-sm text-slate-600">{portfolioCount} records and {actionCount} action records present.</p></Link><Link href="/audit-history" className="rounded-2xl border bg-white p-5 shadow-sm"><strong>Audit History</strong><p className="mt-2 text-sm text-slate-600">{clarificationCount} cached clarification records.</p></Link></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{portals.map(([label, href]) => <Link key={href} href={href} className="rounded-2xl bg-[#071426] p-5 text-white shadow-lg"><span className="text-xs font-black uppercase text-violet-300">Open portal</span><strong className="mt-2 block text-lg text-white">{label}</strong></Link>)}</div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><strong className="text-emerald-900">Locked risk-policy protection active</strong><p className="mt-2 text-sm text-emerald-800">The Admin Portal has no controls for changing Green/Amber/Red/NPL bands, PAR30, PAR90, Watchlist membership, overdue logic or action-preservation rules.</p></div>
    </section>

    <section id="audit" className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm"><div className="flex justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-700">Accountability evidence</p><h2 className="mt-1 text-2xl font-black">Recent system audit trail</h2></div><button type="button" onClick={() => void refreshAudit()} className="rounded-xl border px-4 py-2 font-bold">Refresh</button></div><div className="mt-4 divide-y">{audits.map((auditRow) => <div key={auditRow.id} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr_150px]"><span className="text-xs text-slate-500">{new Date(auditRow.created_at).toLocaleString("en-KE")}</span><div><strong>{auditRow.action_type.replaceAll("_", " ")}</strong><p className="text-xs text-slate-600">{auditRow.record_ref} - {auditRow.note}</p></div><span className="text-xs font-bold">{auditRow.role}</span></div>)}{!audits.length && <p className="py-5 text-slate-500">No audit records are available.</p>}</div></section>
  </div></main>;
}
