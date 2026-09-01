"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assignedRolesFromUser, normaliseRole, type PortalRole } from "@/lib/accessControl";

export type InstitutionActionState = { message: string; ok: boolean } | undefined;
export type UserSupportActionState = { message: string; ok: boolean } | undefined;
const USER_STATUSES = ["Invited", "Active", "Disabled"] as const;

function createAuthAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function requestOrigin() {
  const requestHeaders = await headers();
  return requestHeaders.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || `${requestHeaders.get("x-forwarded-proto") || "https"}://${requestHeaders.get("host")}`;
}
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

export async function updatePlatformUser(_state: UserSupportActionState, formData: FormData): Promise<UserSupportActionState> {
  const access = await requireKiprodAdmin();
  if (!access.allowed || !access.user) return { ok: false, message: "KIPROD Admin access is required." };

  const userId = String(formData.get("userId") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const institutionId = String(formData.get("institutionId") || "").trim() || null;
  const status = String(formData.get("status") || "").trim();
  const confirmedTransfer = formData.get("confirmTransfer") === "on";
  const selectedRoles = [...new Set(formData.getAll("roles").map(normaliseRole).filter((role): role is PortalRole => Boolean(role)))];

  if (!userId || !fullName || !email.includes("@") || !USER_STATUSES.includes(status as (typeof USER_STATUSES)[number])) {
    return { ok: false, message: "Complete the user name, valid email and account status." };
  }

  const { data: target, error: targetError } = await access.supabase
    .from("user_profiles")
    .select("user_id,institution_id,full_name,email,roles,status")
    .eq("user_id", userId)
    .maybeSingle();
  if (targetError || !target) return { ok: false, message: targetError?.message || "User account was not found." };

  const currentRoles = Array.isArray(target.roles) ? target.roles.map(normaliseRole).filter((role): role is PortalRole => Boolean(role)) : [];
  const isPlatformAdmin = currentRoles.includes("KIPROD Admin");
  const isCurrentUser = userId === access.user.id;
  const roles = isPlatformAdmin ? ["KIPROD Admin" as PortalRole] : selectedRoles.filter((role) => role !== "KIPROD Admin");

  if (!isPlatformAdmin && (!institutionId || !roles.length)) {
    return { ok: false, message: "Institution users require an institution and at least one approved role." };
  }
  if (isCurrentUser && (status !== "Active" || !roles.includes("KIPROD Admin"))) {
    return { ok: false, message: "The current KIPROD Admin cannot disable or remove their own platform role." };
  }
  if ((target.institution_id || null) !== institutionId && !isPlatformAdmin && !confirmedTransfer) {
    return { ok: false, message: "Confirm the institution transfer before saving this account." };
  }

  const emailChanged = String(target.email || "").toLowerCase() !== email;
  if (isCurrentUser && emailChanged) return { ok: false, message: "Change your own login email through My Account." };
  const authAdmin = createAuthAdminClient();
  if (emailChanged && !authAdmin) {
    return { ok: false, message: "Email changes require SUPABASE_SERVICE_ROLE_KEY on the server. Other details were not changed." };
  }

  if (emailChanged && authAdmin) {
    const { error } = await authAdmin.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, institution_id: isPlatformAdmin ? null : institutionId, kiprod_roles: roles },
    });
    if (error) return { ok: false, message: `Login email could not be changed: ${error.message}` };
  }

  const { error: updateError } = await access.supabase.from("user_profiles").update({
    full_name: fullName,
    email,
    institution_id: isPlatformAdmin ? null : institutionId,
    roles,
    status,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  if (updateError) {
    if (emailChanged && authAdmin) await authAdmin.auth.admin.updateUserById(userId, { email: target.email, email_confirm: true });
    return { ok: false, message: updateError.message };
  }

  await access.supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "PLATFORM_USER_UPDATED",
    p_email: email,
    p_selected_role: roles.join(", "),
    p_note: `KIPROD Admin updated user ${userId}. Institution: ${institutionId || "KIPROD platform"}; status: ${status}.`,
  });
  revalidatePath("/kiprod-admin");
  return { ok: true, message: emailChanged ? "User details and login email updated." : "User details updated." };
}

export async function sendPlatformPasswordReset(_state: UserSupportActionState, formData: FormData): Promise<UserSupportActionState> {
  const access = await requireKiprodAdmin();
  if (!access.allowed || !access.user) return { ok: false, message: "KIPROD Admin access is required." };
  const userId = String(formData.get("userId") || "").trim();
  const { data: target } = await access.supabase.from("user_profiles").select("email,status").eq("user_id", userId).maybeSingle();
  if (!target?.email) return { ok: false, message: "User account was not found." };
  if (target.status === "Disabled") return { ok: false, message: "Reactivate this user before sending a password reset." };
  const origin = await requestOrigin();
  const { error } = await access.supabase.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) return { ok: false, message: `Reset email could not be sent: ${error.message}` };
  await access.supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "ADMIN_PASSWORD_RESET_SENT", p_email: target.email, p_selected_role: "KIPROD Admin", p_note: "KIPROD Admin sent a secure password-reset link.",
  });
  return { ok: true, message: "Secure password-reset email sent." };
}

export async function resendPlatformInvitation(_state: UserSupportActionState, formData: FormData): Promise<UserSupportActionState> {
  const access = await requireKiprodAdmin();
  if (!access.allowed || !access.user) return { ok: false, message: "KIPROD Admin access is required." };
  const userId = String(formData.get("userId") || "").trim();
  const { data: target } = await access.supabase.from("user_profiles").select("email,status").eq("user_id", userId).maybeSingle();
  if (!target?.email) return { ok: false, message: "User account was not found." };
  if (target.status !== "Invited") return { ok: false, message: "Only accounts awaiting activation need an invitation resent." };
  const origin = await requestOrigin();
  const { error } = await access.supabase.auth.resend({
    type: "signup",
    email: target.email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/account` },
  });
  if (error) return { ok: false, message: `Invitation could not be resent: ${error.message}` };
  await access.supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "ADMIN_INVITATION_RESENT", p_email: target.email, p_selected_role: "KIPROD Admin", p_note: "KIPROD Admin resent the account activation email.",
  });
  return { ok: true, message: "Activation email resent." };
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
