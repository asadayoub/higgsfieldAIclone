import "server-only";
import { getStudioModel, type FundingSource } from "@/content/studio-models";
import { boundedText } from "@/lib/security/bounded-body";
import type { StudioConfiguration } from "@/lib/studio/validation";
import { ProviderFailure, type Fetcher } from "./live";

type Descriptor =
  | { type: "enum"; values: string[] }
  | { type: "range"; min: number; max: number }
  | { type: "boolean" };
type RemoteImageModel = {
  id?: unknown;
  supported_parameters?: Record<string, Descriptor>;
};
type RemoteVideoModel = {
  id?: unknown;
  supported_aspect_ratios?: unknown;
  supported_resolutions?: unknown;
  supported_durations?: unknown;
  supported_frame_images?: unknown;
};

type CachedCatalog = { expires: number; data: unknown[] };
const cache = new Map<"image" | "video", CachedCatalog>();

async function remoteCatalog(media: "image" | "video", fetcher: Fetcher) {
  const cached = cache.get(media);
  if (cached && cached.expires > Date.now()) return cached.data;
  const response = await fetcher(
    `https://openrouter.ai/api/v1/${media === "image" ? "images" : "videos"}/models`,
    {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new Error("catalog_unavailable");
  const raw = await boundedText(response, 2 * 1024 * 1024);
  const payload = JSON.parse(raw) as { data?: unknown };
  if (!Array.isArray(payload.data)) throw new Error("catalog_invalid");
  cache.set(media, {
    expires: Date.now() + 10 * 60 * 1000,
    data: payload.data,
  });
  return payload.data;
}

function enumSupports(descriptor: Descriptor | undefined, value: string) {
  return (
    !descriptor ||
    descriptor.type !== "enum" ||
    descriptor.values.includes(value)
  );
}

export type CapabilitySnapshot = {
  source: "openrouter" | "reviewed_fallback";
  model: string;
  media: "image" | "video";
  ratio: string;
  quality: string;
  resolution: string;
  duration: number;
  maxReferences: number;
};

export async function approveOpenRouterRecipe(
  configuration: StudioConfiguration,
  fundingSource: FundingSource,
  fetcher: Fetcher = fetch,
): Promise<CapabilitySnapshot> {
  const approved = getStudioModel(configuration.modelId);
  if (
    !approved ||
    approved.provider !== "openrouter" ||
    !approved.fundingSources.includes(fundingSource)
  )
    throw new ProviderFailure("provider_rejected");
  if (
    fundingSource === "system_free" &&
    ((approved.media === "image" && configuration.quality !== "Standard") ||
      (approved.media === "video" &&
        (configuration.resolution !== "480p" || configuration.duration !== 4)))
  )
    throw new ProviderFailure("provider_rejected");

  const fallback: CapabilitySnapshot = {
    source: "reviewed_fallback",
    model: approved.openRouterModel,
    media: approved.media,
    ratio: configuration.ratio,
    quality: configuration.quality,
    resolution: configuration.resolution,
    duration: configuration.duration,
    maxReferences: approved.maxReferences,
  };

  let models: unknown[];
  try {
    models = await remoteCatalog(approved.media, fetcher);
  } catch {
    return fallback;
  }
  const remote = models.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      "id" in candidate &&
      candidate.id === approved.openRouterModel,
  );
  if (!remote) throw new ProviderFailure("provider_rejected");

  if (approved.media === "image") {
    const parameters = (remote as RemoteImageModel).supported_parameters ?? {};
    if (
      !enumSupports(parameters.aspect_ratio, configuration.ratio) ||
      !enumSupports(parameters.resolution, configuration.resolution) ||
      !enumSupports(
        parameters.quality,
        configuration.quality === "High" ? "high" : "medium",
      ) ||
      (parameters.input_references?.type === "range" &&
        configuration.referenceCount > parameters.input_references.max)
    )
      throw new ProviderFailure("provider_rejected");
  } else {
    const video = remote as RemoteVideoModel;
    const ratios = Array.isArray(video.supported_aspect_ratios)
      ? video.supported_aspect_ratios
      : [];
    const resolutions = Array.isArray(video.supported_resolutions)
      ? video.supported_resolutions
      : [];
    const durations = Array.isArray(video.supported_durations)
      ? video.supported_durations
      : [];
    if (
      (ratios.length && !ratios.includes(configuration.ratio)) ||
      (resolutions.length && !resolutions.includes(configuration.resolution)) ||
      (durations.length && !durations.includes(configuration.duration))
    )
      throw new ProviderFailure("provider_rejected");
  }
  return { ...fallback, source: "openrouter" };
}
