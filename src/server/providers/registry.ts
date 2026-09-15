import "server-only";
import { GuidedProvider } from "./guided";
import type { ProviderAdapter, ProviderId } from "./types";
import { OpenAIImageAdapter, ReplicateAdapter } from "./live";

const adapters = new Map<ProviderId, ProviderAdapter>([
  ["guided", new GuidedProvider()],
]);

export function getProvider(id: ProviderId): ProviderAdapter {
  const provider = adapters.get(id);
  if (!provider) throw new Error(`Provider ${id} is not enabled`);
  return provider;
}

export function listEnabledProviders(): ProviderId[] {
  return [...adapters.keys()];
}

// Live adapters are instantiated per authorized operation; keys never enter a global registry.
export function getLiveProvider(
  id: "openai",
  secret: string,
): OpenAIImageAdapter;
export function getLiveProvider(
  id: "replicate",
  secret: string,
): ReplicateAdapter;
export function getLiveProvider(id: "openai" | "replicate", secret: string) {
  return id === "openai"
    ? new OpenAIImageAdapter(secret)
    : new ReplicateAdapter(secret);
}
