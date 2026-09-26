export type FundingSource = "system_free" | "personal_key";

export type StudioModel = {
  id: string;
  name: string;
  media: "image" | "video";
  description: string;
  provider: "openrouter" | "huggingface" | "openai" | "replicate";
  openRouterModel: string;
  huggingFaceProvider?: "nscale" | "fal-ai";
  fundingSources: readonly FundingSource[];
  ratios: readonly string[];
  qualities: readonly string[];
  resolutions: readonly string[];
  durations: readonly number[];
  maxQuantity: number;
  maxReferences: number;
  unitPrice: string;
};

export const studioModels: readonly StudioModel[] = [
  {
    id: "black-forest-labs/FLUX.1-schnell",
    name: "FLUX.1 Schnell",
    media: "image",
    description: "Fast system-funded image generation through Hugging Face",
    provider: "huggingface",
    openRouterModel: "",
    huggingFaceProvider: "nscale",
    fundingSources: ["system_free"],
    ratios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    qualities: ["Standard"],
    resolutions: ["1K"],
    durations: [],
    maxQuantity: 1,
    maxReferences: 0,
    unitPrice: "Hugging Face routed inference pricing",
  },
  {
    id: "krea/Krea-2-Turbo",
    name: "Krea 2 Turbo",
    media: "image",
    description: "Alternative fast image model through Hugging Face",
    provider: "huggingface",
    openRouterModel: "",
    huggingFaceProvider: "fal-ai",
    fundingSources: ["system_free"],
    ratios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    qualities: ["Standard"],
    resolutions: ["1K"],
    durations: [],
    maxQuantity: 1,
    maxReferences: 0,
    unitPrice: "Hugging Face routed inference pricing",
  },
  {
    id: "recraft/recraft-v4.1-flash",
    name: "Recraft V4.1 Flash",
    media: "image",
    description: "Fast, cost-conscious text-to-image generation",
    provider: "openrouter",
    openRouterModel: "recraft/recraft-v4.1-flash",
    fundingSources: ["system_free", "personal_key"],
    ratios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    qualities: ["Standard"],
    resolutions: ["Provider default"],
    durations: [],
    maxQuantity: 1,
    maxReferences: 0,
    unitPrice: "OpenRouter usage pricing",
  },
  {
    id: "google/gemini-3.1-flash-lite-image",
    name: "Nano Banana 2 Lite",
    media: "image",
    description: "Fast 1K image generation and editing with references",
    provider: "openrouter",
    openRouterModel: "google/gemini-3.1-flash-lite-image",
    fundingSources: ["system_free", "personal_key"],
    ratios: [
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9",
    ],
    qualities: ["Standard"],
    resolutions: ["1K"],
    durations: [],
    maxQuantity: 1,
    maxReferences: 3,
    unitPrice: "OpenRouter usage pricing",
  },
  {
    id: "openai/gpt-image-1-mini",
    name: "GPT Image 1 Mini",
    media: "image",
    description: "Fast, cost-conscious image generation and editing",
    provider: "openrouter",
    openRouterModel: "openai/gpt-image-1-mini",
    fundingSources: ["system_free", "personal_key"],
    ratios: ["1:1", "3:2", "2:3"],
    qualities: ["Standard", "High"],
    resolutions: ["Provider default"],
    durations: [],
    maxQuantity: 1,
    maxReferences: 3,
    unitPrice: "OpenRouter usage pricing",
  },
  {
    id: "openai/gpt-image-2",
    name: "GPT Image 2",
    media: "image",
    description: "High-fidelity image generation with reference support",
    provider: "openrouter",
    openRouterModel: "openai/gpt-image-2",
    fundingSources: ["personal_key"],
    ratios: ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"],
    qualities: ["Standard", "High"],
    resolutions: ["Provider default"],
    durations: [],
    maxQuantity: 1,
    maxReferences: 3,
    unitPrice: "OpenRouter usage pricing",
  },
  {
    id: "bytedance/seedance-2.0-mini",
    name: "Seedance 2.0 Mini",
    media: "video",
    description: "Short, cost-conscious text or first-frame video",
    provider: "openrouter",
    openRouterModel: "bytedance/seedance-2.0-mini",
    fundingSources: ["system_free", "personal_key"],
    ratios: ["16:9", "9:16"],
    qualities: ["Standard"],
    resolutions: ["480p", "720p"],
    durations: [4],
    maxQuantity: 1,
    maxReferences: 1,
    unitPrice: "OpenRouter's per-second video rate",
  },
  {
    id: "google/veo-3.1",
    name: "Veo 3.1",
    media: "video",
    description: "Premium cinematic video with native audio",
    provider: "openrouter",
    openRouterModel: "google/veo-3.1",
    fundingSources: ["personal_key"],
    ratios: ["16:9"],
    qualities: ["High"],
    resolutions: ["720p"],
    durations: [5, 8],
    maxQuantity: 1,
    maxReferences: 1,
    unitPrice: "OpenRouter's premium per-second video rate",
  },
  {
    id: "luma-image",
    name: "Luma Image v1 (legacy)",
    media: "image",
    description: "Archived authored-study compatibility",
    provider: "openai",
    openRouterModel: "",
    fundingSources: [],
    ratios: ["1:1", "3:4", "4:3", "16:9", "9:16"],
    qualities: ["Standard", "High"],
    resolutions: ["1K", "2K"],
    durations: [],
    maxQuantity: 4,
    maxReferences: 3,
    unitPrice: "Legacy",
  },
  {
    id: "seedance",
    name: "Seedance (legacy)",
    media: "video",
    description: "Archived authored-study compatibility",
    provider: "replicate",
    openRouterModel: "",
    fundingSources: [],
    ratios: ["16:9", "9:16"],
    qualities: ["Standard"],
    resolutions: ["720p"],
    durations: [5],
    maxQuantity: 1,
    maxReferences: 1,
    unitPrice: "Legacy",
  },
  {
    id: "flux-pro",
    name: "Flux 2 Pro (legacy)",
    media: "image",
    description: "Legacy Replicate result compatibility",
    provider: "replicate",
    openRouterModel: "",
    fundingSources: [],
    ratios: ["1:1", "3:4", "4:3", "16:9", "9:16"],
    qualities: ["Standard"],
    resolutions: ["1 MP", "2 MP"],
    durations: [],
    maxQuantity: 1,
    maxReferences: 3,
    unitPrice: "Legacy",
  },
  {
    id: "gpt-image",
    name: "GPT Image 2 (legacy)",
    media: "image",
    description: "Legacy OpenAI result compatibility",
    provider: "openai",
    openRouterModel: "",
    fundingSources: [],
    ratios: ["1:1", "2:3", "3:2"],
    qualities: ["Standard", "High"],
    resolutions: ["1K"],
    durations: [],
    maxQuantity: 1,
    maxReferences: 0,
    unitPrice: "Legacy",
  },
  {
    id: "hailuo",
    name: "Hailuo video-01 (legacy)",
    media: "video",
    description: "Legacy Replicate result compatibility",
    provider: "replicate",
    openRouterModel: "",
    fundingSources: [],
    ratios: ["16:9"],
    qualities: ["Standard"],
    resolutions: ["720p"],
    durations: [6],
    maxQuantity: 1,
    maxReferences: 1,
    unitPrice: "Legacy",
  },
] as const;

export const studioPresets = [
  "None",
  "Editorial Form",
  "Quiet Monument",
  "Object Study",
  "Lucid Terrain",
  "Noir Frame",
  "Night Passage",
  "Graphic Matter",
  "Vivid Signal",
  "Slow Pursuit",
  "Signal Path",
  "Soft Ascent",
] as const;

export function getStudioModel(id: string) {
  return studioModels.find((model) => model.id === id);
}

export function modelsForFunding(
  media: StudioModel["media"],
  fundingSource: FundingSource,
) {
  return studioModels
    .filter(
      (model) =>
        model.media === media && model.fundingSources.includes(fundingSource),
    )
    .map((model) =>
      fundingSource === "system_free"
        ? {
            ...model,
            qualities: model.media === "image" ? ["Standard"] : model.qualities,
            resolutions: model.media === "video" ? ["480p"] : model.resolutions,
          }
        : model,
    );
}
