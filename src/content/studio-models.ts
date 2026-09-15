export type StudioModel = {
  id: string;
  name: string;
  media: "image" | "video";
  description: string;
  provider: "openai" | "replicate" | null;
  ratios: readonly string[];
  qualities: readonly string[];
  resolutions: readonly string[];
  durations: readonly number[];
  maxQuantity: number;
  maxReferences: number;
  liveCapabilities?: Partial<
    Pick<
      StudioModel,
      "ratios" | "qualities" | "resolutions" | "maxQuantity" | "maxReferences"
    >
  >;
};

const imageDefaults = {
  media: "image" as const,
  ratios: ["1:1", "3:4", "4:3", "16:9", "9:16", "14:9"],
  qualities: ["Standard", "High"],
  resolutions: ["1K", "2K"],
  durations: [],
  maxQuantity: 4,
  maxReferences: 3,
};
const videoDefaults = {
  media: "video" as const,
  ratios: ["16:9", "9:16", "1:1"],
  qualities: ["Standard", "High"],
  resolutions: ["720p", "1080p"],
  durations: [5, 10],
  maxQuantity: 1,
  maxReferences: 1,
};

export const studioModels: readonly StudioModel[] = [
  {
    ...imageDefaults,
    id: "luma-image",
    name: "Luma Image v1",
    description: "Atmospheric, balanced visual studies",
    provider: null,
  },
  {
    ...imageDefaults,
    id: "flux-pro",
    name: "Flux 2 Pro",
    description: "Sharp composition and editorial detail",
    provider: "replicate",
    resolutions: ["1K", "2K", "1 MP", "2 MP"],
    liveCapabilities: {
      maxQuantity: 1,
      qualities: ["Standard"],
      resolutions: ["1 MP", "2 MP"],
      ratios: ["1:1", "3:4", "4:3", "16:9", "9:16"],
    },
  },
  {
    ...imageDefaults,
    id: "seedream",
    name: "Seedream 5",
    description: "Material-rich product and surreal concepts",
    provider: null,
  },
  {
    ...imageDefaults,
    id: "gpt-image",
    name: "GPT Image 2",
    description: "Precise composition and prompt interpretation",
    provider: "openai",
    maxQuantity: 1,
    maxReferences: 0,
    ratios: ["1:1", "3:4", "4:3", "2:3", "3:2"],
    liveCapabilities: { ratios: ["1:1", "2:3", "3:2"] },
    resolutions: ["1K"],
  },
  {
    ...videoDefaults,
    id: "hailuo",
    name: "Hailuo video-01",
    description: "Six-second video via Replicate and MiniMax",
    provider: "replicate",
    ratios: ["16:9"],
    qualities: ["Standard"],
    resolutions: ["720p"],
    durations: [6],
  },
  {
    ...videoDefaults,
    id: "seedance",
    name: "Seedance 2",
    description: "Continuous camera motion studies",
    provider: null,
  },
  {
    ...videoDefaults,
    id: "veo",
    name: "Veo 3.1",
    description: "Cinematic light and directed movement",
    provider: null,
  },
  {
    ...videoDefaults,
    id: "kling",
    name: "Kling 3",
    description: "Controlled reference-led motion",
    provider: null,
  },
];

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

export function getStudioModel(
  id: string,
  execution: "guided" | "live" = "guided",
) {
  const model = studioModels.find((model) => model.id === id);
  return model && execution === "live"
    ? { ...model, ...model.liveCapabilities }
    : model;
}
