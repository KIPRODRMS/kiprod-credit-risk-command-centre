"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Institution Profile", href: "/institution-profile" },
  { label: "Executive Cockpit", href: "/executive-dashboard" },
  { label: "Portfolio Upload", href: "/portfolio-upload" },
  { label: "Early Warning", href: "/early-warning" },
  { label: "Watchlist", href: "/watchlist" },
  { label: "Execution Tracker", href: "/action-tracker" },
  { label: "Board Report", href: "/board-pack" },
  { label: "Board Oversight", href: "/board-oversight" },
  { label: "Clarification Requests", href: "/clarification-requests" },
  { label: "Audit History", href: "/audit-history" },
  { label: "Role Access", href: "/role-access" },
];

export default function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

  return (
    <header className="command-header sticky top-0 z-50 border-b border-[#c89b3c]/20 bg-[#071426] text-white shadow-lg shadow-slate-950/15">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2 md:min-h-20">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
            aria-label="KIPROD Credit Risk Command Centre home"
          >
            <Image
              src="/icon-192.png"
              alt=""
              width={44}
              height={44}
              priority
              className="h-10 w-10 shrink-0 rounded-xl border border-[#d6a84f]/35 shadow-lg shadow-black/30 transition group-hover:scale-[1.03] sm:h-11 sm:w-11"
            />
            <span className="min-w-0 leading-tight">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#e1b85f] sm:text-xs">
                KIPROD
              </span>
              <span className="block truncate text-xs font-black tracking-wide text-white sm:text-sm">
                Executive Risk Intelligence
              </span>
            </span>
          </Link>

          <button
            type="button"
            className="menu-trigger inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d6a84f]/30 bg-white/5 text-white transition hover:border-[#d6a84f]/60 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#d6a84f] 2xl:hidden"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span className="relative block h-5 w-6" aria-hidden="true">
              <span className={`absolute left-0 top-0.5 h-0.5 w-6 rounded bg-current transition ${open ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`absolute left-0 top-2.5 h-0.5 w-6 rounded bg-current transition ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 top-[18px] h-0.5 w-6 rounded bg-current transition ${open ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>

          <nav className="hidden max-w-[1120px] flex-wrap justify-end gap-1.5 2xl:flex" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition xl:text-sm ${
                    active
                      ? "bg-[#d6a84f] text-[#071426] shadow-sm shadow-black/20"
                      : "bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

      </div>

      <button
        type="button"
        aria-label="Close navigation menu"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
        className={`nav-backdrop fixed inset-0 z-[60] bg-[#030a14]/65 backdrop-blur-md transition-all 2xl:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />

      <aside
        id="mobile-navigation"
        aria-label="Command Centre navigation"
        aria-hidden={!open}
        className={`nav-drawer fixed inset-y-0 right-0 z-[70] flex w-[min(88vw,420px)] flex-col border-l border-[#d6a84f]/25 bg-[#071426] shadow-2xl shadow-black/50 transition-transform 2xl:hidden ${
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

        <nav className="grid flex-1 grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-1" aria-label="Menu links">
          {navItems.map((item, index) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                tabIndex={open ? 0 : -1}
                aria-current={active ? "page" : undefined}
                style={{ "--nav-order": index } as React.CSSProperties}
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
        </nav>

        <p className="border-t border-slate-800 px-5 py-4 text-xs leading-5 text-slate-400">
          Institutional risk visibility, accountability and Board oversight.
        </p>
      </aside>
    </header>
  );
}
