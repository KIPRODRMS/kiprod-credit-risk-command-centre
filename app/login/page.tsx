import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ loggedOut?: string; reset?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect("/");

  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#071426] px-4 py-12 text-slate-950 sm:px-8">
      <style>{`
        #login-access-panel,
        #login-access-panel h1,
        #login-access-panel p {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }

        #login-access-panel .auth-gold {
          color: #f2c768 !important;
          -webkit-text-fill-color: #f2c768 !important;
        }
      `}</style>
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl lg:grid-cols-[1.05fr_.95fr]">
        <section id="login-access-panel" className="auth-dark-panel hidden bg-[#0b1c30] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="auth-gold text-xs font-black uppercase tracking-[.22em]">KIPROD Executive Risk Intelligence</p>
            <h1 className="mt-6 text-5xl font-black leading-tight">Secure institutional access.</h1>
            <p className="mt-5 max-w-md leading-7">Sign in using the account issued for your institution.</p>
          </div>
          <p className="text-sm">One platform for risk visibility, management accountability and Board oversight.</p>
        </section>

        <section className="flex items-center p-7 sm:p-12">
          <div className="w-full">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#9b712d]">Command Centre Login</p>
            <h2 className="mt-3 text-3xl font-black">Welcome back</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Use your approved institutional credentials. Never share your password.</p>

            {params.loggedOut === "1" && (
              <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">You have been signed out securely.</p>
            )}

            {params.reset === "1" && (
              <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Your password was updated. Sign in with the new password.</p>
            )}

            <LoginForm />

            <Link href="/" className="mt-6 inline-block text-sm font-bold text-slate-600 underline">Return to Command Centre home</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
