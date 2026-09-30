import "server-only";
import { boundedText } from "@/lib/security/bounded-body";
import {
  decryptCredential,
  encryptCredential,
} from "@/lib/security/credentials";
import { readServerEnv } from "@/config/env";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { huggingFaceImageCatalog } from "./huggingface-catalog";

export type SystemCredentialStatus =
  | "active"
  | "draining"
  | "cooldown"
  | "exhausted"
  | "invalid"
  | "disabled"
  | "revoked";

export type SystemCredentialSummary = {
  id: string;
  label: string;
  lastFour: string;
  fingerprint: string;
  status: SystemCredentialStatus;
  priority: number;
  maxConcurrency: number;
  activeLeases: number;
  allowedModels: string[];
  requestLimitDaily: number;
  requestsUsedToday: number;
  usageDate: string;
  validationStatus: string;
  validationErrorCode: string | null;
  validatedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  cooldownUntil: string | null;
  accountGroup: string;
};

export type HuggingFaceIdentityCheck =
  | { valid: true; accountHash: string }
  | { valid: false; error: "invalid" | "unreachable" };

function encryptionSecret() {
  const secret = readServerEnv().PROVIDER_KEY_ENCRYPTION_SECRET;
  if (!secret)
    throw new Error("Provider credential encryption is unavailable.");
  return secret;
}

export async function validateHuggingFaceToken(
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<HuggingFaceIdentityCheck> {
  if (!/^hf_[A-Za-z0-9]{20,}$/.test(token))
    return { valid: false, error: "invalid" };
  try {
    const response = await fetcher("https://huggingface.co/api/whoami-v2", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401 || response.status === 403)
      return { valid: false, error: "invalid" };
    if (!response.ok) return { valid: false, error: "unreachable" };
    const raw = await boundedText(response, 32 * 1024);
    const payload = JSON.parse(raw) as { name?: unknown; auth?: unknown };
    if (typeof payload.name !== "string" || !payload.name.trim())
      return { valid: false, error: "invalid" };
    const { createHash } = await import("node:crypto");
    return {
      valid: true,
      accountHash: createHash("sha256")
        .update(payload.name.trim().toLowerCase())
        .digest("hex")
        .slice(0, 16),
    };
  } catch {
    return { valid: false, error: "unreachable" };
  }
}

export async function listSystemCredentials(): Promise<
  SystemCredentialSummary[]
> {
  const { data, error } = await createSupabaseAdminClient()
    .from("system_provider_credentials")
    .select(
      "id,label,last_four,fingerprint,provider_account_hash,status,priority,max_concurrency,active_leases,allowed_models,request_limit_daily,requests_used_today,usage_date,validation_status,validation_error_code,validated_at,last_success_at,last_failure_at,cooldown_until",
    )
    .eq("provider", "huggingface")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Hugging Face credential pool unavailable.");
  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    lastFour: row.last_four,
    fingerprint: row.fingerprint,
    status: row.status as SystemCredentialStatus,
    priority: row.priority,
    maxConcurrency: row.max_concurrency,
    activeLeases: row.active_leases,
    allowedModels: row.allowed_models,
    requestLimitDaily: row.request_limit_daily,
    requestsUsedToday: row.requests_used_today,
    usageDate: row.usage_date,
    validationStatus: row.validation_status,
    validationErrorCode: row.validation_error_code,
    validatedAt: row.validated_at,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    cooldownUntil: row.cooldown_until,
    accountGroup: row.provider_account_hash,
  }));
}

export async function listRecentHuggingFaceAttempts() {
  const { data, error } = await createSupabaseAdminClient()
    .from("provider_generation_attempts")
    .select(
      "generation_id,attempt_number,outcome,http_status,safe_error_code,latency_ms,created_at",
    )
    .eq("provider", "huggingface")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error("Hugging Face diagnostics unavailable.");
  return (data ?? []).map((attempt) => ({
    generationId: attempt.generation_id as string,
    attemptNumber: attempt.attempt_number as number,
    outcome: attempt.outcome as string,
    httpStatus: attempt.http_status as number | null,
    safeErrorCode: attempt.safe_error_code as string | null,
    latencyMs: attempt.latency_ms as number | null,
    createdAt: attempt.created_at as string,
  }));
}

export async function storeSystemCredential(input: {
  actorId: string;
  label: string;
  token: string;
  priority: number;
  maxConcurrency: number;
  requestLimitDaily: number;
  allowedModels: string[];
  accountHash: string;
}) {
  const approved = new Set<string>(
    huggingFaceImageCatalog.map((model) => model.id),
  );
  if (
    !input.allowedModels.length ||
    input.allowedModels.some((id) => !approved.has(id))
  )
    throw new Error("Choose approved Hugging Face models.");
  const encrypted = encryptCredential(input.token, encryptionSecret());
  const { data, error } = await createSupabaseAdminClient()
    .from("system_provider_credentials")
    .insert({
      provider: "huggingface",
      label: input.label,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.tag,
      fingerprint: encrypted.fingerprint,
      last_four: encrypted.lastFour,
      provider_account_hash: input.accountHash,
      status: "active",
      priority: input.priority,
      max_concurrency: input.maxConcurrency,
      allowed_media: ["image"],
      allowed_models: input.allowedModels,
      validation_status: "valid",
      validation_error_code: null,
      validated_at: new Date().toISOString(),
      request_limit_daily: input.requestLimitDaily,
      created_by: input.actorId,
      updated_by: input.actorId,
    })
    .select("id")
    .single();
  if (error?.code === "23505")
    throw new Error("This token is already in the pool.");
  if (error || !data) throw new Error("Could not add this system token.");
  return data.id as string;
}

export async function readSystemCredentialSecret(
  id: string,
  options: { allowInactive?: boolean } = {},
) {
  const { data, error } = await createSupabaseAdminClient()
    .from("system_provider_credentials")
    .select("ciphertext,iv,auth_tag,status")
    .eq("id", id)
    .eq("provider", "huggingface")
    .maybeSingle();
  if (error || !data || !data.ciphertext || !data.iv || !data.auth_tag)
    return null;
  if (
    data.status === "revoked" ||
    (!options.allowInactive &&
      !["active", "cooldown", "draining"].includes(data.status))
  )
    return null;
  return decryptCredential(
    { ciphertext: data.ciphertext, iv: data.iv, tag: data.auth_tag },
    encryptionSecret(),
  );
}

export async function acquireSystemCredential(input: {
  generationId: string;
  model: string;
}) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "acquire_system_credential",
    {
      p_generation: input.generationId,
      p_provider: "huggingface",
      p_media: "image",
      p_model: input.model,
      p_lease_seconds: 300,
    },
  );
  if (error || !data?.[0]) return null;
  return {
    credentialId: data[0].credential_id as string,
    leaseId: data[0].lease_id as string,
    attemptNumber: data[0].attempt_number as number,
  };
}

export async function settleSystemCredential(input: {
  leaseId: string;
  leaseState: "completed" | "failed" | "ambiguous";
  credentialStatus?: "active" | "cooldown" | "exhausted" | "invalid";
  cooldownSeconds?: number;
  safeErrorCode?: string;
  success?: boolean;
}) {
  const { error } = await createSupabaseAdminClient().rpc(
    "settle_system_credential_lease",
    {
      p_lease: input.leaseId,
      p_lease_state: input.leaseState,
      p_credential_status: input.credentialStatus ?? null,
      p_cooldown_seconds: input.cooldownSeconds ?? null,
      p_safe_error_code: input.safeErrorCode ?? null,
      p_success: input.success ?? false,
    },
  );
  if (error) throw new Error("Could not settle the system credential lease.");
}

export async function hasAvailableHuggingFaceCredential(model?: string) {
  const today = new Date().toISOString().slice(0, 10);
  let query = createSupabaseAdminClient()
    .from("system_provider_credentials")
    .select(
      "id,status,cooldown_until,usage_date,requests_used_today,request_limit_daily,active_leases,max_concurrency",
    )
    .eq("provider", "huggingface")
    .in("status", ["active", "cooldown"])
    .limit(20);
  if (model) query = query.contains("allowed_models", [model]);
  const { data, error } = await query;
  if (error) return false;
  return (data ?? []).some(
    (row) =>
      (row.status === "active" ||
        !row.cooldown_until ||
        Date.parse(row.cooldown_until) <= Date.now()) &&
      row.active_leases < row.max_concurrency &&
      (row.usage_date !== today ||
        row.requests_used_today < row.request_limit_daily),
  );
}

export async function updateSystemCredentialState(input: {
  id: string;
  actorId: string;
  status: "active" | "draining" | "disabled" | "revoked";
}) {
  const db = createSupabaseAdminClient();
  const values =
    input.status === "revoked"
      ? {
          status: "revoked",
          ciphertext: null,
          iv: null,
          auth_tag: null,
          revoked_at: new Date().toISOString(),
          secret_erased_at: new Date().toISOString(),
          cooldown_until: null,
          updated_by: input.actorId,
        }
      : {
          status: input.status,
          cooldown_until: null,
          validation_error_code: null,
          updated_by: input.actorId,
        };
  let query = db
    .from("system_provider_credentials")
    .update(values)
    .eq("id", input.id)
    .eq("provider", "huggingface")
    .neq("status", "revoked");
  if (input.status === "revoked" || input.status === "disabled")
    query = query.eq("active_leases", 0);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data)
    throw new Error(
      "Credential state could not be changed. Drain active work first.",
    );
}

export async function updateSystemCredentialPolicy(input: {
  id: string;
  actorId: string;
  label: string;
  priority: number;
  maxConcurrency: number;
  requestLimitDaily: number;
  allowedModels: string[];
}) {
  const approved = new Set<string>(
    huggingFaceImageCatalog.map((model) => model.id),
  );
  if (
    !input.allowedModels.length ||
    input.allowedModels.some((model) => !approved.has(model))
  )
    throw new Error("Choose approved Hugging Face models.");
  const { data, error } = await createSupabaseAdminClient()
    .from("system_provider_credentials")
    .update({
      label: input.label,
      priority: input.priority,
      max_concurrency: input.maxConcurrency,
      request_limit_daily: input.requestLimitDaily,
      allowed_models: input.allowedModels,
      updated_by: input.actorId,
    })
    .eq("id", input.id)
    .eq("provider", "huggingface")
    .neq("status", "revoked")
    .lte("active_leases", input.maxConcurrency)
    .select("id")
    .maybeSingle();
  if (error || !data)
    throw new Error("Credential policy could not be updated safely.");
}

export async function revalidateSystemCredential(input: {
  id: string;
  actorId: string;
}) {
  const token = await readSystemCredentialSecret(input.id, {
    allowInactive: true,
  });
  if (!token) throw new Error("This credential cannot be validated.");
  const result = await validateHuggingFaceToken(token);
  const { error } = await createSupabaseAdminClient()
    .from("system_provider_credentials")
    .update({
      validation_status: result.valid ? "valid" : result.error,
      validation_error_code: result.valid ? null : result.error,
      validated_at: new Date().toISOString(),
      status: result.valid
        ? "active"
        : result.error === "invalid"
          ? "invalid"
          : "disabled",
      updated_by: input.actorId,
    })
    .eq("id", input.id)
    .eq("provider", "huggingface")
    .neq("status", "revoked");
  if (error) throw new Error("Credential validation could not be recorded.");
  return result.valid;
}
