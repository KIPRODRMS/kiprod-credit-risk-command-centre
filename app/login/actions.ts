"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assignedRolesFromUser, normaliseRole, ROLE_COOKIE, type PortalRole } from "@/lib/accessControl";

export type LoginState = {
  message: string;
} | undefined;

export async function login(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const selectedRole = normaliseRole(formData.get("accountType"));

  if (!email || !email.includes("@") || !password || !selectedRole) {
    return { message: "Choose an account type and enter valid credentials." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await supabase.rpc("kiprod_record_auth_event", {
      p_event_type: "LOGIN_FAILED",
      p_email: email,
      p_selected_role: selectedRole,
      p_note: "Credentials were not recognised.",
    });
    return { message: "The email or password was not recognised." };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("roles,status")
    .eq("user_id", data.user.id)
    .maybeSingle();
  const profileRoles = Array.isArray(profile?.roles)
    ? profile.roles.map(normaliseRole).filter((role): role is PortalRole => Boolean(role))
    : [];
  let assignedRoles = profileRoles.length ? profileRoles : assignedRolesFromUser(data.user);

  if (String(profile?.status || "Active") === "Disabled") {
    await supabase.rpc("kiprod_record_auth_event", {
      p_event_type: "DISABLED_LOGIN_BLOCKED",
      p_email: email,
      p_selected_role: selectedRole,
      p_note: "Disabled user attempted to sign in.",
    });
    await supabase.auth.signOut();
    return { message: "This account has been disabled. Contact your administrator." };
  }
  const bootstrapEmail = String(process.env.KIPROD_BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  const mayBootstrapInstitutionAdmin =
    !assignedRoles.length &&
    selectedRole === "Institution Admin" &&
    Boolean(bootstrapEmail) &&
    email === bootstrapEmail;

  if (mayBootstrapInstitutionAdmin) {
    const { data: updated, error: updateError } = await supabase.auth.updateUser({
      data: { kiprod_roles: ["Institution Admin"] },
    });
    if (updateError) {
      await supabase.auth.signOut();
      return { message: "The institution administrator account could not be activated." };
    }
    assignedRoles = assignedRolesFromUser(updated.user);
  }

  if (!assignedRoles.includes(selectedRole)) {
    await supabase.rpc("kiprod_record_auth_event", {
      p_event_type: "ROLE_MISMATCH",
      p_email: email,
      p_selected_role: selectedRole,
      p_note: "Selected account type was not assigned to this user.",
    });
    await supabase.auth.signOut();
    return { message: `This account is not assigned to the ${selectedRole} portal.` };
  }

  const cookieStore = await cookies();
  cookieStore.set(ROLE_COOKIE, selectedRole, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  await supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "LOGIN_SUCCEEDED",
    p_email: email,
    p_selected_role: selectedRole,
    p_note: "User authenticated and routed to the approved workspace.",
  });

  redirect("/");
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  await supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "LOGOUT",
    p_email: data.user?.email || "",
    p_selected_role: cookieStore.get(ROLE_COOKIE)?.value || "",
    p_note: "User signed out.",
  });
  await supabase.auth.signOut();
  cookieStore.delete(ROLE_COOKIE);
  redirect("/login?loggedOut=1");
}
