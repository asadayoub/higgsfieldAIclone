export const generationStatuses = [
  "draft",
  "awaiting_confirmation",
  "queued",
  "processing",
  "complete",
  "failed",
  "cancelled",
] as const;
export type GenerationStatus = (typeof generationStatuses)[number];

const transitions: Record<GenerationStatus, readonly GenerationStatus[]> = {
  draft: ["awaiting_confirmation", "cancelled"],
  awaiting_confirmation: ["queued", "cancelled"],
  queued: ["processing", "failed", "cancelled"],
  processing: ["complete", "failed", "cancelled"],
  complete: [],
  failed: ["queued"],
  cancelled: [],
};

export function canTransition(
  from: GenerationStatus,
  to: GenerationStatus,
): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(
  from: GenerationStatus,
  to: GenerationStatus,
): void {
  if (!canTransition(from, to))
    throw new Error(`Invalid generation transition: ${from} -> ${to}`);
}
