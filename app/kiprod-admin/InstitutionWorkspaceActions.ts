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

export type InstitutionWorkspaceState =
  | { ok: boolean; message: string }
  | undefined;

const STRONG_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{12,}$/;

const MIN_PASSWORD_LENGTH = 6;

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

export async function updateInstitutionDetails(
  _state: InstitutionWorkspaceState,
  formData: FormData,
): Promise<InstitutionWorkspaceState> {
  const access = await requireKiprodAdmin();

  if (!access.allowed || !access.user) {
    return { ok: false, message: "KIPROD Admin access is required." };
  }

  const institutionId = String(formData.get("institutionId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const domain = String(formData.get("domain") || "")
    .trim()
    .toLowerCase();
  const primaryContactEmail = String(
    formData.get("primaryContactEmail") || "",
  )
    .trim()
    .toLowerCase();

  if (!institutionId || !name || !slug) {
    return {
      ok: false,
      message: "Institution name and institution code are required.",
    };
  }

  if (primaryContactEmail && !primaryContactEmail.includes("@")) {
    return {
      ok: false,
      message: "Enter a valid primary contact email.",
    };
  }

  const { error } = await access.supabase
    .from("institutions")
    .update({
      name,
      slug,
      approved_domain: domain || null,
      primary_contact_email: primaryContactEmail || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", institutionId);

  if (error) {
    const duplicate =
      error.message.includes("institutions_slug_key") ||
      error.message.toLowerCase().includes("duplicate key");

    return {
      ok: false,
      message: duplicate
        ? "That institution code is already being used by another institution."
        : error.message,
    };
  }

  await access.supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "INSTITUTION_DETAILS_UPDATED",
    p_email: access.user.email || "",
    p_selected_role: "KIPROD Admin",
    p_note: `Institution ${institutionId} details were updated.`,
  });

  revalidatePath("/kiprod-admin");

  return {
    ok: true,
    message: "Institution details saved.",
  };
}

export async function addInstitutionUser(
  _state: InstitutionWorkspaceState,
  formData: FormData,
): Promise<InstitutionWorkspaceState> {
  const access = await requireKiprodAdmin();

  if (!access.allowed || !access.user) {
    return { ok: false, message: "KIPROD Admin access is required." };
  }

  const institutionId = String(formData.get("institutionId") || "").trim();
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
        "Enter the user's name, valid email and approved institution role.",
    };
  }

  if (temporaryPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message:
        "Temporary password must be at least 6 characters.",
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
        "The institution could not be found.",
    };
  }

  if (institution.status === "Suspended") {
    return {
      ok: false,
      message:
        "Reactivate this institution before adding users.",
    };
  }

  const { data: existingProfile } = await access.supabase
    .from("user_profiles")
    .select("user_id,email")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (existingProfile) {
    return {
      ok: false,
      message:
        "That email already has a Command Centre account.",
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
        "An authentication account already exists for that email.",
    };
  }

  await access.supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "INSTITUTION_USER_CREATED",
    p_email: email,
    p_selected_role: role,
    p_note: `${fullName} was enrolled in ${institution.name} as ${role}.`,
  });

  revalidatePath("/kiprod-admin");

  return {
    ok: true,
    message: data.session
      ? `${fullName} is active as ${role}.`
      : `${fullName} was added as ${role}. A confirmation email has been sent.`,
  };
}


