import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  assignedRolesFromUser,
  isRouteAllowed,
  normaliseRole,
  ROLE_COOKIE,
  ROLE_HOME,
  type PortalRole,
} from "@/lib/accessControl";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isPublicAuthRoute =
    isLoginPage ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/auth/callback");

  if (!data.user && !isPublicAuthRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (data.user && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (data.user) {
    if (pathname === "/forgot-password" || pathname === "/reset-password") {
      return response;
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
    const bootstrapEmail = String(process.env.KIPROD_BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
    const isBootstrapAdmin =
      Boolean(bootstrapEmail) &&
      data.user.email?.toLowerCase() === bootstrapEmail;
    let activeRole = normaliseRole(request.cookies.get(ROLE_COOKIE)?.value);

    if (String(profile?.status || "Active") === "Disabled") {
      if (pathname !== "/account") {
        const blockedUrl = new URL("/account", request.url);
        blockedUrl.searchParams.set("disabled", "1");
        return NextResponse.redirect(blockedUrl);
      }
      return response;
    }

    const profileInstitutionId = String(
      profile?.institution_id || data.user.user_metadata?.institution_id || ""
    ).trim();
    if (profileInstitutionId) {
      const { data: institution } = await supabase
        .from("institutions")
        .select("status")
        .eq("id", profileInstitutionId)
        .maybeSingle();
      if (String(institution?.status || "Active") === "Suspended") {
        if (pathname !== "/account") {
          const blockedUrl = new URL("/account", request.url);
          blockedUrl.searchParams.set("suspended", "1");
          return NextResponse.redirect(blockedUrl);
        }
        return response;
      }
    }

    if (activeRole && !assignedRoles.includes(activeRole) && !(isBootstrapAdmin && activeRole === "Institution Admin")) {
      activeRole = null;
    }

    if (!activeRole) {
      activeRole = assignedRoles[0] || (isBootstrapAdmin ? "Institution Admin" : null);
    }

    if (!activeRole) {
      if (pathname !== "/account") return NextResponse.redirect(new URL("/account", request.url));
      return response;
    }

    response.cookies.set(ROLE_COOKIE, activeRole, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    let allowed = isRouteAllowed(activeRole as PortalRole, pathname);
    if (
      pathname.startsWith("/executive-dashboard") &&
      (activeRole === "Risk Manager" || activeRole === "Credit Manager")
    ) {
      const institutionId = String(profile?.institution_id || data.user.user_metadata?.institution_id || "").trim();
      const { data: settings } = institutionId
        ? await supabase
            .from("institution_access_settings")
            .select("executive_cockpit_roles")
            .eq("institution_id", institutionId)
            .maybeSingle()
        : { data: null };
      allowed = Array.isArray(settings?.executive_cockpit_roles)
        && settings.executive_cockpit_roles.includes(activeRole);
    }

    if (!allowed) {
      await supabase.rpc("kiprod_record_auth_event", {
        p_event_type: "ACCESS_DENIED",
        p_email: data.user.email || "",
        p_selected_role: activeRole,
        p_note: `Blocked route: ${pathname}`,
      });
      return NextResponse.redirect(new URL(ROLE_HOME[activeRole as PortalRole], request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|icon-192.png|icon-512.png|apple-touch-icon.png|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
