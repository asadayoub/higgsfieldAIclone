"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { readServerEnv } from "@/config/env";
import { safeReturnPath } from "@/server/auth/return-path";
import { createSupabaseServerClient } from "@/server/supabase/client";

export type AuthFormState = {
  status: "idle" | "sent" | "error";
  message?: string;
};
const emailSchema = z.email();

export async function requestMagicLink(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success)
    return { status: "error", message: "Enter a valid email address." };
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return {
      status: "error",
      message:
        "Account access is not configured yet. Guided mode is still available.",
    };
  const env = readServerEnv();
  const next = safeReturnPath(formData.get("next"), "/assets");
  const callback = new URL("/auth/callback", env.NEXT_PUBLIC_APP_URL);
  callback.searchParams.set("next", next);
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });
  if (error)
    return {
      status: "error",
      message: "We could not send the sign-in link. Please try again.",
    };
  return {
    status: "sent",
    message: "Check your inbox. Your secure sign-in link is on its way.",
  };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
