export const PORTAL_ROLES = [
  "KIPROD Admin",
  "Institution Admin",
  "Board Chair",
  "Board Member",
  "Board Secretary",
  "CEO",
  "Risk Manager",
  "Credit Manager",
  "Portfolio/Loans Manager",
  "Recovery Manager",
] as const;

export type PortalRole = (typeof PORTAL_ROLES)[number];

export const ROLE_COOKIE = "kiprod_active_role";

export const ROLE_HOME: Record<PortalRole, string> = {
  "KIPROD Admin": "/kiprod-admin",
  "Institution Admin": "/admin-portal",
  "Board Chair": "/board-portal",
  "Board Member": "/board-portal",
  "Board Secretary": "/board-portal",
  CEO: "/ceo-portal",
  "Risk Manager": "/risk-manager-portal",
  "Credit Manager": "/credit-manager-portal",
  "Portfolio/Loans Manager": "/portfolio-manager-portal",
  "Recovery Manager": "/recovery-manager-portal",
};

const ROLE_ROUTES: Record<PortalRole, string[]> = {
  "KIPROD Admin": ["/kiprod-admin", "/audit-history"],
  "Institution Admin": ["/admin-portal", "/institution-profile", "/portfolio-upload", "/role-access", "/audit-history"],
  "Board Chair": ["/board-portal", "/board-pack", "/board-oversight", "/clarification-requests", "/audit-history"],
  "Board Member": ["/board-portal", "/board-pack", "/board-oversight", "/clarification-requests", "/audit-history"],
  "Board Secretary": ["/board-portal", "/board-pack", "/board-oversight", "/clarification-requests", "/audit-history"],
  CEO: ["/ceo-portal", "/executive-dashboard", "/board-pack", "/board-oversight", "/action-tracker", "/clarification-requests", "/audit-history"],
  "Risk Manager": ["/risk-manager-portal", "/dashboard", "/early-warning", "/watchlist", "/action-tracker", "/clarification-requests", "/audit-history"],
  "Credit Manager": ["/credit-manager-portal", "/dashboard", "/early-warning", "/watchlist", "/action-tracker", "/clarification-requests", "/audit-history"],
  "Portfolio/Loans Manager": ["/portfolio-manager-portal", "/portfolio-upload", "/dashboard", "/early-warning", "/watchlist", "/action-tracker", "/clarification-requests", "/audit-history"],
  "Recovery Manager": ["/recovery-manager-portal", "/watchlist", "/action-tracker", "/clarification-requests", "/audit-history"],
};

const ROLE_LABELS: Record<PortalRole, Array<{ label: string; href: string }>> = {
  "KIPROD Admin": [
    { label: "KIPROD Admin Dashboard", href: "/kiprod-admin" },
    { label: "Platform Audit", href: "/audit-history" },
  ],
  "Institution Admin": [
    { label: "Administration", href: "/admin-portal" },
    { label: "Institution Profile", href: "/institution-profile" },
    { label: "Portfolio Upload", href: "/portfolio-upload" },
    { label: "Audit History", href: "/audit-history" },
  ],
  "Board Chair": [
    { label: "Board Portal", href: "/board-portal" },
    { label: "Board Report", href: "/board-pack" },
    { label: "Board Oversight", href: "/board-oversight" },
    { label: "Board Audit", href: "/audit-history" },
  ],
  "Board Member": [
    { label: "Board Portal", href: "/board-portal" },
    { label: "Board Report", href: "/board-pack" },
    { label: "Board Oversight", href: "/board-oversight" },
    { label: "Board Audit", href: "/audit-history" },
  ],
  "Board Secretary": [
    { label: "Board Portal", href: "/board-portal" },
    { label: "Board Report", href: "/board-pack" },
    { label: "Clarifications", href: "/clarification-requests" },
    { label: "Audit History", href: "/audit-history" },
  ],
  CEO: [
    { label: "CEO Portal", href: "/ceo-portal" },
    { label: "Executive Cockpit", href: "/executive-dashboard" },
    { label: "Board Report", href: "/board-pack" },
    { label: "Executive Audit", href: "/audit-history" },
  ],
  "Risk Manager": [
    { label: "Risk Manager Portal", href: "/risk-manager-portal" },
    { label: "Portfolio Health", href: "/dashboard" },
    { label: "Early Warning", href: "/early-warning" },
    { label: "Watchlist", href: "/watchlist" },
    { label: "Execution Tracker", href: "/action-tracker" },
    { label: "Risk Audit", href: "/audit-history" },
  ],
  "Credit Manager": [
    { label: "Credit Manager Portal", href: "/credit-manager-portal" },
    { label: "Early Warning", href: "/early-warning" },
    { label: "Watchlist", href: "/watchlist" },
    { label: "Execution Tracker", href: "/action-tracker" },
    { label: "Credit Audit", href: "/audit-history" },
  ],
  "Portfolio/Loans Manager": [
    { label: "Portfolio/Loans Portal", href: "/portfolio-manager-portal" },
    { label: "Portfolio Upload", href: "/portfolio-upload" },
    { label: "Portfolio Health", href: "/dashboard" },
    { label: "Execution Tracker", href: "/action-tracker" },
    { label: "Portfolio Audit", href: "/audit-history" },
  ],
  "Recovery Manager": [
    { label: "Recovery Manager Portal", href: "/recovery-manager-portal" },
    { label: "Watchlist", href: "/watchlist" },
    { label: "Execution Tracker", href: "/action-tracker" },
    { label: "Recovery Audit", href: "/audit-history" },
  ],
};

export function normaliseRole(value: unknown): PortalRole | null {
  const candidate = String(value || "").trim().toLowerCase();
  return PORTAL_ROLES.find((role) => role.toLowerCase() === candidate) || null;
}

export function assignedRolesFromUser(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null | undefined) {
  if (!user) return [] as PortalRole[];
  const values = [
    user.app_metadata?.kiprod_roles,
    user.user_metadata?.kiprod_roles,
    user.app_metadata?.role,
    user.user_metadata?.role,
  ].flatMap((value) => Array.isArray(value) ? value : value ? [value] : []);
  return [...new Set(values.map(normaliseRole).filter((role): role is PortalRole => Boolean(role)))];
}

export function isRouteAllowed(role: PortalRole, pathname: string) {
  if (pathname === "/" || pathname === "/account" || pathname === "/login") return true;
  return ROLE_ROUTES[role].some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function roleNavigation(role: PortalRole | null, executiveCockpitAllowed = role === "CEO") {
  if (!role) return [];
  const items = [{ label: "Command Centre Home", href: "/" }, ...ROLE_LABELS[role]];
  if (executiveCockpitAllowed && !items.some((item) => item.href === "/executive-dashboard")) {
    items.splice(1, 0, { label: "Executive Cockpit", href: "/executive-dashboard" });
  }
  return [{ label: `${role} workspace`, items }];
}
