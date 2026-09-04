"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Executive Cockpit", href: "/executive-dashboard" },
  { label: "Portfolio Upload", href: "/portfolio-upload" },
  { label: "Early Warning", href: "/early-warning" },
  { label: "Watchlist", href: "/watchlist" },
  { label: "Execution Tracker", href: "/action-tracker" },
  { label: "Board Report", href: "/board-pack" },
];

export default function MainNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="group flex min-w-fit items-center gap-3"
          aria-label="KIPROD Credit Risk Command Centre home"
        >
          <Image
            src="/icon-192.png"
            alt=""
            width={44}
            height={44}
            priority
            className="rounded-xl border border-cyan-300/20 shadow-lg shadow-cyan-950/40 transition group-hover:scale-[1.03]"
          />
          <span className="leading-tight">
            <span className="block text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-300">
              KIPROD
            </span>
            <span className="block text-sm font-black tracking-wide text-white">
              Risk Command Centre
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
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
    </header>
  );
}
