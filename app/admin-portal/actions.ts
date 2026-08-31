"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assignedRolesFromUser, normaliseRole } from "@/lib/accessControl";

export type CreatePortalUserInput = {
  name: string;
  email: string;
  temporaryPassword: string;
  role: string;
};

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export async function createPortalUser(input: CreatePortalUserInput) {
  const sessionClient = await createServerSupabaseClient();
  const { data: actor } = await sessionClient.auth.getUser();
  const { data: actorProfile } = actor.user
    ? await sessionClient.from("user_profiles").select("institution_id,roles,status").eq("user_id", actor.user.id).maybeSingle()
    : { data: null };
  const profileRoles = Array.isArray(actorProfile?.roles)
    ? actorProfile.roles.map(normaliseRole).filter(Boolean)
    : [];
  const actorRoles = profileRoles.length ? profileRoles : assignedRolesFromUser(actor.user);

  if (!actorRoles.includes("Institution Admin") && !actorRoles.includes("KIPROD Admin")) {
    return { ok: false, message: "Only an authorised administrator can create portal accounts." };
  }

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const role = normaliseRole(input.role);
  const temporaryPassword = input.temporaryPassword;

  if (!name || !email.includes("@") || !role || !STRONG_PASSWORD.test(temporaryPassword)) {
    return { ok: false, message: "Use a temporary password of at least 12 characters with uppercase, lowercase, a number and a symbol." };
  }

  if (role === "KIPROD Admin" && !actorRoles.includes("KIPROD Admin")) {
    return { ok: false, message: "Institution administrators cannot create KIPROD administrator accounts." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { ok: false, message: "Authentication is not configured." };

  const signupClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await signupClient.auth.signUp({
    email,
    password: temporaryPassword,
    options: {
      data: {
        full_name: name,
        kiprod_roles: [role],
        institution_id: actorProfile?.institution_id || actor.user?.user_metadata?.institution_id || process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || null,
      },
    },
  });

  if (error) return { ok: false, message: error.message };
  if (!data.user?.identities?.length) return { ok: false, message: "An authentication account already exists for that email." };

  return {
    ok: true,
    message: data.session
      ? `${name} can now sign in as ${role}.`
      : `${name} was created as ${role}. They must confirm their email before signing in.`,
    requiresEmailConfirmation: !data.session,
    userId: data.user.id,
  };
}

export async function setInstitutionUserStatus(userId: string, status: "Active" | "Disabled") {
  const sessionClient = await createServerSupabaseClient();
  const { data: actor } = await sessionClient.auth.getUser();
  if (!actor.user || actor.user.id === userId) return { ok: false, message: "You cannot disable your own administrator account." };
  const { data: actorProfile } = await sessionClient.from("user_profiles").select("institution_id,roles,status").eq("user_id", actor.user.id).maybeSingle();
  const actorRoles = Array.isArray(actorProfile?.roles)
    ? actorProfile.roles.map(normaliseRole).filter(Boolean)
    : assignedRolesFromUser(actor.user);
  if (!actorRoles.includes("Institution Admin") || String(actorProfile?.status || "Active") === "Disabled") {
    return { ok: false, message: "Institution Admin access is required." };
  }
  const { data: target } = await sessionClient.from("user_profiles").select("institution_id,email,roles").eq("user_id", userId).maybeSingle();
  if (!target || target.institution_id !== actorProfile?.institution_id || (Array.isArray(target.roles) && target.roles.includes("KIPROD Admin"))) {
    return { ok: false, message: "That account is outside your institution control boundary." };
  }
  const { error } = await sessionClient.from("user_profiles").update({ status, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) return { ok: false, message: error.message };
  await sessionClient.rpc("kiprod_record_auth_event", {
    p_event_type: status === "Disabled" ? "PORTAL_USER_DISABLED" : "PORTAL_USER_ENABLED",
    p_email: target.email || "",
    p_selected_role: "Institution Admin",
    p_note: `Institution user changed to ${status}.`,
  });
  return { ok: true, message: `${target.email} is now ${status.toLowerCase()}.` };
}
