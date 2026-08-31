"use client";

import Link from "next/link";
import { useState } from "react";

const items = [
  ["Dashboard", "/kiprod-admin#dashboard"],
  ["Institutions", "/kiprod-admin#institutions"],
  ["Users", "/kiprod-admin#users"],
  ["Provisioning", "/kiprod-admin#provisioning"],
  ["Security", "/kiprod-admin#security"],
  ["Diagnostics", "/kiprod-admin#diagnostics"],
  ["Platform Audit", "/audit-history"],
];

export default function KiprodAdminNav() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-50 border-b border-violet-400/25 bg-[#071426] text-white shadow-xl">
    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-7">
      <Link href="/kiprod-admin" className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-violet-400/40 bg-violet-400/10 font-black text-violet-300">K</span><span><span className="block text-[10px] font-black uppercase tracking-[.2em] text-violet-300">KIPROD Platform Operations</span><strong className="block text-sm sm:text-base">KIPROD Admin Dashboard</strong></span></Link>
      <nav className="hidden items-center gap-1 xl:flex">{items.map(([label, href]) => <Link key={label} href={href} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">{label}</Link>)}</nav>
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-violet-400/40 px-4 py-2 text-sm font-black xl:hidden">KIPROD menu</button>
    </div>
    {open && <nav className="grid gap-1 border-t border-white/10 p-4 xl:hidden">{items.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl bg-white/5 px-4 py-3 text-sm font-bold">{label}</Link>)}</nav>}
  </header>;
}
