"use client";

import { useActionState } from "react";
import {
  provisionInstitutionUser,
  type ProvisionInstitutionUserState,
} from "./actions";

type InstitutionOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

const roles = [
  "Institution Admin",
  "Board Chair",
  "Board Member",
  "Board Secretary",
  "CEO",
  "Risk Manager",
  "Credit Manager",
  "Portfolio/Loans Manager",
  "Recovery Manager",
];

export default function ProvisionUserForm({
  institutions,
}: {
  institutions: InstitutionOption[];
}) {
  const [state, action, pending] = useActionState<
    ProvisionInstitutionUserState,
    FormData
  >(provisionInstitutionUser, undefined);

  const field =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100";

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-2">
      <label className="text-sm font-bold">
        Existing institution
        <select
          name="institutionId"
          required
          defaultValue=""
          className={field}
        >
          <option value="" disabled>
            Select institution
          </option>
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name} ({institution.slug})
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-bold">
        Portal role
        <select
          name="role"
          required
          defaultValue="Board Member"
          className={field}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-bold">
        Full name
        <input
          name="fullName"
          required
          className={field}
          placeholder="Board member or manager name"
        />
      </label>

      <label className="text-sm font-bold">
        Email address
        <input
          name="email"
          type="email"
          required
          className={field}
          placeholder="name@example.com"
        />
      </label>

      <label className="text-sm font-bold lg:col-span-2">
        Temporary password
        <input
          name="temporaryPassword"
          type="password"
          minLength={12}
          required
          className={field}
          placeholder="12+ chars, upper/lower, number, symbol"
        />
      </label>

      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950 lg:col-span-2">
        <strong>No institution is recreated here.</strong>
        <p className="mt-1">
          The new user is attached to the selected institution's existing
          institution ID. The institution slug is never created or changed.
        </p>
      </div>

      <button
        disabled={pending || !institutions.length}
        className="rounded-xl bg-violet-700 px-5 py-3 font-black text-white disabled:opacity-60 lg:col-span-2"
      >
        {pending
          ? "Creating portal account..."
          : "Add user to existing institution"}
      </button>

      {state?.message && (
        <p
          className={`rounded-xl p-4 text-sm font-bold lg:col-span-2 ${
            state.ok
              ? "bg-emerald-50 text-emerald-900"
              : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
