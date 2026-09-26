import type { GenerationStatus } from "@/lib/generation/state-machine";

export type ProviderId =
  "guided" | "openai" | "replicate" | "openrouter" | "huggingface";
export type MediaKind = "image" | "video";
export type ProviderCapabilities = {
  media: readonly MediaKind[];
  supportsCancel: boolean;
  supportsWebhook: boolean;
};
export type CredentialCheck = {
  valid: boolean;
  accountLabel?: string;
  error?: string;
  fundingStatus?: "funded" | "free_tier" | "limit_exhausted" | "unknown";
};
export type GenerationRequest = {
  id: string;
  media: MediaKind;
  prompt: string;
  model: string;
  settings: Record<string, string | number | boolean>;
};
export type ProviderJob = {
  provider: ProviderId;
  externalId: string;
  submittedAt: Date;
};
export type GenerationUpdate = {
  status: Extract<
    GenerationStatus,
    "queued" | "processing" | "saving" | "complete" | "failed" | "cancelled"
  >;
  progress?: number;
  outputUrl?: string;
  error?: string;
};
export type VerifiedWebhook = { externalId: string; update: GenerationUpdate };

export interface ProviderAdapter {
  readonly provider: ProviderId;
  capabilities(): ProviderCapabilities;
  validateCredential(secret: string): Promise<CredentialCheck>;
  submit(input: GenerationRequest): Promise<ProviderJob>;
  poll(job: ProviderJob): Promise<GenerationUpdate>;
  cancel?(job: ProviderJob): Promise<void>;
  verifyWebhook?(request: Request): Promise<VerifiedWebhook>;
}
