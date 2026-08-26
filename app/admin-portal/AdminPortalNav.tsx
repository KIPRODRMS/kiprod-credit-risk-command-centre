"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultInstitutionProfile, loadMasterInstitutionProfile, type InstitutionProfile } from "@/lib/institutionMaster";

const items = [
  ["Dashboard", "/admin-portal#dashboard"],
  ["Users", "/admin-portal#users"],
  ["Access Matrix", "/admin-portal#access"],
  ["System Controls", "/admin-portal#controls"],
  ["Audit Trail", "/admin-portal#audit"],
];

export default function AdminPortalNav() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<InstitutionProfile>(defaultInstitutionProfile);
  useEffect(() => {
    loadMasterInstitutionProfile().then((result) => setProfile(result.profile));
    localStorage.setItem("kiprodCurrentRole", "Institution Admin");
  }, []);
  return <header className="sticky top-0 z-50 border-b border-violet-400/25 bg-[#071426] text-white shadow-xl">
    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-7">
      <Link href="/admin-portal" className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet-400/40 bg-violet-400/10 font-black text-violet-300">A</span><span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Command Centre - System Administrator Portal</span><strong className="block truncate text-sm sm:text-base">{profile.institutionName || "Institution"}</strong></span></Link>
      <nav className="hidden items-center gap-1 xl:flex">{items.map(([label, href]) => <Link key={label} href={href} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">{label}</Link>)}</nav>
      <div className="hidden items-center gap-3 sm:flex"><span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold">Institution Admin</span><Link href="/" className="rounded-lg border border-violet-400/40 px-3 py-2 text-xs font-black text-violet-300">Exit portal</Link></div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-violet-400/40 px-4 py-2 text-sm font-black xl:hidden">Admin menu</button>
    </div>
    {open && <nav className="grid gap-1 border-t border-white/10 p-4 xl:hidden">{items.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl bg-white/5 px-4 py-3 text-sm font-bold">{label}</Link>)}</nav>}
  </header>;
}
