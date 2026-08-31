import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assignedRolesFromUser,
  normaliseRole,
  ROLE_COOKIE,
  type PortalRole,
} from "@/lib/accessControl";

export type ServerAccessContext = {
  userId: string | null;
  email: string | null;
  institutionId: string | null;
  assignedRoles: PortalRole[];
  activeRole: PortalRole | null;
  status: string;
  executiveCockpitAllowed: boolean;
};

export async function getServerAccessContext(): Promise<ServerAccessContext> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const cookieRole = normaliseRole(cookieStore.get(ROLE_COOKIE)?.value);

  if (!data.user) {
    return {
      userId: null,
      email: null,
      institutionId: null,
      assignedRoles: [],
      activeRole: null,
      status: "Signed out",
      executiveCockpitAllowed: false,
    };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("institution_id,roles,status")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const profileRoles = Array.isArray(profile?.roles)
    ? profile.roles.map(normaliseRole).filter((role): role is PortalRole => Boolean(role))
    : [];
  const assignedRoles = profileRoles.length ? profileRoles : assignedRolesFromUser(data.user);
  const activeRole = cookieRole && assignedRoles.includes(cookieRole)
    ? cookieRole
    : assignedRoles[0] || null;
  const institutionId = String(
    profile?.institution_id ||
    data.user.user_metadata?.institution_id ||
    process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID ||
    ""
  ).trim() || null;

  let executiveCockpitAllowed = activeRole === "CEO";
  if (institutionId && (activeRole === "Risk Manager" || activeRole === "Credit Manager")) {
    const { data: settings } = await supabase
      .from("institution_access_settings")
      .select("executive_cockpit_roles")
      .eq("institution_id", institutionId)
      .maybeSingle();
    executiveCockpitAllowed = Array.isArray(settings?.executive_cockpit_roles)
      && settings.executive_cockpit_roles.includes(activeRole);
  }

  return {
    userId: data.user.id,
    email: data.user.email || null,
    institutionId,
    assignedRoles,
    activeRole,
    status: String(profile?.status || "Active"),
    executiveCockpitAllowed,
  };
}
