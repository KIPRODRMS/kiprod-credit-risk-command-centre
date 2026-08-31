"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ForgotPasswordState, FormData>(requestPasswordReset, undefined);
  return <form action={action} className="mt-7 space-y-5">
    <label className="block text-sm font-bold text-slate-700">Institutional email
      <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-[#d6a84f] focus:ring-4 focus:ring-[#d6a84f]/15" placeholder="name@institution.org" />
    </label>
    {state?.message ? <p role="status" className={`rounded-xl border p-3 text-sm font-bold ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{state.message}</p> : null}
    <button disabled={pending} className="w-full rounded-xl bg-[#d6a84f] px-5 py-3 font-black text-[#071426] disabled:opacity-60">{pending ? "Sending secure link..." : "Send password reset link"}</button>
  </form>;
}
