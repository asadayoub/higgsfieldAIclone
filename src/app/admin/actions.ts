"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/supabase/client";

const roleChangeSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["tester", "superadmin"]),
});

export async function updateUserRole(formData: FormData) {
  const actor = await requireRole("superadmin", "/admin");
  const input = roleChangeSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (input.userId === actor.user.id && input.role !== "superadmin")
    throw new Error("A superadmin cannot remove their own access");
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("profiles")
    .update({ role: input.role })
    .eq("id", input.userId);
  if (error) throw new Error("Role update failed");
  await supabase.from("admin_audit_events").insert({
    actor_id: actor.user.id,
    action: "profile.role_changed",
    target_type: "profile",
    target_id: input.userId,
    metadata: { role: input.role },
  });
  revalidatePath("/admin");
}
