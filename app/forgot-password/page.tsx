import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return <main className="min-h-screen bg-[#071426] px-4 py-12 text-slate-950 sm:px-8"><section className="mx-auto max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl sm:p-10"><p className="text-xs font-black uppercase tracking-[.2em] text-[#8a5b12]">Secure account recovery</p><h1 className="mt-3 text-3xl font-black">Reset your password</h1><p className="mt-3 text-sm leading-6 text-slate-600">Enter the email used for your Command Centre account. We will send a time-limited recovery link.</p><ForgotPasswordForm /><Link href="/login" className="mt-6 inline-block text-sm font-bold text-slate-600 underline">Return to sign in</Link></section></main>;
}
