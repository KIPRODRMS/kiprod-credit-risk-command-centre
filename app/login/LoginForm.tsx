"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { PORTAL_ROLES } from "@/lib/accessControl";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );

  return (
    <form action={action} className="mt-8 space-y-5">
      <label className="block text-sm font-bold text-slate-700">
        Account type
        <select
          name="accountType"
          required
          defaultValue=""
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#d6a84f] focus:ring-4 focus:ring-[#d6a84f]/15"
        >
          <option value="" disabled>Choose your approved portal</option>
          {PORTAL_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#d6a84f] focus:ring-4 focus:ring-[#d6a84f]/15"
          placeholder="name@institution.org"
        />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        <span className="flex items-center justify-between gap-3">
          <span>Password</span>
          <Link href="/forgot-password" className="text-xs font-black text-[#8a5b12] underline">Forgot password?</Link>
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-[#d6a84f] focus:ring-4 focus:ring-[#d6a84f]/15"
          placeholder="Enter your password"
        />
      </label>

      {state?.message && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#d6a84f] px-5 py-3 font-black text-[#071426] transition hover:bg-[#e1b85f] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in securely"}
      </button>
    </form>
  );
}
