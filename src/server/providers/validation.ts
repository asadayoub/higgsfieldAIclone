import { boundedText } from "@/lib/security/bounded-body";
import type { CredentialCheck } from "./types";
import { readServerEnv } from "@/config/env";

export type ConnectableProviderId = "openrouter";

export const providerCatalog = [
  {
    id: "openrouter" as const,
    name: "OpenRouter",
    description:
      "One encrypted personal key for approved image and video models. Your key is used only when you explicitly select personal billing.",
    media: "Images + video",
    keyHint: "sk-or-v1-…",
  },
] as const;

type Fetcher = typeof fetch;

export async function validateProviderCredential(
  provider: ConnectableProviderId,
  secret: string,
  fetcher: Fetcher = fetch,
): Promise<CredentialCheck> {
  if (provider !== "openrouter")
    return { valid: false, error: "invalid_credential" };
  try {
    const response = await fetcher("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      redirect: "error",
    });
    if (response.status === 401 || response.status === 403)
      return { valid: false, error: "invalid_credential" };
    if (!response.ok) return { valid: false, error: "provider_unavailable" };
    const raw = await boundedText(response, 32 * 1024);
    const payload = JSON.parse(raw) as {
      data?: {
        label?: unknown;
        is_free_tier?: unknown;
        limit_remaining?: unknown;
      };
    };
    const label = payload.data?.label;
    const fundingStatus =
      payload.data?.is_free_tier === true
        ? "free_tier"
        : typeof payload.data?.limit_remaining === "number" &&
            payload.data.limit_remaining <= 0
          ? "limit_exhausted"
          : payload.data?.is_free_tier === false
            ? "funded"
            : "unknown";
    return {
      valid: true,
      accountLabel:
        typeof label === "string" && label.trim()
          ? label.trim().slice(0, 100)
          : "OpenRouter API key",
      fundingStatus,
    };
  } catch {
    return { valid: false, error: "provider_unavailable" };
  }
}

export async function systemOpenRouterHealth(
  fetcher: Fetcher = fetch,
): Promise<
  | "unavailable"
  | "healthy"
  | "free-tier key"
  | "spending limit exhausted"
  | "rejected"
  | "unreachable"
> {
  const secret = readServerEnv().OPENROUTER_SYSTEM_API_KEY;
  if (!secret) return "unavailable";
  const result = await validateProviderCredential(
    "openrouter",
    secret,
    fetcher,
  );
  if (result.valid)
    return result.fundingStatus === "free_tier"
      ? "free-tier key"
      : result.fundingStatus === "limit_exhausted"
        ? "spending limit exhausted"
        : "healthy";
  return result.error === "invalid_credential" ? "rejected" : "unreachable";
}
