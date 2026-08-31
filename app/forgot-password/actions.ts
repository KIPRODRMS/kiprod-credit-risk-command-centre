"use server";

import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { ok: boolean; message: string } | undefined;

export async function requestPasswordReset(_state: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, message: "Enter a valid institutional email address." };
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") || `${requestHeaders.get("x-forwarded-proto") || "https"}://${requestHeaders.get("host")}`;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  await supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "PASSWORD_RESET_REQUESTED",
    p_email: email,
    p_selected_role: "",
    p_note: "Password recovery was requested.",
  });
  if (error) return { ok: false, message: "Password recovery is temporarily unavailable. Please try again." };
  return { ok: true, message: "If this email belongs to an active account, a secure reset link has been sent." };
}
