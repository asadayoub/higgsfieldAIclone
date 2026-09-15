import { z } from "zod";
import type { Route } from "next";
import { getStudioModel } from "@/content/studio-models";
import {
  validateStudioConfiguration,
  type StudioConfiguration,
} from "@/lib/studio/validation";
import type { GenerationStatus } from "./state-machine";

export const configurationSchema = z
  .object({
    media: z.enum(["image", "video"]),
    execution: z.enum(["guided", "live"]),
    modelId: z.string().max(80),
    prompt: z.string().min(1).max(1200),
    preset: z.string().max(80),
    ratio: z.string().max(12),
    quality: z.string().max(20),
    resolution: z.string().max(20),
    quantity: z.number().int().min(1).max(4),
    duration: z.number().int().min(0).max(20),
    referenceCount: z.number().int().min(0).max(3),
  })
  .superRefine((input, ctx) => {
    for (const message of validateStudioConfiguration(input))
      ctx.addIssue({ code: "custom", message });
  });

export const submissionSchema = z
  .object({
    id: z.uuid(),
    configuration: configurationSchema,
    referencePaths: z.array(z.string().max(240)).max(3),
    confirmedCost: z.literal(true),
  })
  .superRefine((input, ctx) => {
    if (
      input.configuration.execution !== "live" ||
      input.referencePaths.length !== input.configuration.referenceCount ||
      new Set(input.referencePaths).size !== input.referencePaths.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Review a live recipe with its selected references.",
      });
  });

export type RunAsset = {
  id: string;
  url: string;
  media: "image" | "video";
  favorite: boolean;
  publicSlug: string | null;
};
export type RunRecord = {
  id: string;
  provider: string;
  status: GenerationStatus;
  configuration: StudioConfiguration;
  createdAt: string;
  error: string | null;
  assets: RunAsset[];
};
export type RunResponse = { run?: RunRecord; error?: string };

export function resultHref(id: string): Route {
  return `/results/${encodeURIComponent(id)}` as Route;
}
export function configurationHref(configuration: StudioConfiguration): Route {
  // Reuse never automatically submits a paid run or carries private reference URLs.
  const params = new URLSearchParams({
    v: "1",
    mode: configuration.media,
    prompt: configuration.prompt,
    model: getStudioModel(configuration.modelId)?.name ?? "",
    preset: configuration.preset,
    ratio: configuration.ratio,
    quality: configuration.quality,
    resolution: configuration.resolution,
    quantity: String(configuration.quantity),
    duration: String(configuration.duration),
  });
  return `/studio?${params}` as Route;
}
export function shareHref(slug: string): Route {
  return `/share/${encodeURIComponent(slug)}` as Route;
}

export const runErrors: Record<string, string> = {
  provider_rejected:
    "The provider rejected this request. Check model access, billing, and the selected settings.",
  provider_failed:
    "The provider could not complete this run. Review your prompt and provider account before trying again.",
  submission_unknown:
    "Submission could not be confirmed. Check your provider dashboard before starting a new run; it may have incurred charges.",
  output_unavailable:
    "The provider finished but its output could not be saved. Reopen this result to retry retrieval without generating again.",
  timed_out:
    "This run exceeded its recovery window. Check the provider dashboard before starting another run.",
};
