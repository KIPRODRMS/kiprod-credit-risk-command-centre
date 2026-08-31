import Link from "next/link";
import { cookies } from "next/headers";
import { logout } from "@/app/login/actions";
import { normaliseRole, ROLE_COOKIE } from "@/lib/accessControl";

export default async function PortalSessionBar() {
  const cookieStore = await cookies();
  const activeRole = normaliseRole(cookieStore.get(ROLE_COOKIE)?.value);

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-end gap-2 px-4 py-2 sm:px-7">
        <span className="mr-auto text-xs font-black text-slate-600">Signed in as {activeRole || "Unassigned user"}</span>
        <Link href="/" className="rounded-lg border px-3 py-2 text-xs font-black text-slate-700">Command Centre home</Link>
        <Link href="/account" className="rounded-lg border px-3 py-2 text-xs font-black text-slate-700">My account</Link>
        <form action={logout}>
          <button type="submit" className="rounded-lg bg-[#071426] px-3 py-2 text-xs font-black text-white">Sign out</button>
        </form>
      </div>
    </div>
  );
}
