import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { safeReturnPath } from "./return-path";

export type AppRole = "tester" | "superadmin";
export type SessionUser = { user: User; role: AppRole };

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return {
    user,
    role: profile?.role === "superadmin" ? "superadmin" : "tester",
  };
});

export async function requireUser(returnTo = "/account"): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session)
    redirect(`/account?next=${encodeURIComponent(safeReturnPath(returnTo))}`);
  return session;
}

export async function requireRole(
  role: AppRole,
  returnTo = "/",
): Promise<SessionUser> {
  const session = await requireUser(returnTo);
  if (session.role !== role) redirect("/forbidden");
  return session;
}
