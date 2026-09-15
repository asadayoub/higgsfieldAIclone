import type { StudioConfiguration } from "@/lib/studio/validation";
import { boundedText } from "@/lib/security/bounded-body";

export type LiveOutput =
  { url: string } | { bytes: Uint8Array; mime: "image/png" };
export type LiveUpdate = {
  status: "queued" | "processing" | "complete" | "failed" | "cancelled";
  externalId: string;
  outputs?: LiveOutput[];
};
export class ProviderFailure extends Error {
  constructor(
    public readonly code:
      | "provider_rejected"
      | "provider_failed"
      | "submission_unknown"
      | "output_unavailable",
  ) {
    super(code);
  }
}
export type Fetcher = typeof fetch;

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
  if (!response.ok)
    throw new ProviderFailure(
      submission && response.status >= 500
        ? "submission_unknown"
        : "provider_rejected",
    );
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
