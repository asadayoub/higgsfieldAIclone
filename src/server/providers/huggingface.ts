import { randomUUID } from "node:crypto";
import {
  InferenceClient,
  InferenceClientHubApiError,
  InferenceClientProviderApiError,
} from "@huggingface/inference";
import type { StudioConfiguration } from "@/lib/studio/validation";
import { ProviderFailure, type LiveUpdate } from "./live";
import { approveHuggingFaceRecipe } from "./huggingface-catalog";

export class HuggingFaceProviderFailure extends ProviderFailure {
  constructor(
    code: ProviderFailure["code"],
    public readonly httpStatus?: number,
  ) {
    super(code);
  }
}

function providerPrompt(configuration: StudioConfiguration) {
  return configuration.preset === "None"
    ? configuration.prompt
    : `${configuration.prompt}\nCreative direction: ${configuration.preset}.`;
}

function classify(error: unknown): HuggingFaceProviderFailure {
  if (
    error instanceof InferenceClientProviderApiError ||
    error instanceof InferenceClientHubApiError
  ) {
    const status = error.httpResponse.status;
    if (status === 401 || status === 403)
      return new HuggingFaceProviderFailure("credential_rejected", status);
    if (status === 402)
      return new HuggingFaceProviderFailure("payment_required", status);
    if (status === 404)
      return new HuggingFaceProviderFailure("model_unavailable", status);
    if (status === 429)
      return new HuggingFaceProviderFailure("rate_limited", status);
    if (status >= 500)
      return new HuggingFaceProviderFailure("submission_unknown", status);
    return new HuggingFaceProviderFailure("provider_rejected", status);
  }
  if (error instanceof Error && error.name === "AbortError")
    return new HuggingFaceProviderFailure("submission_unknown");
  return new HuggingFaceProviderFailure("submission_unknown");
}

export class HuggingFaceImageAdapter {
  constructor(
    secret: string,
    private readonly client: Pick<
      InferenceClient,
      "textToImage"
    > = new InferenceClient(secret),
  ) {}

  async submitImage(configuration: StudioConfiguration): Promise<LiveUpdate> {
    const approved = approveHuggingFaceRecipe(configuration);
    let output: Blob;
    try {
      output = await this.client.textToImage(
        {
          provider: approved.inferenceProvider,
          model: approved.model,
          inputs: providerPrompt(configuration),
          parameters: {
            width: approved.width,
            height: approved.height,
            num_inference_steps: approved.steps,
          },
        },
        {
          retry_on_error: false,
          signal: AbortSignal.timeout(240000),
        },
      );
    } catch (error) {
      throw classify(error);
    }
    if (output.size < 1 || output.size > 25 * 1024 * 1024)
      throw new HuggingFaceProviderFailure("output_unavailable");
    const mime = output.type.toLowerCase();
    if (!(["image/png", "image/jpeg", "image/webp"] as string[]).includes(mime))
      throw new HuggingFaceProviderFailure("output_unavailable");
    return {
      status: "complete",
      externalId: `hf-${randomUUID()}`,
      outputs: [
        {
          bytes: new Uint8Array(await output.arrayBuffer()),
          mime: mime as "image/png" | "image/jpeg" | "image/webp",
        },
      ],
    };
  }
}
