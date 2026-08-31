import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/forgot-password");
  return <main className="min-h-screen bg-[#071426] px-4 py-12 text-slate-950 sm:px-8"><section className="mx-auto max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl sm:p-10"><p className="text-xs font-black uppercase tracking-[.2em] text-[#8a5b12]">Protected account recovery</p><h1 className="mt-3 text-3xl font-black">Create a new password</h1><p className="mt-3 text-sm leading-6 text-slate-600">Choose a strong password that you do not use on another service.</p><ResetPasswordForm /></section></main>;
}
