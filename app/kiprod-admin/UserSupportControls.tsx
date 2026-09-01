"use client";

import { useActionState } from "react";
import {
  resendPlatformInvitation,
  sendPlatformPasswordReset,
  updatePlatformUser,
  type UserSupportActionState,
} from "./actions";

type Institution = { id: string; name: string };
type User = {
  user_id: string;
  institution_id: string | null;
  full_name: string | null;
  email: string;
  roles: string[];
  status: string;
};

const INSTITUTION_ROLES = [
  "Institution Admin", "Board Chair", "Board Member", "Board Secretary", "CEO",
  "Risk Manager", "Credit Manager", "Portfolio/Loans Manager", "Recovery Manager",
];
const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100";

function Feedback({ state }: { state: UserSupportActionState }) {
  if (!state?.message) return null;
  return <p role="status" className={`mt-3 rounded-lg p-3 text-xs font-bold ${state.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{state.message}</p>;
}

export default function UserSupportControls({ user, institutions, isCurrentUser }: { user: User; institutions: Institution[]; isCurrentUser: boolean }) {
  const [editState, editAction, editPending] = useActionState<UserSupportActionState, FormData>(updatePlatformUser, undefined);
  const [resetState, resetAction, resetPending] = useActionState<UserSupportActionState, FormData>(sendPlatformPasswordReset, undefined);
  const [inviteState, inviteAction, invitePending] = useActionState<UserSupportActionState, FormData>(resendPlatformInvitation, undefined);
  const isPlatformAdmin = user.roles.includes("KIPROD Admin");

  return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><strong className="text-base">{user.full_name || "Name not recorded"}</strong><p className="text-sm text-slate-600">{user.email}</p></div>
      <div className="flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs font-bold">{user.status}</span><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-900">{user.roles.join(", ") || "No role"}</span></div>
    </div>

    <details className="mt-4 rounded-xl border bg-white p-4">
      <summary className="cursor-pointer font-black text-violet-800">Edit user details</summary>
      <form action={editAction} className="mt-4 grid gap-4 lg:grid-cols-2">
        <input type="hidden" name="userId" value={user.user_id}/>
        <label className="text-xs font-bold">Full name<input name="fullName" defaultValue={user.full_name || ""} required className={inputClass}/></label>
        <label className="text-xs font-bold">Login email<input name="email" type="email" defaultValue={user.email} required readOnly={isCurrentUser} className={`${inputClass} ${isCurrentUser ? "bg-slate-100" : ""}`}/></label>
        {isPlatformAdmin ? <><input type="hidden" name="roles" value="KIPROD Admin"/><input type="hidden" name="status" value="Active"/><p className="rounded-xl bg-violet-50 p-3 text-xs text-violet-900 lg:col-span-2">The current platform administrator remains active and outside institutional tenancy. Change your own login email through My Account.</p></> : <>
          <label className="text-xs font-bold">Assigned institution<select name="institutionId" defaultValue={user.institution_id || ""} required className={inputClass}><option value="">Choose institution</option>{institutions.map((institution)=><option key={institution.id} value={institution.id}>{institution.name}</option>)}</select></label>
          <label className="text-xs font-bold">Account status<select name="status" defaultValue={user.status} className={inputClass}><option>Invited</option><option>Active</option><option>Disabled</option></select></label>
          <fieldset className="rounded-xl border p-3 lg:col-span-2"><legend className="px-2 text-xs font-black">Approved roles</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{INSTITUTION_ROLES.map((role)=><label key={role} className="text-xs font-bold"><input type="checkbox" name="roles" value={role} defaultChecked={user.roles.includes(role)} className="mr-2"/>{role}</label>)}</div></fieldset>
          <label className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-950 lg:col-span-2"><input type="checkbox" name="confirmTransfer" className="mt-0.5"/>I confirm any change of institution is intentional and understand that it changes this user&apos;s tenant access.</label>
        </>}
        <button disabled={editPending} className="rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60 lg:col-span-2">{editPending ? "Saving..." : "Save user details"}</button>
      </form>
      <Feedback state={editState}/>
    </details>

    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <form action={resetAction} className="rounded-xl border bg-white p-3"><input type="hidden" name="userId" value={user.user_id}/><button disabled={resetPending || user.status === "Disabled"} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-black disabled:opacity-40">{resetPending ? "Sending..." : "Send password reset"}</button><Feedback state={resetState}/></form>
      <form action={inviteAction} className="rounded-xl border bg-white p-3"><input type="hidden" name="userId" value={user.user_id}/><button disabled={invitePending || user.status !== "Invited"} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-black disabled:opacity-40">{invitePending ? "Sending..." : "Resend activation"}</button><Feedback state={inviteState}/></form>
    </div>
  </article>;
}
