import "server-only";
import type { StudioConfiguration } from "@/lib/studio/validation";

type HuggingFaceImageModel = {
  id: string;
  provider: "nscale" | "fal-ai";
  name: string;
  maxPixels: number;
  steps: number;
  tier: "fast" | "quality";
  access: "public" | "gated";
  license: string;
};

export const huggingFaceImageCatalog = [
  {
    id: "black-forest-labs/FLUX.1-schnell",
    provider: "nscale" as const,
    name: "FLUX.1 Schnell",
    maxPixels: 1024 * 1024,
    steps: 4,
    tier: "fast",
    access: "gated",
    license: "Apache-2.0",
  },
  {
    id: "krea/Krea-2-Turbo",
    provider: "fal-ai" as const,
    name: "Krea 2 Turbo",
    maxPixels: 1024 * 1024,
    steps: 8,
    tier: "fast",
    access: "gated",
    license: "Krea 2 Community License",
  },
  {
    id: "Tongyi-MAI/Z-Image-Turbo",
    provider: "fal-ai" as const,
    name: "Z-Image Turbo",
    maxPixels: 1024 * 1024,
    steps: 9,
    tier: "fast",
    access: "public",
    license: "Apache-2.0",
  },
  {
    id: "Qwen/Qwen-Image",
    provider: "fal-ai" as const,
    name: "Qwen Image",
    maxPixels: 1024 * 1024,
    steps: 50,
    tier: "quality",
    access: "public",
    license: "Apache-2.0",
  },
  {
    id: "stabilityai/stable-diffusion-xl-base-1.0",
    provider: "fal-ai" as const,
    name: "Stable Diffusion XL 1.0",
    maxPixels: 1024 * 1024,
    steps: 30,
    tier: "quality",
    access: "public",
    license: "OpenRAIL++",
  },
  {
    id: "Qwen/Qwen-Image-2512",
    provider: "fal-ai" as const,
    name: "Qwen Image 2512",
    maxPixels: 1024 * 1024,
    steps: 50,
    tier: "quality",
    access: "public",
    license: "Apache-2.0",
  },
  {
    id: "Tongyi-MAI/Z-Image",
    provider: "fal-ai" as const,
    name: "Z-Image",
    maxPixels: 1024 * 1024,
    steps: 50,
    tier: "quality",
    access: "public",
    license: "Apache-2.0",
  },
  {
    id: "HiDream-ai/HiDream-I1-Full",
    provider: "fal-ai" as const,
    name: "HiDream I1 Full",
    maxPixels: 1024 * 1024,
    steps: 50,
    tier: "quality",
    access: "public",
    license: "MIT",
  },
  {
    id: "black-forest-labs/FLUX.1-dev",
    provider: "fal-ai" as const,
    name: "FLUX.1 Dev",
    maxPixels: 1024 * 1024,
    steps: 50,
    tier: "quality",
    access: "gated",
    license: "FLUX.1 Dev Non-Commercial",
  },
] as const satisfies readonly HuggingFaceImageModel[];

export type HuggingFaceModelId = (typeof huggingFaceImageCatalog)[number]["id"];

export function getHuggingFaceImageModel(id: string) {
  return huggingFaceImageCatalog.find((model) => model.id === id);
}

function dimensions(ratio: string) {
  const values: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "4:3": { width: 1024, height: 768 },
    "3:4": { width: 768, height: 1024 },
    "16:9": { width: 1024, height: 576 },
    "9:16": { width: 576, height: 1024 },
  };
  return values[ratio] ?? values["1:1"]!;
}

export function approveHuggingFaceRecipe(configuration: StudioConfiguration) {
  const model = getHuggingFaceImageModel(configuration.modelId);
  if (
    !model ||
    configuration.media !== "image" ||
    configuration.referenceCount !== 0 ||
    configuration.quantity !== 1 ||
    configuration.quality !== "Standard" ||
    configuration.resolution !== "1K"
  )
    throw new Error("Choose an approved Hugging Face image recipe.");
  const size = dimensions(configuration.ratio);
  if (size.width * size.height > model.maxPixels)
    throw new Error("Choose an approved Hugging Face image size.");
  return {
    source: "huggingface",
    model: model.id,
    inferenceProvider: model.provider,
    media: "image",
    outputCount: 1,
    width: size.width,
    height: size.height,
    steps: model.steps,
  } as const;
}
