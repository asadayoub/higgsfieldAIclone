import "server-only";
import { GuidedProvider } from "./guided";
import type { ProviderAdapter, ProviderId } from "./types";
import {
  OpenAIImageAdapter,
  OpenRouterAdapter,
  ReplicateAdapter,
} from "./live";
import { HuggingFaceImageAdapter } from "./huggingface";

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
export function getLiveProvider(
  id: "openrouter",
  secret: string,
): OpenRouterAdapter;
export function getLiveProvider(
  id: "huggingface",
  secret: string,
): HuggingFaceImageAdapter;
export function getLiveProvider(
  id: "openai" | "replicate" | "openrouter" | "huggingface",
  secret: string,
) {
  if (id === "huggingface") return new HuggingFaceImageAdapter(secret);
  if (id === "openrouter") return new OpenRouterAdapter(secret);
  return id === "openai"
    ? new OpenAIImageAdapter(secret)
    : new ReplicateAdapter(secret);
}
