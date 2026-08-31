"use client";

import { useActionState } from "react";
import { updatePassword, type ResetPasswordState } from "./actions";

export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(updatePassword, undefined);
  return <form action={action} className="mt-7 space-y-5">
    <div className="rounded-xl border border-[#d6a84f]/35 bg-[#d6a84f]/10 p-4 text-sm text-slate-700"><strong className="text-slate-950">Password rules</strong><ul className="mt-2 list-disc space-y-1 pl-5"><li>At least 12 characters</li><li>One uppercase and one lowercase letter</li><li>At least one number</li><li>At least one symbol</li></ul></div>
    <label className="block text-sm font-bold text-slate-700">New password<input name="password" type="password" autoComplete="new-password" minLength={12} required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-[#d6a84f] focus:ring-4 focus:ring-[#d6a84f]/15" /></label>
    <label className="block text-sm font-bold text-slate-700">Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-[#d6a84f] focus:ring-4 focus:ring-[#d6a84f]/15" /></label>
    {state?.message ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{state.message}</p> : null}
    <button disabled={pending} className="w-full rounded-xl bg-[#d6a84f] px-5 py-3 font-black text-[#071426] disabled:opacity-60">{pending ? "Updating password..." : "Set new password"}</button>
  </form>;
}
