import "server-only";
import { readServerEnv } from "@/config/env";
import {
  decryptCredential,
  encryptCredential,
} from "@/lib/security/credentials";
import { safeLog } from "@/lib/security/redact";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { ConnectableProviderId } from "./validation";

export type ProviderConnectionSummary = {
  id: string;
  provider: ConnectableProviderId;
  label: string;
  accountLabel: string | null;
  fingerprint: string;
  lastFour: string;
  isValid: boolean;
  validatedAt: string | null;
  updatedAt: string;
};

export async function listProviderConnections(
  ownerId: string,
): Promise<ProviderConnectionSummary[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("provider_credentials")
    .select(
      "id,provider,label,account_label,fingerprint,last_four,is_valid,validated_at,updated_at",
    )
    .eq("owner_id", ownerId)
    .is("revoked_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Unable to load provider connections");
  return (data ?? []).map((connection) => ({
    id: connection.id,
    provider: connection.provider as ConnectableProviderId,
    label: connection.label,
    accountLabel: connection.account_label,
    fingerprint: connection.fingerprint,
    lastFour: connection.last_four,
    isValid: connection.is_valid,
    validatedAt: connection.validated_at,
    updatedAt: connection.updated_at,
  }));
}

export async function validationAttemptsSince(
  ownerId: string,
  sinceIso: string,
): Promise<number> {
  const { count, error } = await createSupabaseAdminClient()
    .from("provider_connection_events")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("action", "credential.validated")
    .gte("created_at", sinceIso);
  if (error) throw new Error("Unable to check validation limit");
  return count ?? 0;
}

export async function recordConnectionEvent(input: {
  ownerId: string;
  provider: ConnectableProviderId;
  action: string;
  outcome: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const { error } = await createSupabaseAdminClient()
    .from("provider_connection_events")
    .insert({
      owner_id: input.ownerId,
      provider: input.provider,
      action: input.action,
      outcome: input.outcome,
      metadata: input.metadata ?? {},
    });
  if (error) throw new Error("Unable to record connection event");
}

export async function storeProviderConnection(input: {
  ownerId: string;
  provider: ConnectableProviderId;
  label: string;
  accountLabel?: string | undefined;
  secret: string;
}) {
  const encryptionSecret = readServerEnv().PROVIDER_KEY_ENCRYPTION_SECRET;
  if (!encryptionSecret)
    throw new Error("Provider credential encryption is not configured");
  const encrypted = encryptCredential(input.secret, encryptionSecret);
  const { error } = await createSupabaseAdminClient()
    .from("provider_credentials")
    .upsert(
      {
        owner_id: input.ownerId,
        provider: input.provider,
        label: input.label,
        account_label: input.accountLabel ?? null,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.tag,
        fingerprint: encrypted.fingerprint,
        last_four: encrypted.lastFour,
        is_valid: true,
        validation_error: null,
        validated_at: new Date().toISOString(),
        revoked_at: null,
        key_version: 1,
      },
      { onConflict: "owner_id,provider" },
    );
  if (error) throw new Error("Unable to save provider connection");
  safeLog("provider.connected", {
    ownerId: input.ownerId,
    provider: input.provider,
    fingerprint: encrypted.fingerprint,
  });
}

export async function getProviderConnectionSecret(
  ownerId: string,
  provider: ConnectableProviderId | "openai" | "replicate",
): Promise<string | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("provider_credentials")
    .select("ciphertext,iv,auth_tag")
    .eq("owner_id", ownerId)
    .eq("provider", provider)
    .eq("is_valid", true)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const encryptionSecret = readServerEnv().PROVIDER_KEY_ENCRYPTION_SECRET;
  if (!encryptionSecret) return null;
  return decryptCredential(
    { ciphertext: data.ciphertext, iv: data.iv, tag: data.auth_tag },
    encryptionSecret,
  );
}

export async function removeProviderConnection(
  ownerId: string,
  connectionId: string,
) {
  const { data, error } = await createSupabaseAdminClient()
    .from("provider_credentials")
    .delete()
    .eq("id", connectionId)
    .eq("owner_id", ownerId)
    .select("provider")
    .maybeSingle();
  if (error) throw new Error("Unable to remove provider connection");
  if (data)
    safeLog("provider.disconnected", {
      ownerId,
      provider: data.provider,
    });
  return data?.provider as ConnectableProviderId | undefined;
}

export async function readEncryptedConnection(
  ownerId: string,
  connectionId: string,
) {
  const { data, error } = await createSupabaseAdminClient()
    .from("provider_credentials")
    .select("provider,ciphertext,iv,auth_tag")
    .eq("id", connectionId)
    .eq("owner_id", ownerId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error("Unable to read provider connection");
  return data;
}
