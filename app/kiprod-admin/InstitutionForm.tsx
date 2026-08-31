"use client";

import { useActionState } from "react";
import { createInstitution, type InstitutionActionState } from "./actions";

export default function InstitutionForm() {
  const [state, action, pending] = useActionState<InstitutionActionState, FormData>(createInstitution, undefined);
  const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100";
  return <form action={action} className="grid gap-4 lg:grid-cols-2">
    <label className="text-sm font-bold">Institution name<input name="name" required className={field} placeholder="Clinical Sunrise DT Sacco" /></label>
    <label className="text-sm font-bold">Institution code<input name="slug" required className={field} placeholder="clinical-sunrise" /></label>
    <label className="text-sm font-bold">Approved email domain<input name="domain" className={field} placeholder="institution.co.ke" /></label>
    <label className="text-sm font-bold">First Institution Admin<input name="adminName" required className={field} placeholder="Full name" /></label>
    <label className="text-sm font-bold">Administrator email<input name="adminEmail" type="email" required className={field} placeholder="admin@institution.co.ke" /></label>
    <label className="text-sm font-bold">Temporary password<input name="temporaryPassword" type="password" minLength={12} required className={field} placeholder="12+ chars, upper/lower, number, symbol" /></label>
    <button disabled={pending} className="rounded-xl bg-violet-700 px-5 py-3 font-black text-white disabled:opacity-60 lg:col-span-2">{pending ? "Provisioning institution..." : "Create institution and first administrator"}</button>
    {state?.message && <p className={`rounded-xl p-4 text-sm font-bold lg:col-span-2 ${state.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{state.message}</p>}
  </form>;
}
