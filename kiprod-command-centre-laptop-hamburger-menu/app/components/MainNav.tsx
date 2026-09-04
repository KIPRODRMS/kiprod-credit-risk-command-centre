"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950 text-white shadow-lg shadow-slate-950/10">
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
              className="h-10 w-10 shrink-0 rounded-xl border border-cyan-300/20 shadow-lg shadow-cyan-950/40 transition group-hover:scale-[1.03] sm:h-11 sm:w-11"
            />
            <span className="min-w-0 leading-tight">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-300 sm:text-xs">
                KIPROD
              </span>
              <span className="block truncate text-xs font-black tracking-wide text-white sm:text-sm">
                Risk Command Centre
              </span>
            </span>
          </Link>

          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-300 2xl:hidden"
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
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className={`${open ? "grid" : "hidden"} max-h-[calc(100dvh-5rem)] grid-cols-1 gap-1 overflow-y-auto border-t border-slate-800 py-3 sm:grid-cols-2 lg:grid-cols-3 2xl:hidden`}
        >
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  active
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-100 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
