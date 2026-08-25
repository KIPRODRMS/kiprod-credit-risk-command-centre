"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  defaultInstitutionProfile,
  loadMasterInstitutionProfile,
  type InstitutionProfile,
} from "@/lib/institutionMaster";

const items = [
  ["Dashboard", "/risk-manager-portal#dashboard"],
  ["Portfolio Risk", "/risk-manager-portal#portfolio"],
  ["Early Warning", "/risk-manager-portal/accounts?filter=early-warning"],
  ["Watchlist", "/risk-manager-portal/accounts?filter=watchlist"],
  ["Risk Actions", "/risk-manager-portal/actions?filter=open"],
  ["Board Requests", "/risk-manager-portal#board-requests"],
  ["Audit Trail", "/risk-manager-portal#audit"],
];

export default function RiskManagerPortalNav() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<InstitutionProfile>(defaultInstitutionProfile);

  useEffect(() => {
    loadMasterInstitutionProfile().then((result) => setProfile(result.profile));
    localStorage.setItem("kiprodCurrentRole", "Risk Manager");
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-400/25 bg-[#071426] text-white shadow-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-7">
        <Link href="/risk-manager-portal" className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 font-black text-cyan-300">R</span>
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Command Centre · Risk Manager Portal</span>
            <strong className="block truncate text-sm sm:text-base">{profile.institutionName || "Institution"}</strong>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 xl:flex">
          {items.map(([label, href]) => (
            <Link key={label} href={href} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">{label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold">Risk Manager</span>
          <Link href="/" className="rounded-lg border border-cyan-400/40 px-3 py-2 text-xs font-black text-cyan-300">Exit portal</Link>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm font-black xl:hidden">Risk menu</button>
      </div>
      {open && (
        <nav className="grid gap-1 border-t border-white/10 p-4 xl:hidden">
          {items.map(([label, href]) => (
            <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl bg-white/5 px-4 py-3 text-sm font-bold">{label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
