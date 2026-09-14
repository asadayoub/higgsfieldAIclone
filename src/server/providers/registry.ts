import "server-only";
import { GuidedProvider } from "./guided";
import type { ProviderAdapter, ProviderId } from "./types";

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
