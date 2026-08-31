"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assignedRolesFromUser, normaliseRole, type PortalRole } from "@/lib/accessControl";

export type InstitutionActionState = { message: string; ok: boolean } | undefined;
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

async function requireKiprodAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null, allowed: false };
  const { data: profile } = await supabase.from("user_profiles").select("roles,status").eq("user_id", data.user.id).maybeSingle();
  const profileRoles = Array.isArray(profile?.roles)
    ? profile.roles.map(normaliseRole).filter((role): role is PortalRole => Boolean(role))
    : [];
  const roles = profileRoles.length ? profileRoles : assignedRolesFromUser(data.user);
  return { supabase, user: data.user, allowed: roles.includes("KIPROD Admin") && String(profile?.status || "Active") !== "Disabled" };
}

export async function createInstitution(_state: InstitutionActionState, formData: FormData): Promise<InstitutionActionState> {
  const access = await requireKiprodAdmin();
  if (!access.allowed || !access.user) return { ok: false, message: "KIPROD Admin access is required." };

  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const domain = String(formData.get("domain") || "").trim().toLowerCase();
  const adminName = String(formData.get("adminName") || "").trim();
  const adminEmail = String(formData.get("adminEmail") || "").trim().toLowerCase();
  const temporaryPassword = String(formData.get("temporaryPassword") || "");
  if (!name || !slug || !adminName || !adminEmail.includes("@") || !STRONG_PASSWORD.test(temporaryPassword)) {
    return { ok: false, message: "Complete all details and use a 12+ character temporary password with uppercase, lowercase, a number and a symbol." };
  }

  const { data: institution, error: institutionError } = await access.supabase.from("institutions").insert({
    name, slug, approved_domain: domain || null, primary_contact_email: adminEmail, status: "Pending",
  }).select("id").single();
  if (institutionError || !institution) return { ok: false, message: institutionError?.message || "Institution could not be created." };

  await access.supabase.from("institution_access_settings").upsert({
    institution_id: institution.id, executive_cockpit_roles: ["CEO"], updated_by: access.user.id,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { ok: false, message: "Institution created, but authentication is not configured for the first administrator." };
  const signupClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: invited, error: inviteError } = await signupClient.auth.signUp({
    email: adminEmail,
    password: temporaryPassword,
    options: { data: { full_name: adminName, kiprod_roles: ["Institution Admin"], institution_id: institution.id } },
  });
  if (inviteError || !invited.user?.identities?.length) {
    return { ok: false, message: `Institution was created as Pending, but the first administrator account failed: ${inviteError?.message || "email already registered"}.` };
  }

  await access.supabase.from("institutions").update({ status: "Active", updated_at: new Date().toISOString() }).eq("id", institution.id);
  await access.supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "INSTITUTION_CREATED", p_email: adminEmail, p_selected_role: "Institution Admin", p_note: `${name} was provisioned by KIPROD Admin.`,
  });
  revalidatePath("/kiprod-admin");
  return { ok: true, message: invited.session ? `${name} is active and ${adminName} can sign in.` : `${name} is active. ${adminName} must confirm the invitation email before signing in.` };
}

export async function setInstitutionStatus(formData: FormData) {
  const access = await requireKiprodAdmin();
  if (!access.allowed) return;
  const id = String(formData.get("institutionId") || "");
  const status = String(formData.get("status") || "");
  if (!id || !["Active", "Suspended"].includes(status)) return;
  await access.supabase.from("institutions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  await access.supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "INSTITUTION_STATUS_CHANGED", p_email: access.user?.email || "", p_selected_role: "KIPROD Admin", p_note: `Institution ${id} changed to ${status}.`,
  });
  revalidatePath("/kiprod-admin");
}

export async function setPlatformUserStatus(formData: FormData) {
  const access = await requireKiprodAdmin();
  if (!access.allowed || !access.user) return;
  const userId = String(formData.get("userId") || "");
  const status = String(formData.get("status") || "");
  if (!userId || !["Active", "Disabled"].includes(status) || userId === access.user.id) return;
  const { data: target } = await access.supabase
    .from("user_profiles")
    .select("email,institution_id")
    .eq("user_id", userId)
    .maybeSingle();
  await access.supabase.from("user_profiles").update({ status, updated_at: new Date().toISOString() }).eq("user_id", userId);
  await access.supabase.rpc("kiprod_record_auth_event", {
    p_event_type: status === "Disabled" ? "PLATFORM_USER_DISABLED" : "PLATFORM_USER_ACTIVATED",
    p_email: target?.email || "",
    p_selected_role: "KIPROD Admin",
    p_note: `User ${userId} changed to ${status} for platform support.`,
  });
  revalidatePath("/kiprod-admin");
}

export async function setExecutiveCockpitAccess(formData: FormData) {
  const access = await requireKiprodAdmin();
  if (!access.allowed || !access.user) return;
  const institutionId = String(formData.get("institutionId") || "");
  if (!institutionId) return;
  const roles = ["CEO"];
  if (formData.get("riskManager") === "on") roles.push("Risk Manager");
  if (formData.get("creditManager") === "on") roles.push("Credit Manager");
  await access.supabase.from("institution_access_settings").upsert({
    institution_id: institutionId,
    executive_cockpit_roles: roles,
    updated_by: access.user.id,
    updated_at: new Date().toISOString(),
  });
  await access.supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "COCKPIT_ACCESS_CHANGED",
    p_email: access.user.email || "",
    p_selected_role: "KIPROD Admin",
    p_note: `Executive Cockpit roles for ${institutionId}: ${roles.join(", ")}.`,
  });
  revalidatePath("/kiprod-admin");
}
