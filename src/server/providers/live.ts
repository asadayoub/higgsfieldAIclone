import type { StudioConfiguration } from "@/lib/studio/validation";
import { boundedText } from "@/lib/security/bounded-body";

export type LiveOutput =
  | { url: string; source?: "replicate" | "openrouter" }
  | { bytes: Uint8Array; mime: "image/png" | "image/jpeg" | "image/webp" };
export type LiveUpdate = {
  status: "queued" | "processing" | "complete" | "failed" | "cancelled";
  externalId: string;
  outputs?: LiveOutput[];
  usage?: { cost?: number; isByok?: boolean };
};
export class ProviderFailure extends Error {
  constructor(
    public readonly code:
      | "provider_rejected"
      | "credential_rejected"
      | "payment_required"
      | "model_unavailable"
      | "rate_limited"
      | "provider_failed"
      | "submission_unknown"
      | "output_unavailable",
  ) {
    super(code);
  }
}
export type Fetcher = typeof fetch;

function safeUsage(raw: unknown): LiveUpdate["usage"] {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as { cost?: unknown; is_byok?: unknown };
  return {
    ...(typeof value.cost === "number" && Number.isFinite(value.cost)
      ? { cost: Math.max(0, value.cost) }
      : {}),
    ...(typeof value.is_byok === "boolean" ? { isByok: value.is_byok } : {}),
  };
}

export function providerPayload(
  configuration: StudioConfiguration,
  references: string[],
) {
  const prompt =
    configuration.preset === "None"
      ? configuration.prompt
      : `${configuration.prompt}\nCreative direction: ${configuration.preset}.`;
  if (configuration.modelId === "gpt-image")
    return {
      model: "gpt-image-2",
      prompt,
      n: 1,
      size:
        configuration.ratio === "2:3"
          ? "1024x1536"
          : configuration.ratio === "3:2"
            ? "1536x1024"
            : "1024x1024",
      quality: configuration.quality === "High" ? "high" : "medium",
      output_format: "png",
    };
  if (configuration.modelId === "flux-pro")
    return {
      input: {
        prompt,
        aspect_ratio: configuration.ratio,
        resolution: configuration.resolution,
        output_format: "png",
        ...(references.length ? { input_images: references } : {}),
      },
    };
  if (configuration.modelId === "hailuo")
    return {
      input: {
        prompt,
        prompt_optimizer: false,
        ...(references[0] ? { first_frame_image: references[0] } : {}),
      },
    };
  throw new ProviderFailure("provider_rejected");
}

async function jsonRequest(
  url: string,
  secret: string,
  init: RequestInit,
  fetcher: Fetcher,
  submission = false,
  timeout = 25000,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw new ProviderFailure(
      submission ? "submission_unknown" : "provider_failed",
    );
  }
  if (!response.ok) {
    if (submission && response.status >= 500)
      throw new ProviderFailure("submission_unknown");
    if (response.status === 401 || response.status === 403)
      throw new ProviderFailure("credential_rejected");
    if (response.status === 402) throw new ProviderFailure("payment_required");
    if (response.status === 404) throw new ProviderFailure("model_unavailable");
    if (response.status === 429) throw new ProviderFailure("rate_limited");
    throw new ProviderFailure("provider_rejected");
  }
  try {
    const raw = await boundedText(response, 30 * 1024 * 1024);
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new ProviderFailure(
      submission ? "submission_unknown" : "provider_failed",
    );
  }
}

export function parsePrediction(raw: Record<string, unknown>): LiveUpdate {
  if (typeof raw.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(raw.id))
    throw new ProviderFailure("provider_failed");
  const statuses = {
    starting: "queued",
    processing: "processing",
    succeeded: "complete",
    failed: "failed",
    canceled: "cancelled",
  } as const;
  const status = statuses[raw.status as keyof typeof statuses];
  if (!status) throw new ProviderFailure("provider_failed");
  const output = Array.isArray(raw.output) ? raw.output : [raw.output];
  const urls = output
    .filter((value): value is string => typeof value === "string")
    .slice(0, 1);
  if (status === "complete" && !urls.length)
    throw new ProviderFailure("output_unavailable");
  return {
    status,
    externalId: raw.id,
    ...(status === "complete" ? { outputs: urls.map((url) => ({ url })) } : {}),
  };
}

export class ReplicateAdapter {
  constructor(
    private secret: string,
    private fetcher: Fetcher = fetch,
  ) {}
  async submit(
    configuration: StudioConfiguration,
    references: string[],
  ): Promise<LiveUpdate> {
    const model =
      configuration.modelId === "flux-pro"
        ? "black-forest-labs/flux-2-pro"
        : configuration.modelId === "hailuo"
          ? "minimax/video-01"
          : null;
    if (!model) throw new ProviderFailure("provider_rejected");
    return parsePrediction(
      await jsonRequest(
        `https://api.replicate.com/v1/models/${model}/predictions`,
        this.secret,
        {
          method: "POST",
          headers: { "Cancel-After": "10m" },
          body: JSON.stringify(providerPayload(configuration, references)),
        },
        this.fetcher,
        true,
      ),
    );
  }
  async poll(id: string): Promise<LiveUpdate> {
    this.assertId(id);
    return parsePrediction(
      await jsonRequest(
        `https://api.replicate.com/v1/predictions/${id}`,
        this.secret,
        { method: "GET" },
        this.fetcher,
      ),
    );
  }
  async cancel(id: string): Promise<LiveUpdate> {
    this.assertId(id);
    return parsePrediction(
      await jsonRequest(
        `https://api.replicate.com/v1/predictions/${id}/cancel`,
        this.secret,
        { method: "POST" },
        this.fetcher,
      ),
    );
  }
  private assertId(id: string) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
      throw new ProviderFailure("provider_rejected");
  }
}

export class OpenAIImageAdapter {
  constructor(
    private secret: string,
    private fetcher: Fetcher = fetch,
  ) {}
  async submit(configuration: StudioConfiguration): Promise<LiveOutput[]> {
    if (configuration.modelId !== "gpt-image" || configuration.referenceCount)
      throw new ProviderFailure("provider_rejected");
    const raw = await jsonRequest(
      "https://api.openai.com/v1/images/generations",
      this.secret,
      {
        method: "POST",
        body: JSON.stringify(providerPayload(configuration, [])),
      },
      this.fetcher,
      true,
      240000,
    );
    const data = raw.data as { b64_json?: unknown }[] | undefined;
    const encoded = Array.isArray(data) ? data[0]?.b64_json : null;
    if (
      typeof encoded !== "string" ||
      encoded.length > 28 * 1024 * 1024 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
    )
      throw new ProviderFailure("output_unavailable");
    return [
      {
        bytes: new Uint8Array(Buffer.from(encoded, "base64")),
        mime: "image/png",
      },
    ];
  }
}

function assertOpenRouterId(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id))
    throw new ProviderFailure("provider_rejected");
}

export class OpenRouterAdapter {
  constructor(
    private secret: string,
    private fetcher: Fetcher = fetch,
  ) {}

  async submitImage(
    configuration: StudioConfiguration,
    references: string[],
  ): Promise<LiveUpdate> {
    const model = configuration.modelId;
    if (!getOpenRouterImageModels().has(model))
      throw new ProviderFailure("provider_rejected");
    const prompt = providerPrompt(configuration);
    const supportsQuality = model.startsWith("openai/gpt-image-");
    const supportsResolution = model === "google/gemini-3.1-flash-lite-image";
    const raw = await jsonRequest(
      "https://openrouter.ai/api/v1/images",
      this.secret,
      {
        method: "POST",
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          aspect_ratio: configuration.ratio,
          ...(supportsQuality
            ? {
                quality: configuration.quality === "High" ? "high" : "medium",
              }
            : {}),
          ...(supportsResolution
            ? { resolution: configuration.resolution }
            : {}),
          ...(references.length
            ? {
                input_references: references.map((url) => ({
                  type: "image_url",
                  image_url: { url },
                })),
              }
            : {}),
        }),
      },
      this.fetcher,
      true,
      240000,
    );
    const data = raw.data as
      { b64_json?: unknown; media_type?: unknown }[] | undefined;
    const item = Array.isArray(data) ? data[0] : undefined;
    const encoded = item?.b64_json;
    if (
      typeof encoded !== "string" ||
      encoded.length > 28 * 1024 * 1024 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
    )
      throw new ProviderFailure("output_unavailable");
    const mime =
      item?.media_type === "image/jpeg" || item?.media_type === "image/webp"
        ? item.media_type
        : "image/png";
    const usage = safeUsage(raw.usage);
    return {
      status: "complete",
      externalId: `image_${crypto.randomUUID()}`,
      outputs: [
        { bytes: new Uint8Array(Buffer.from(encoded, "base64")), mime },
      ],
      ...(usage ? { usage } : {}),
    };
  }

  async submitVideo(
    configuration: StudioConfiguration,
    references: string[],
  ): Promise<LiveUpdate> {
    if (!getOpenRouterVideoModels().has(configuration.modelId))
      throw new ProviderFailure("provider_rejected");
    const raw = await jsonRequest(
      "https://openrouter.ai/api/v1/videos",
      this.secret,
      {
        method: "POST",
        body: JSON.stringify({
          model: configuration.modelId,
          prompt: providerPrompt(configuration),
          duration: configuration.duration,
          resolution: configuration.resolution,
          aspect_ratio: configuration.ratio,
          ...(references[0]
            ? {
                frame_images: [
                  {
                    type: "image_url",
                    image_url: { url: references[0] },
                    frame_type: "first_frame",
                  },
                ],
              }
            : {}),
        }),
      },
      this.fetcher,
      true,
      30000,
    );
    if (typeof raw.id !== "string")
      throw new ProviderFailure("submission_unknown");
    assertOpenRouterId(raw.id);
    const usage = safeUsage(raw.usage);
    return {
      status: "queued",
      externalId: raw.id,
      ...(usage ? { usage } : {}),
    };
  }

  async pollVideo(id: string): Promise<LiveUpdate> {
    assertOpenRouterId(id);
    const raw = await jsonRequest(
      `https://openrouter.ai/api/v1/videos/${encodeURIComponent(id)}`,
      this.secret,
      { method: "GET" },
      this.fetcher,
    );
    if (raw.id !== id) throw new ProviderFailure("provider_failed");
    const statuses = {
      pending: "queued",
      in_progress: "processing",
      completed: "complete",
      failed: "failed",
      cancelled: "cancelled",
      expired: "failed",
    } as const;
    const status = statuses[raw.status as keyof typeof statuses];
    if (!status) throw new ProviderFailure("provider_failed");
    const usage = safeUsage(raw.usage);
    return {
      status,
      externalId: id,
      ...(status === "complete"
        ? {
            outputs: [
              {
                url: `https://openrouter.ai/api/v1/videos/${encodeURIComponent(id)}/content?index=0`,
                source: "openrouter" as const,
              },
            ],
          }
        : {}),
      ...(usage ? { usage } : {}),
    };
  }
}

function providerPrompt(configuration: StudioConfiguration) {
  return configuration.preset === "None"
    ? configuration.prompt
    : `${configuration.prompt}\nCreative direction: ${configuration.preset}.`;
}

function getOpenRouterImageModels() {
  return new Set([
    "recraft/recraft-v4.1-flash",
    "google/gemini-3.1-flash-lite-image",
    "openai/gpt-image-1-mini",
    "openai/gpt-image-2",
  ]);
}

function getOpenRouterVideoModels() {
  return new Set(["bytedance/seedance-2.0-mini", "google/veo-3.1"]);
}
