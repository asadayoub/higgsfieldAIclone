import { creations } from "@/content/creations";
import {
  validateStudioConfiguration,
  type StudioConfiguration,
} from "@/lib/studio/validation";

export type GuidedJob = {
  version: 1;
  id: string;
  configuration: StudioConfiguration;
  createdAt: number;
  cancelledAt?: number;
};

export function createGuidedJob(
  id: string,
  configuration: StudioConfiguration,
  now: number,
): GuidedJob {
  if (
    configuration.execution !== "guided" ||
    validateStudioConfiguration(configuration).length
  )
    throw new Error("Review a valid guided recipe before running.");
  return {
    version: 1,
    id,
    configuration: { ...configuration },
    createdAt: now,
  };
}

export function readGuidedJob(
  raw: string | null,
  now: number,
): GuidedJob | null {
  if (!raw || raw.length > 6000) return null;
  try {
    const job = JSON.parse(raw) as GuidedJob;
    const c = job.configuration;
    if (
      job.version !== 1 ||
      typeof job.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(job.id) ||
      !Number.isFinite(job.createdAt) ||
      job.createdAt < 0 ||
      job.createdAt > now + 1000 ||
      (job.cancelledAt !== undefined &&
        (!Number.isFinite(job.cancelledAt) ||
          job.cancelledAt < job.createdAt ||
          job.cancelledAt > now + 1000)) ||
      !c ||
      typeof c.prompt !== "string" ||
      typeof c.modelId !== "string" ||
      typeof c.preset !== "string" ||
      typeof c.ratio !== "string" ||
      typeof c.quality !== "string" ||
      typeof c.resolution !== "string" ||
      c.execution !== "guided" ||
      ![c.quantity, c.duration, c.referenceCount].every(Number.isFinite) ||
      validateStudioConfiguration(c).length
    )
      return null;
    // Reconstruct a bounded record; discard arbitrary fields from browser storage.
    return {
      version: 1,
      id: job.id,
      createdAt: job.createdAt,
      configuration: {
        media: c.media,
        execution: "guided",
        modelId: c.modelId,
        prompt: c.prompt,
        preset: c.preset.slice(0, 80),
        ratio: c.ratio,
        quality: c.quality,
        resolution: c.resolution,
        quantity: c.quantity,
        duration: c.duration,
        referenceCount: c.referenceCount,
      },
      ...(job.cancelledAt === undefined
        ? {}
        : { cancelledAt: job.cancelledAt }),
    };
  } catch {
    return null;
  }
}

export function guidedJobUpdate(job: GuidedJob, now: number) {
  const elapsed = Math.max(0, now - job.createdAt);
  if (job.cancelledAt !== undefined)
    return { status: "cancelled" as const, progress: 0 };
  if (elapsed < 900) return { status: "queued" as const, progress: 8 };
  if (elapsed < 4000)
    return {
      status: "processing" as const,
      progress: Math.min(95, Math.round(elapsed / 42)),
    };
  return { status: "complete" as const, progress: 100 };
}

export function cancelGuidedJob(job: GuidedJob, now: number): GuidedJob {
  const status = guidedJobUpdate(job, now).status;
  if (status !== "queued" && status !== "processing") return job;
  return { ...job, cancelledAt: now };
}

export function guidedOutputs(job: GuidedJob) {
  const candidates = creations.filter(
    (creation) => creation.type === job.configuration.media,
  );
  const seed = `${job.configuration.prompt}|${job.configuration.preset}`;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return Array.from(
    { length: job.configuration.quantity },
    (_, index) => candidates[(hash + index) % candidates.length]!,
  );
}
