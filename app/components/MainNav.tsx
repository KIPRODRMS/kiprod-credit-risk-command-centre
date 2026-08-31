"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import { isRouteAllowed, roleNavigation, ROLE_HOME, type PortalRole } from "@/lib/accessControl";
import {
  defaultInstitutionProfile,
  INSTITUTION_PROFILE_UPDATED_EVENT,
  loadMasterInstitutionProfile,
  type InstitutionProfile,
  type MasterProfileSource,
} from "@/lib/institutionMaster";

export default function MainNav({ activeRole, executiveCockpitAllowed }: { activeRole: PortalRole | null; executiveCockpitAllowed: boolean }) {
  const pathname = usePathname();
  const navSections = roleNavigation(activeRole, executiveCockpitAllowed);
  const navItems = navSections.flatMap((section) => section.items);
  const isDedicatedPortal =
    pathname.startsWith("/board-portal") ||
    pathname.startsWith("/ceo-portal") ||
    pathname.startsWith("/risk-manager-portal") ||
    pathname.startsWith("/credit-manager-portal") ||
    pathname.startsWith("/recovery-manager-portal") ||
    pathname.startsWith("/portfolio-manager-portal") ||
    pathname.startsWith("/admin-portal") ||
    pathname.startsWith("/kiprod-admin") ||
    pathname === "/login" ||
    pathname === "/account" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/callback");
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<InstitutionProfile>(defaultInstitutionProfile);
  const [profileSource, setProfileSource] = useState<MasterProfileSource | "loading">("loading");

  useEffect(() => {
    let active = true;
    const refreshProfile = () => {
      loadMasterInstitutionProfile().then((result) => {
        if (active) {
          setProfile(result.profile);
          setProfileSource(result.source);
        }
      });
    };
    const receiveProfile = (event: Event) => {
      const next = (event as CustomEvent<InstitutionProfile>).detail;
      if (next) setProfile(next);
      else refreshProfile();
    };
    refreshProfile();
    window.addEventListener(INSTITUTION_PROFILE_UPDATED_EVENT, receiveProfile);
    return () => {
      active = false;
      window.removeEventListener(INSTITUTION_PROFILE_UPDATED_EVENT, receiveProfile);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (isDedicatedPortal) return null;

  const institutionName = profile.institutionName || "Institution Profile pending";
  const institutionInitial = profile.institutionName.trim().charAt(0).toUpperCase() || "K";
  const activePage = navItems.find((item) => item.href === pathname)?.label || "Command Centre";
  const profileStatus =
    profileSource === "supabase"
      ? "Master record synced"
      : profileSource === "loading"
        ? "Checking master record"
        : profileSource === "local"
          ? "Local record active"
          : "Profile setup required";

  return (
    <header className="command-header sticky top-0 z-50 text-white">
      <div className="command-header-grid" aria-hidden="true" />
      <div className="command-header-glow" aria-hidden="true" />

      <div className="command-header-shell">
        <div className="command-header-row">
          <Link
            href="/"
            className="command-brand group"
            aria-label="KIPROD Credit Risk Command Centre home"
          >
            <span className="command-brand-mark">
              <Image
                src="/icon-192.png"
                alt=""
                width={48}
                height={48}
                priority
              />
              <i aria-hidden="true" />
            </span>
            <span className="command-brand-copy">
              <span className="command-brand-kicker">KIPROD</span>
              <span className="command-brand-title">
                Risk Command Centre
              </span>
              <span className="command-brand-subtitle">Executive intelligence system</span>
            </span>
          </Link>

          <Link
            href={activeRole && isRouteAllowed(activeRole, "/institution-profile") ? "/institution-profile" : activeRole ? ROLE_HOME[activeRole] : "/"}
            className="command-institution-panel group"
            aria-label={`Open master Institution Profile for ${institutionName}`}
          >
            <span className="command-institution-emblem" aria-hidden="true">
              <b>{institutionInitial}</b>
              <i />
            </span>

            <span className="command-institution-copy">
              <span className="command-context-kicker">
                <i aria-hidden="true" /> Active institutional command
              </span>
              <strong>{institutionName}</strong>
              <span className="command-context-meta">
                <span>
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M4 3.5h12v13H4zM7 2v3M13 2v3M4 7h12" />
                  </svg>
                  {profile.reportingMonth || "Reporting period pending"}
                </span>
                <span className="command-context-type">{profile.institutionType || "Institution"}</span>
                <span className="command-context-currency">{profile.reportingCurrency || "KES"}</span>
              </span>
            </span>

            <span className={`command-profile-state is-${profileSource}`}>
              <i aria-hidden="true" />
              <span>{profileStatus}</span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m7 4 6 6-6 6" />
              </svg>
            </span>
          </Link>

          <div className="command-current-view" aria-label={`Current view: ${activePage}`}>
            <span>Current view</span>
            <strong>{activePage}</strong>
          </div>

          <button
            type="button"
            className="menu-trigger command-menu-trigger"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span className="command-menu-copy" aria-hidden="true">
              <small>Navigate</small>
              <b>{open ? "Close" : "Menu"}</b>
            </span>
            <span className="command-menu-icon" aria-hidden="true">
              <span className={open ? "is-open" : ""} />
              <span className={open ? "is-open" : ""} />
              <span className={open ? "is-open" : ""} />
            </span>
          </button>
        </div>
      </div>

      <button
        type="button"
        aria-label="Close navigation menu"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
        className={`nav-backdrop fixed inset-0 z-[60] bg-[#030a14]/65 backdrop-blur-md transition-all ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />

      <aside
        id="mobile-navigation"
        aria-label="Command Centre navigation"
        aria-hidden={!open}
        className={`nav-drawer fixed inset-y-0 right-0 z-[70] flex w-[min(90vw,440px)] flex-col border-l border-[#d6a84f]/25 bg-[#071426] shadow-2xl shadow-black/50 transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e1b85f]">KIPROD</p>
            <p className="mt-1 text-base font-black text-white">Risk Intelligence Menu</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6a84f]/30 bg-white/5 text-2xl font-light text-white transition hover:border-[#d6a84f] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#d6a84f]"
            aria-label="Close navigation menu"
          >
            ×
          </button>
        </div>

        <div className="command-drawer-context">
          <div className="command-drawer-emblem">{institutionInitial}</div>
          <div>
            <span>Active institution</span>
            <p>{institutionName}</p>
            <small>
              {profile.reportingMonth || "Reporting month pending"} · {profile.reportingCurrency || "KES"}
            </small>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-4" aria-label="Menu links">
          {navSections.map((section, sectionIndex) => (
            <section key={section.label} aria-label={section.label}>
              <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#e1b85f]">
                {section.label}
              </p>
              <div className="grid gap-2">
                {section.items.map((item, itemIndex) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      tabIndex={open ? 0 : -1}
                      aria-current={active ? "page" : undefined}
                      style={{ "--nav-order": sectionIndex * 10 + itemIndex } as React.CSSProperties}
                      className={`nav-drawer-link rounded-xl border px-4 py-3 text-sm font-bold transition ${
                        active
                          ? "border-[#e1b85f] bg-[#d6a84f] text-[#071426] shadow-md shadow-black/20"
                          : "border-white/10 bg-white/5 text-slate-100 hover:border-[#d6a84f]/45 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-[.15em] text-[#e1b85f]">{activeRole || "Account"}</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/account" onClick={() => setOpen(false)} className="rounded-xl border border-white/15 px-4 py-3 text-center text-xs font-black text-white">My account</Link>
            <form action={logout}>
              <button type="submit" className="w-full rounded-xl border border-[#d6a84f]/50 px-4 py-3 text-xs font-black text-[#f3d58f]">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
    </header>
  );
}
