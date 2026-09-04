"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assignedRolesFromUser,
  normaliseRole,
  type PortalRole,
} from "@/lib/accessControl";

export type ProvisionInstitutionUserState =
  | { ok: boolean; message: string }
  | undefined;

const STRONG_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

const INSTITUTION_ROLES: PortalRole[] = [
  "Institution Admin",
  "Board Chair",
  "Board Member",
  "Board Secretary",
  "CEO",
  "Risk Manager",
  "Credit Manager",
  "Portfolio/Loans Manager",
  "Recovery Manager",
];

async function requireKiprodAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return { supabase, user: null, allowed: false };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("roles,status")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const profileRoles = Array.isArray(profile?.roles)
    ? profile.roles
        .map(normaliseRole)
        .filter((role): role is PortalRole => Boolean(role))
    : [];

  const roles = profileRoles.length
    ? profileRoles
    : assignedRolesFromUser(data.user);

  return {
    supabase,
    user: data.user,
    allowed:
      roles.includes("KIPROD Admin") &&
      String(profile?.status || "Active") !== "Disabled",
  };
}

async function requestOrigin() {
  const requestHeaders = await headers();

  const configured =
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) return configured.replace(/\/$/, "");

  const origin = requestHeaders.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  return `${requestHeaders.get("x-forwarded-proto") || "https"}://${requestHeaders.get("host")}`;
}

export async function provisionInstitutionUser(
  _state: ProvisionInstitutionUserState,
  formData: FormData,
): Promise<ProvisionInstitutionUserState> {
  const access = await requireKiprodAdmin();

  if (!access.allowed || !access.user) {
    return { ok: false, message: "KIPROD Admin access is required." };
  }

  const institutionId = String(
    formData.get("institutionId") || "",
  ).trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const temporaryPassword = String(
    formData.get("temporaryPassword") || "",
  );
  const role = normaliseRole(formData.get("role"));

  if (
    !institutionId ||
    !fullName ||
    !email.includes("@") ||
    !role ||
    !INSTITUTION_ROLES.includes(role)
  ) {
    return {
      ok: false,
      message:
        "Select an existing institution and approved role, then enter the user's name and valid email.",
    };
  }

  if (!STRONG_PASSWORD.test(temporaryPassword)) {
    return {
      ok: false,
      message:
        "Use a temporary password of at least 12 characters with uppercase, lowercase, a number and a symbol.",
    };
  }

  const { data: institution, error: institutionError } =
    await access.supabase
      .from("institutions")
      .select("id,name,status")
      .eq("id", institutionId)
      .maybeSingle();

  if (institutionError || !institution) {
    return {
      ok: false,
      message:
        institutionError?.message ||
        "The selected institution was not found.",
    };
  }

  if (institution.status === "Suspended") {
    return {
      ok: false,
      message:
        "Reactivate this institution before creating additional users.",
    };
  }

  const { data: existingProfile } = await access.supabase
    .from("user_profiles")
    .select("user_id,email,institution_id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (existingProfile) {
    return {
      ok: false,
      message:
        "That email already has a Command Centre account. Use User Support instead of creating a duplicate.",
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      ok: false,
      message: "Authentication is not configured.",
    };
  }

  const origin = await requestOrigin();

  const signupClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await signupClient.auth.signUp({
    email,
    password: temporaryPassword,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
      data: {
        full_name: fullName,
        kiprod_roles: [role],
        institution_id: institution.id,
      },
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!data.user?.identities?.length) {
    return {
      ok: false,
      message:
        "An authentication account already exists for that email. Use User Support or password recovery instead.",
    };
  }

  await access.supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "PLATFORM_INSTITUTION_USER_CREATED",
    p_email: email,
    p_selected_role: role,
    p_note: `${fullName} was assigned to ${institution.name} as ${role} by KIPROD Admin.`,
  });

  revalidatePath("/kiprod-admin");
  revalidatePath("/kiprod-admin/provision-user");

  return {
    ok: true,
    message: data.session
      ? `${fullName} is active in ${institution.name} as ${role}.`
      : `${fullName} was added to ${institution.name} as ${role}. A confirmation email has been sent.`,
  };
}
