"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { readServerEnv } from "@/config/env";
import {
  accountEmailSchema,
  firstValidationMessage,
  passwordUpdateSchema,
  signInCredentialsSchema,
  signUpCredentialsSchema,
} from "@/server/auth/credentials";
import { ensureProfile } from "@/server/auth/bootstrap";
import { safeReturnPath } from "@/server/auth/return-path";
import { createSupabaseServerClient } from "@/server/supabase/client";

export type AuthFormState = {
  status: "idle" | "success" | "sent" | "error";
  message?: string;
};

function unavailableState(): AuthFormState {
  return {
    status: "error",
    message:
      "Account access is not configured yet. Public inspiration remains available.",
  };
}

function authCallback(path: string) {
  const env = readServerEnv();
  const callback = new URL("/auth/callback", env.NEXT_PUBLIC_APP_URL);
  callback.searchParams.set("next", safeReturnPath(path, "/assets"));
  return callback.toString();
}

export async function signInWithPassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: firstValidationMessage(parsed.error),
    };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailableState();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user)
    return {
      status: "error",
      message: "Email or password is incorrect.",
    };
  await ensureProfile(data.user);
  redirect(safeReturnPath(formData.get("next"), "/assets") as Route);
}

export async function signUpWithPassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: firstValidationMessage(parsed.error),
    };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailableState();
  const next = safeReturnPath(formData.get("next"), "/assets");
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: authCallback(next) },
  });
  if (error)
    return {
      status: "error",
      message:
        "We could not create the account. Try signing in or recovering your password.",
    };
  if (data.session && data.user) {
    await ensureProfile(data.user);
    redirect(next as Route);
  }
  return {
    status: "success",
    message:
      "Check your inbox to verify your email. If an account already exists, sign in or recover its password.",
  };
}

export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = accountEmailSchema.safeParse(formData.get("email"));
  if (!parsed.success)
    return { status: "error", message: firstValidationMessage(parsed.error) };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailableState();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: authCallback("/account/update-password"),
  });
  return {
    status: "success",
    message: "If an account matches that email, a recovery link is on its way.",
  };
}

export async function resendSignupConfirmation(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = accountEmailSchema.safeParse(formData.get("email"));
  if (!parsed.success)
    return { status: "error", message: firstValidationMessage(parsed.error) };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailableState();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: authCallback("/assets") },
  });
  return {
    status: "success",
    message:
      "If that account is waiting for verification, a new confirmation email is on its way.",
  };
}

export async function updatePassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: firstValidationMessage(parsed.error),
    };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailableState();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      status: "error",
      message: "This recovery session is missing or expired.",
    };
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error)
    return {
      status: "error",
      message: "We could not update the password. Request a new recovery link.",
    };
  redirect("/account?notice=password_updated");
}

export async function requestMagicLink(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = accountEmailSchema.safeParse(formData.get("email"));
  if (!parsed.success)
    return { status: "error", message: "Enter a valid email address." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailableState();
  const next = safeReturnPath(formData.get("next"), "/assets");
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: authCallback(next), shouldCreateUser: true },
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
