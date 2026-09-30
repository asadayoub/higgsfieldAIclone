import { describe, expect, it, vi } from "vitest";
import { InferenceClientProviderApiError } from "@huggingface/inference";

vi.mock("server-only", () => ({}));

import { HuggingFaceImageAdapter } from "./huggingface";
import { approveHuggingFaceRecipe } from "./huggingface-catalog";

const configuration = {
  media: "image" as const,
  execution: "live" as const,
  modelId: "black-forest-labs/FLUX.1-schnell",
  prompt: "A sculptural cobalt vessel",
  preset: "None",
  ratio: "1:1",
  quality: "Standard",
  resolution: "1K",
  quantity: 1,
  duration: 0,
  referenceCount: 0,
};

describe("Hugging Face image provider", () => {
  it("uses an explicit provider and bounded reviewed settings", async () => {
    const textToImage = vi.fn(async () =>
      Promise.resolve(
        new Blob([new Uint8Array([137, 80, 78, 71])], {
          type: "image/png",
        }),
      ),
    );
    const result = await new HuggingFaceImageAdapter("hf_fixture_token", {
      textToImage,
    } as unknown as ConstructorParameters<
      typeof HuggingFaceImageAdapter
    >[1]).submitImage(configuration);
    expect(result.status).toBe("complete");
    expect(textToImage).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "nscale",
        model: "black-forest-labs/FLUX.1-schnell",
        parameters: expect.objectContaining({ width: 1024, height: 1024 }),
      }),
      expect.objectContaining({ retry_on_error: false }),
    );
  });

  it("fails closed for references and arbitrary models", () => {
    expect(() =>
      approveHuggingFaceRecipe({ ...configuration, referenceCount: 1 }),
    ).toThrow("approved Hugging Face image recipe");
    expect(() =>
      approveHuggingFaceRecipe({ ...configuration, modelId: "owner/model" }),
    ).toThrow("approved Hugging Face image recipe");
  });

  it.each([
    ["Tongyi-MAI/Z-Image-Turbo", "fal-ai", 9],
    ["Qwen/Qwen-Image", "fal-ai", 50],
    ["stabilityai/stable-diffusion-xl-base-1.0", "fal-ai", 30],
    ["Qwen/Qwen-Image-2512", "fal-ai", 50],
    ["Tongyi-MAI/Z-Image", "fal-ai", 50],
    ["HiDream-ai/HiDream-I1-Full", "fal-ai", 50],
    ["black-forest-labs/FLUX.1-dev", "fal-ai", 50],
  ])("approves the reviewed recipe for %s", (modelId, provider, steps) => {
    expect(
      approveHuggingFaceRecipe({ ...configuration, modelId }),
    ).toMatchObject({
      model: modelId,
      inferenceProvider: provider,
      steps,
    });
  });

  it.each([
    [401, "credential_rejected"],
    [403, "model_unavailable"],
  ])(
    "classifies HTTP %i without poisoning gated-model credentials",
    async (status, code) => {
      const textToImage = vi.fn(async () => {
        throw new InferenceClientProviderApiError(
          "safe fixture error",
          { url: "https://router.huggingface.co", method: "POST" },
          { requestId: "fixture", status, body: "fixture" },
        );
      });
      await expect(
        new HuggingFaceImageAdapter("hf_fixture_token", {
          textToImage,
        } as unknown as ConstructorParameters<
          typeof HuggingFaceImageAdapter
        >[1]).submitImage(configuration),
      ).rejects.toMatchObject({ code, httpStatus: status });
    },
  );
});
