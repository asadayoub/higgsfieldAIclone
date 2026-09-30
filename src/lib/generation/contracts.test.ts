import { describe, expect, it } from "vitest";
import { submissionSchema } from "./contracts";
import { modelsForFunding } from "@/content/studio-models";

const base = {
  id: "8ba7bb89-e882-4a8d-b726-9b890c545874",
  configuration: {
    media: "image" as const,
    execution: "live" as const,
    modelId: "openai/gpt-image-1-mini",
    prompt: "A restrained editorial still life",
    preset: "None",
    ratio: "1:1",
    quality: "Standard",
    resolution: "Provider default",
    quantity: 1,
    duration: 0,
    referenceCount: 0,
  },
  referencePaths: [],
};

describe("generation funding contract", () => {
  it("offers reviewed Hugging Face and OpenRouter system image models", () => {
    expect(
      modelsForFunding("image", "system_free").map((model) => model.id),
    ).toEqual([
      "black-forest-labs/FLUX.1-schnell",
      "krea/Krea-2-Turbo",
      "Tongyi-MAI/Z-Image-Turbo",
      "Qwen/Qwen-Image",
      "stabilityai/stable-diffusion-xl-base-1.0",
      "Qwen/Qwen-Image-2512",
      "Tongyi-MAI/Z-Image",
      "HiDream-ai/HiDream-I1-Full",
      "black-forest-labs/FLUX.1-dev",
      "recraft/recraft-v4.1-flash",
      "google/gemini-3.1-flash-lite-image",
      "openai/gpt-image-1-mini",
    ]);
  });
  it("requires explicit allowance confirmation", () => {
    expect(
      submissionSchema.safeParse({
        ...base,
        fundingSource: "system_free",
        confirmedAllowance: false,
        confirmedExternalCost: false,
      }).success,
    ).toBe(false);
  });

  it("requires explicit external-cost confirmation", () => {
    expect(
      submissionSchema.safeParse({
        ...base,
        fundingSource: "personal_key",
        confirmedAllowance: false,
        confirmedExternalCost: false,
      }).success,
    ).toBe(false);
  });

  it("accepts each funding source only with its matching confirmation", () => {
    expect(
      submissionSchema.safeParse({
        ...base,
        fundingSource: "system_free",
        confirmedAllowance: true,
        confirmedExternalCost: false,
      }).success,
    ).toBe(true);
    expect(
      submissionSchema.safeParse({
        ...base,
        fundingSource: "personal_key",
        confirmedAllowance: false,
        confirmedExternalCost: true,
      }).success,
    ).toBe(true);
  });
});
