"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getInstitutionId } from "@/lib/institutionMaster";

export default function CockpitAccessControl() {
  const [riskManager, setRiskManager] = useState(false);
  const [creditManager, setCreditManager] = useState(false);
  const [message, setMessage] = useState("Loading approved access...");

  useEffect(() => {
    const institutionId = getInstitutionId();
    if (!institutionId) { setMessage("Institution ID is not configured."); return; }
    void supabase.from("institution_access_settings").select("executive_cockpit_roles").eq("institution_id", institutionId).maybeSingle().then(({ data, error }) => {
      if (error) { setMessage("Run the multi-institution security migration to configure Cockpit access."); return; }
      const roles = Array.isArray(data?.executive_cockpit_roles) ? data.executive_cockpit_roles : ["CEO"];
      setRiskManager(roles.includes("Risk Manager"));
      setCreditManager(roles.includes("Credit Manager"));
      setMessage("CEO access is enabled by default.");
    });
  }, []);

  async function save() {
    const institutionId = getInstitutionId();
    if (!institutionId) return;
    const roles = ["CEO", ...(riskManager ? ["Risk Manager"] : []), ...(creditManager ? ["Credit Manager"] : [])];
    const { data: actor } = await supabase.auth.getUser();
    const { error } = await supabase.from("institution_access_settings").upsert({
      institution_id: institutionId,
      executive_cockpit_roles: roles,
      updated_by: actor.user?.id || null,
      updated_at: new Date().toISOString(),
    });
    if (error) { setMessage(error.message); return; }
    await supabase.from("audit_logs").insert({
      institution_id: institutionId,
      module: "Role Access",
      action_type: "EXECUTIVE_COCKPIT_ACCESS_CHANGED",
      record_ref: "Executive Cockpit",
      old_value: "Previous approved roles",
      new_value: roles.join(", "),
      role: "Institution Admin",
      user_name: actor.user?.email || "Institution Admin",
      note: "CEO remains enabled; optional senior-role access updated.",
    });
    setMessage(`Saved: ${roles.join(", ")}.`);
  }

  return <section className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[.18em] text-violet-700">Senior access configuration</p><h2 className="mt-1 text-2xl font-black">Executive Cockpit access</h2><p className="mt-2 text-sm text-slate-600">CEO access is fixed for the MVP. Approve optional access only where the institution’s operating model requires it.</p><div className="mt-5 flex flex-wrap gap-5"><label className="font-bold"><input type="checkbox" checked readOnly className="mr-2"/>CEO</label><label className="font-bold"><input type="checkbox" checked={riskManager} onChange={(event)=>setRiskManager(event.target.checked)} className="mr-2"/>Risk Manager</label><label className="font-bold"><input type="checkbox" checked={creditManager} onChange={(event)=>setCreditManager(event.target.checked)} className="mr-2"/>Credit Manager</label></div><button type="button" onClick={()=>void save()} className="mt-5 rounded-xl bg-violet-700 px-5 py-3 font-black text-white">Save approved access</button><p className="mt-3 text-sm font-bold text-slate-600">{message}</p></section>;
}
