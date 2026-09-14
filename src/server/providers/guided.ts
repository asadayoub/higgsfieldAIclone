import type {
  GenerationRequest,
  GenerationUpdate,
  ProviderAdapter,
  ProviderJob,
} from "./types";

export class GuidedProvider implements ProviderAdapter {
  readonly provider = "guided" as const;
  capabilities() {
    return {
      media: ["image", "video"] as const,
      supportsCancel: true,
      supportsWebhook: false,
    };
  }
  async validateCredential() {
    return { valid: true, accountLabel: "No credential required" };
  }
  async submit(input: GenerationRequest): Promise<ProviderJob> {
    return {
      provider: this.provider,
      externalId: `guided_${input.id}`,
      submittedAt: new Date(),
    };
  }
  async poll(job: ProviderJob): Promise<GenerationUpdate> {
    const elapsed = Date.now() - job.submittedAt.getTime();
    if (elapsed < 900) return { status: "queued", progress: 8 };
    if (elapsed < 2400)
      return {
        status: "processing",
        progress: Math.min(92, Math.round(elapsed / 26)),
      };
    return {
      status: "complete",
      progress: 100,
      outputUrl: "/media/system/guided-result.svg",
    };
  }
  async cancel() {
    return Promise.resolve();
  }
}
