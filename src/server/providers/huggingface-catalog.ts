import "server-only";
import type { StudioConfiguration } from "@/lib/studio/validation";

export const huggingFaceImageCatalog = [
  {
    id: "black-forest-labs/FLUX.1-schnell",
    provider: "nscale" as const,
    name: "FLUX.1 Schnell",
    maxPixels: 1024 * 1024,
    steps: 4,
  },
  {
    id: "krea/Krea-2-Turbo",
    provider: "fal-ai" as const,
    name: "Krea 2 Turbo",
    maxPixels: 1024 * 1024,
    steps: 8,
  },
] as const;

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
