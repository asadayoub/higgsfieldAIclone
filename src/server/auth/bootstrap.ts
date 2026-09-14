import "server-only";
import type { User } from "@supabase/supabase-js";
import { readServerEnv } from "@/config/env";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export async function ensureProfile(user: User): Promise<void> {
  const env = readServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_URL) return;
  const allowed = new Set(
    (env.ADMIN_EMAIL_ALLOWLIST ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  const isBootstrapAdmin = Boolean(
    user.email && allowed.has(user.email.toLowerCase()),
  );
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = isBootstrapAdmin ? "superadmin" : (existing?.role ?? "tester");
  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      display_name:
        user.user_metadata.name ?? user.email?.split("@")[0] ?? "Creator",
      role,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error("Unable to initialize account profile");
}
