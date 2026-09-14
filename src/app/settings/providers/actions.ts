"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { readServerEnv } from "@/config/env";
import { requireUser } from "@/server/auth/session";
import {
  recordConnectionEvent,
  removeProviderConnection,
  storeProviderConnection,
  validationAttemptsSince,
} from "@/server/providers/connections";
import {
  validateProviderCredential,
  type ConnectableProviderId,
} from "@/server/providers/validation";

export type ProviderConnectionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const connectionSchema = z.object({
  provider: z.enum(["openai", "replicate"]),
  label: z.string().trim().min(2).max(80),
  secret: z.string().trim().min(8).max(4096),
});

const deletionSchema = z.object({
  connectionId: z.uuid(),
});

function providerName(provider: ConnectableProviderId) {
  return provider === "openai" ? "OpenAI" : "Replicate";
}

export async function connectProvider(
  _state: ProviderConnectionState,
  formData: FormData,
): Promise<ProviderConnectionState> {
  const session = await requireUser("/settings/providers");
  const parsed = connectionSchema.safeParse({
    provider: formData.get("provider"),
    label: formData.get("label"),
    secret: formData.get("secret"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: "Enter a label and a complete provider API key.",
    };
  if (!readServerEnv().PROVIDER_KEY_ENCRYPTION_SECRET)
    return {
      status: "error",
      message:
        "Secure provider storage is not configured yet. Add the server encryption secret and try again.",
    };
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  try {
    if ((await validationAttemptsSince(session.user.id, since)) >= 5)
      return {
        status: "error",
        message: "Too many validation attempts. Try again in ten minutes.",
      };
    const check = await validateProviderCredential(
      parsed.data.provider,
      parsed.data.secret,
    );
    await recordConnectionEvent({
      ownerId: session.user.id,
      provider: parsed.data.provider,
      action: "credential.validated",
      outcome: check.valid ? "accepted" : (check.error ?? "rejected"),
    });
    if (!check.valid)
      return {
        status: "error",
        message:
          check.error === "invalid_credential"
            ? "The provider rejected this key. Check it and try again."
            : "The provider could not be reached. Try again shortly.",
      };
    await storeProviderConnection({
      ownerId: session.user.id,
      provider: parsed.data.provider,
      label: parsed.data.label,
      accountLabel: check.accountLabel,
      secret: parsed.data.secret,
    });
    await recordConnectionEvent({
      ownerId: session.user.id,
      provider: parsed.data.provider,
      action: "credential.stored",
      outcome: "success",
    });
  } catch {
    return {
      status: "error",
      message: "The secure connection could not be updated. Try again.",
    };
  }
  revalidatePath("/settings/providers");
  return {
    status: "success",
    message: `${providerName(parsed.data.provider)} is connected and verified.`,
  };
}

export async function deleteProviderConnection(formData: FormData) {
  const session = await requireUser("/settings/providers");
  const input = deletionSchema.parse({
    connectionId: formData.get("connectionId"),
  });
  const provider = await removeProviderConnection(
    session.user.id,
    input.connectionId,
  );
  if (provider)
    await recordConnectionEvent({
      ownerId: session.user.id,
      provider,
      action: "credential.deleted",
      outcome: "success",
    });
  revalidatePath("/settings/providers");
}
