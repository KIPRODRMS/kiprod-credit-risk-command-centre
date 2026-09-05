"use client";

import { useActionState } from "react";
import {
  addInstitutionUser,
  updateInstitutionDetails,
  type InstitutionWorkspaceState,
} from "./InstitutionWorkspaceActions";

type Institution = {
  id: string;
  name: string;
  slug: string;
  approved_domain: string | null;
  primary_contact_email: string | null;
  status: string;
  updated_at: string;
};

type InstitutionUser = {
  user_id: string;
  full_name: string | null;
  email: string;
  roles: string[];
  status: string;
};

const ROLES = [
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

const field =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100";

export default function InstitutionWorkspace({
  institution,
  users,
}: {
  institution: Institution;
  users: InstitutionUser[];
}) {
  const [detailsState, saveDetails, savingDetails] = useActionState<
    InstitutionWorkspaceState,
    FormData
  >(updateInstitutionDetails, undefined);

  const [userState, createUser, creatingUser] = useActionState<
    InstitutionWorkspaceState,
    FormData
  >(addInstitutionUser, undefined);

  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 hover:bg-slate-50">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <strong className="text-lg text-slate-950">
              {institution.name}
            </strong>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {institution.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {institution.slug} Â· {users.length} enrolled user
            {users.length === 1 ? "" : "s"}
          </p>
        </div>

        <span className="shrink-0 rounded-xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
          Open institution
        </span>
      </summary>

      <div className="border-t border-slate-200 bg-[#f8fafc] p-5 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.16em] text-violet-700">
              Institution details
            </p>
            <h3 className="mt-1 text-xl font-black">
              Edit institution
            </h3>

            <form action={saveDetails} className="mt-5 grid gap-4">
              <input
                type="hidden"
                name="institutionId"
                value={institution.id}
              />

              <label className="text-sm font-bold">
                Institution name
                <input
                  name="name"
                  required
                  defaultValue={institution.name}
                  className={field}
                />
              </label>

              <label className="text-sm font-bold">
                Institution code
                <input
                  name="slug"
                  required
                  defaultValue={institution.slug}
                  className={field}
                />
              </label>

              <label className="text-sm font-bold">
                Approved email domain
                <input
                  name="domain"
                  defaultValue={institution.approved_domain || ""}
                  className={field}
                  placeholder="institution.co.ke"
                />
              </label>

              <label className="text-sm font-bold">
                Primary contact email
                <input
                  name="primaryContactEmail"
                  type="email"
                  defaultValue={
                    institution.primary_contact_email || ""
                  }
                  className={field}
                  placeholder="admin@institution.co.ke"
                />
              </label>

              <button
                disabled={savingDetails}
                className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-60"
              >
                {savingDetails
                  ? "Saving..."
                  : "Save institution details"}
              </button>

              {detailsState?.message && (
                <p
                  className={`rounded-xl p-3 text-sm font-bold ${
                    detailsState.ok
                      ? "bg-emerald-50 text-emerald-900"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {detailsState.message}
                </p>
              )}
            </form>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.16em] text-violet-700">
              Add institution user
            </p>
            <h3 className="mt-1 text-xl font-black">
              Enrol another user
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              The user is attached directly to this institution. No new
              institution or slug is created.
            </p>

            <form action={createUser} className="mt-5 grid gap-4">
              <input
                type="hidden"
                name="institutionId"
                value={institution.id}
              />

              <label className="text-sm font-bold">
                Full name
                <input
                  name="fullName"
                  required
                  className={field}
                  placeholder="Full name"
                />
              </label>

              <label className="text-sm font-bold">
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  className={field}
                  placeholder="name@institution.co.ke"
                />
              </label>

              <label className="text-sm font-bold">
                Role
                <select
                  name="role"
                  defaultValue="Board Member"
                  className={field}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-bold">
                Temporary password
                <input
                  name="temporaryPassword"
                  type="password"
                  minLength={6}
                  required
                  className={field}
                  placeholder="Minimum 6 characters"
                />
              </label>

              <button
                disabled={creatingUser}
                className="rounded-xl bg-violet-700 px-5 py-3 font-black text-white disabled:opacity-60"
              >
                {creatingUser ? "Adding user..." : "Add user"}
              </button>

              {userState?.message && (
                <p
                  className={`rounded-xl p-3 text-sm font-bold ${
                    userState.ok
                      ? "bg-emerald-50 text-emerald-900"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {userState.message}
                </p>
              )}
            </form>
          </section>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-violet-700">
                Enrolled users
              </p>
              <h3 className="mt-1 text-xl font-black">
                Institution access register
              </h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {users.length} user{users.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} className="border-b">
                    <td className="px-3 py-3 font-bold">
                      {user.full_name || "Name not recorded"}
                    </td>
                    <td className="px-3 py-3">{user.email}</td>
                    <td className="px-3 py-3">
                      {user.roles.join(", ") || "No role"}
                    </td>
                    <td className="px-3 py-3 font-bold">
                      {user.status}
                    </td>
                  </tr>
                ))}

                {!users.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      No users are currently enrolled in this institution.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </details>
  );
}

