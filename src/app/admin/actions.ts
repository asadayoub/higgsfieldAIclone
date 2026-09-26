"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/supabase/client";
import {
  revalidateSystemCredential,
  storeSystemCredential,
  updateSystemCredentialState,
  updateSystemCredentialPolicy,
  validateHuggingFaceToken,
} from "@/server/providers/system-credentials";
import { huggingFaceImageCatalog } from "@/server/providers/huggingface-catalog";

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

export async function updateProviderAvailability(formData: FormData) {
  const actor = await requireRole("superadmin", "/admin");
  const provider = z
    .enum(["openrouter", "huggingface"])
    .parse(formData.get("provider"));
  const systemImageEnabled = formData.get("systemImageEnabled") === "on";
  const systemVideoEnabled = formData.get("systemVideoEnabled") === "on";
  const personalImageEnabled =
    provider === "openrouter" && formData.get("personalImageEnabled") === "on";
  const personalVideoEnabled =
    provider === "openrouter" && formData.get("personalVideoEnabled") === "on";
  const finalSystemVideoEnabled =
    provider === "openrouter" && systemVideoEnabled;
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Provider settings unavailable");
  const { error } = await supabase
    .from("provider_feature_flags")
    .update({
      system_image_enabled: systemImageEnabled,
      system_video_enabled: finalSystemVideoEnabled,
      personal_image_enabled: personalImageEnabled,
      personal_video_enabled: personalVideoEnabled,
      updated_by: actor.user.id,
    })
    .eq("provider", provider);
  if (error) throw new Error("Provider availability update failed");
  await supabase.from("admin_audit_events").insert({
    actor_id: actor.user.id,
    action: "provider.availability_changed",
    target_type: "provider",
    target_id: provider,
    metadata: {
      systemImageEnabled,
      systemVideoEnabled: finalSystemVideoEnabled,
      personalImageEnabled,
      personalVideoEnabled,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/studio");
  revalidatePath("/settings/providers");
}

const addHuggingFaceCredentialSchema = z.object({
  label: z.string().trim().min(1).max(80),
  token: z.string().trim().min(20).max(512),
  priority: z.coerce.number().int().min(0).max(1000),
  maxConcurrency: z.coerce.number().int().min(1).max(3),
  requestLimitDaily: z.coerce.number().int().min(1).max(1000),
  allowedModels: z
    .array(z.string())
    .min(1)
    .refine((models) => {
      const approved = new Set(
        huggingFaceImageCatalog.map((model) => model.id as string),
      );
      return models.every((model) => approved.has(model));
    }),
});

export async function addHuggingFaceSystemCredential(formData: FormData) {
  const actor = await requireRole("superadmin", "/admin");
  const input = addHuggingFaceCredentialSchema.parse({
    label: formData.get("label"),
    token: formData.get("token"),
    priority: formData.get("priority"),
    maxConcurrency: formData.get("maxConcurrency"),
    requestLimitDaily: formData.get("requestLimitDaily"),
    allowedModels: formData.getAll("allowedModels"),
  });
  const validation = await validateHuggingFaceToken(input.token);
  if (!validation.valid)
    throw new Error(
      validation.error === "invalid"
        ? "Hugging Face rejected this token."
        : "Hugging Face validation is temporarily unavailable.",
    );
  const id = await storeSystemCredential({
    actorId: actor.user.id,
    label: input.label,
    token: input.token,
    priority: input.priority,
    maxConcurrency: input.maxConcurrency,
    requestLimitDaily: input.requestLimitDaily,
    allowedModels: input.allowedModels,
    accountHash: validation.accountHash,
  });
  const db = await createSupabaseServerClient();
  if (!db) throw new Error("Audit trail unavailable.");
  await db.from("admin_audit_events").insert({
    actor_id: actor.user.id,
    action: "system_credential.created",
    target_type: "system_provider_credential",
    target_id: id,
    metadata: {
      provider: "huggingface",
      models: input.allowedModels,
      maxConcurrency: input.maxConcurrency,
      requestLimitDaily: input.requestLimitDaily,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/studio");
}

const credentialStateSchema = z.object({
  credentialId: z.uuid(),
  status: z.enum(["active", "draining", "disabled", "revoked"]),
});

export async function changeHuggingFaceCredentialState(formData: FormData) {
  const actor = await requireRole("superadmin", "/admin");
  const input = credentialStateSchema.parse({
    credentialId: formData.get("credentialId"),
    status: formData.get("status"),
  });
  await updateSystemCredentialState({
    id: input.credentialId,
    actorId: actor.user.id,
    status: input.status,
  });
  const db = await createSupabaseServerClient();
  if (!db) throw new Error("Audit trail unavailable.");
  await db.from("admin_audit_events").insert({
    actor_id: actor.user.id,
    action:
      input.status === "revoked"
        ? "system_credential.revoked"
        : "system_credential.state_changed",
    target_type: "system_provider_credential",
    target_id: input.credentialId,
    metadata: { provider: "huggingface", status: input.status },
  });
  revalidatePath("/admin");
  revalidatePath("/studio");
}

export async function validateHuggingFaceSystemCredential(formData: FormData) {
  const actor = await requireRole("superadmin", "/admin");
  const credentialId = z.uuid().parse(formData.get("credentialId"));
  const valid = await revalidateSystemCredential({
    id: credentialId,
    actorId: actor.user.id,
  });
  const db = await createSupabaseServerClient();
  if (!db) throw new Error("Audit trail unavailable.");
  await db.from("admin_audit_events").insert({
    actor_id: actor.user.id,
    action: "system_credential.validated",
    target_type: "system_provider_credential",
    target_id: credentialId,
    metadata: { provider: "huggingface", valid },
  });
  revalidatePath("/admin");
  revalidatePath("/studio");
}

const credentialPolicySchema = z.object({
  credentialId: z.uuid(),
  label: z.string().trim().min(1).max(80),
  priority: z.coerce.number().int().min(0).max(1000),
  maxConcurrency: z.coerce.number().int().min(1).max(3),
  requestLimitDaily: z.coerce.number().int().min(1).max(1000),
  allowedModels: z.array(z.string()).min(1),
});

export async function updateHuggingFaceCredentialPolicy(formData: FormData) {
  const actor = await requireRole("superadmin", "/admin");
  const input = credentialPolicySchema.parse({
    credentialId: formData.get("credentialId"),
    label: formData.get("label"),
    priority: formData.get("priority"),
    maxConcurrency: formData.get("maxConcurrency"),
    requestLimitDaily: formData.get("requestLimitDaily"),
    allowedModels: formData.getAll("allowedModels"),
  });
  await updateSystemCredentialPolicy({
    id: input.credentialId,
    actorId: actor.user.id,
    label: input.label,
    priority: input.priority,
    maxConcurrency: input.maxConcurrency,
    requestLimitDaily: input.requestLimitDaily,
    allowedModels: input.allowedModels,
  });
  const db = await createSupabaseServerClient();
  if (!db) throw new Error("Audit trail unavailable.");
  await db.from("admin_audit_events").insert({
    actor_id: actor.user.id,
    action: "system_credential.policy_changed",
    target_type: "system_provider_credential",
    target_id: input.credentialId,
    metadata: {
      provider: "huggingface",
      priority: input.priority,
      maxConcurrency: input.maxConcurrency,
      requestLimitDaily: input.requestLimitDaily,
      models: input.allowedModels,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/studio");
}
