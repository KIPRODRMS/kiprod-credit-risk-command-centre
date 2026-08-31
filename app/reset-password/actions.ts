"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ResetPasswordState = { message: string } | undefined;
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export async function updatePassword(_state: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "");
  if (!STRONG_PASSWORD.test(password)) return { message: "Use at least 12 characters with uppercase, lowercase, a number and a symbol." };
  if (password !== confirmation) return { message: "The two passwords do not match." };
  const supabase = await createServerSupabaseClient();
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) return { message: "This reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: error.message };
  await supabase.rpc("kiprod_record_auth_event", {
    p_event_type: "PASSWORD_UPDATED",
    p_email: session.user.email || "",
    p_selected_role: "",
    p_note: "User completed secure password recovery.",
  });
  await supabase.auth.signOut();
  redirect("/login?reset=1");
}
