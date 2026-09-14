import type { CredentialCheck, ProviderId } from "./types";

export type ConnectableProviderId = Extract<ProviderId, "openai" | "replicate">;

export const providerCatalog: ReadonlyArray<{
  id: ConnectableProviderId;
  name: string;
  description: string;
  media: string;
  keyHint: string;
}> = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Image generation and editing through your OpenAI project.",
    media: "Images",
    keyHint: "sk-…",
  },
  {
    id: "replicate",
    name: "Replicate",
    description: "Hosted image and video models from the Replicate catalog.",
    media: "Images + video",
    keyHint: "r8_…",
  },
] as const;

type Fetcher = typeof fetch;

async function checkedFetch(
  url: string,
  secret: string,
  fetcher: Fetcher,
): Promise<Response> {
  return fetcher(url, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
}

export async function validateProviderCredential(
  provider: ConnectableProviderId,
  secret: string,
  fetcher: Fetcher = fetch,
): Promise<CredentialCheck> {
  try {
    const response = await checkedFetch(
      provider === "openai"
        ? "https://api.openai.com/v1/models"
        : "https://api.replicate.com/v1/account",
      secret,
      fetcher,
    );
    if (response.status === 401 || response.status === 403)
      return { valid: false, error: "invalid_credential" };
    if (!response.ok) return { valid: false, error: "provider_unavailable" };
    if (provider === "openai")
      return { valid: true, accountLabel: "OpenAI API project" };
    const payload: unknown = await response.json();
    const accountLabel =
      payload && typeof payload === "object"
        ? (("name" in payload && typeof payload.name === "string"
            ? payload.name
            : undefined) ??
          ("username" in payload && typeof payload.username === "string"
            ? payload.username
            : undefined))
        : undefined;
    return {
      valid: true,
      accountLabel: accountLabel?.slice(0, 100) || "Replicate account",
    };
  } catch {
    return { valid: false, error: "provider_unavailable" };
  }
}
