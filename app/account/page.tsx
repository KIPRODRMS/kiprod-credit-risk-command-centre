import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { cookies } from "next/headers";
import { normaliseRole, ROLE_COOKIE } from "@/lib/accessControl";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string; suspended?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");
  const cookieStore = await cookies();
  const activeRole = normaliseRole(cookieStore.get(ROLE_COOKIE)?.value);
  const query = await searchParams;
  const blockedMessage = query.disabled === "1"
    ? "This account has been disabled. Contact your Institution Administrator or KIPROD support."
    : query.suspended === "1"
      ? "This institution is currently suspended. Contact KIPROD support."
      : "";

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8">
      <style>{`
        #account-access-card,
        #account-access-card h1,
        #account-access-card p,
        #account-access-card span,
        #account-access-card strong,
        #account-access-card a,
        #account-access-card button {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }

        #account-access-card .auth-gold {
          color: #f2c768 !important;
          -webkit-text-fill-color: #f2c768 !important;
        }
      `}</style>
      <section id="account-access-card" className="auth-account-card mx-auto max-w-3xl rounded-[2rem] bg-[#071426] p-7 text-white shadow-xl sm:p-10">
        <p className="auth-gold text-xs font-black uppercase tracking-[.2em]">My account</p>
        <h1 className="mt-3 text-3xl font-black">Command Centre access</h1>
        <p className="mt-3">You are signed in securely.</p>

        {blockedMessage ? (
          <div className="mt-5 rounded-2xl border border-amber-300/70 bg-amber-300/10 p-4 font-bold text-white">
            {blockedMessage}
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-[#d6a84f]/40 bg-white/5 p-5">
          <span className="auth-gold text-xs font-black uppercase">Signed-in email</span>
          <strong className="mt-2 block break-all text-lg">{data.user.email}</strong>
        </div>

        <div className="mt-4 rounded-2xl border border-[#d6a84f]/40 bg-white/5 p-5">
          <span className="auth-gold text-xs font-black uppercase">Active account type</span>
          <strong className="mt-2 block text-lg">{activeRole || "Role selection required"}</strong>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="auth-gold rounded-xl border border-[#d6a84f] bg-[#d6a84f]/10 px-5 py-3 font-black">Continue to Command Centre</Link>
          <Link href="/forgot-password" className="rounded-xl border border-white/60 px-5 py-3 font-black">Reset password</Link>
          <form action={logout}>
            <button type="submit" className="rounded-xl border border-white/60 px-5 py-3 font-black">Sign out securely</button>
          </form>
        </div>
      </section>
    </main>
  );
}
