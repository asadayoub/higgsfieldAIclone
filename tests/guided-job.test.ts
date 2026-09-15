import { describe, expect, it } from "vitest";
import {
  createGuidedJob,
  readGuidedJob,
  guidedJobUpdate,
  cancelGuidedJob,
  guidedOutputs,
} from "@/lib/generation/guided-job";
import type { StudioConfiguration } from "@/lib/studio/validation";

const recipe: StudioConfiguration = {
  media: "image",
  execution: "guided",
  modelId: "luma-image",
  prompt: "An architectural study",
  preset: "None",
  ratio: "1:1",
  quality: "Standard",
  resolution: "1K",
  quantity: 2,
  duration: 0,
  referenceCount: 0,
};
describe("guided jobs", () => {
  it("snapshots configuration and recovers progress after reload", () => {
    const input = { ...recipe };
    const job = createGuidedJob("job-1", input, 1000);
    input.prompt = "Changed";
    expect(job.configuration.prompt).toBe(recipe.prompt);
    expect(guidedJobUpdate(job, 1100).status).toBe("queued");
    expect(guidedJobUpdate(job, 2500).status).toBe("processing");
    expect(
      guidedJobUpdate(readGuidedJob(JSON.stringify(job), 6000)!, 6000).status,
    ).toBe("complete");
  });
  it("cancels active jobs but never completed outputs", () => {
    const job = createGuidedJob("job-1", recipe, 1000);
    expect(guidedJobUpdate(cancelGuidedJob(job, 2000), 7000).status).toBe(
      "cancelled",
    );
    expect(cancelGuidedJob(job, 7000)).toBe(job);
  });
  it("rejects invalid, live, oversized and corrupt records", () => {
    expect(() =>
      createGuidedJob("job-1", { ...recipe, execution: "live" }, 1000),
    ).toThrow();
    expect(readGuidedJob("{", 1000)).toBeNull();
    expect(readGuidedJob("x".repeat(6001), 1000)).toBeNull();
    const job = createGuidedJob("job-1", recipe, 9000);
    expect(readGuidedJob(JSON.stringify(job), 1000)).toBeNull();
    expect(
      readGuidedJob(
        JSON.stringify({ ...job, configuration: { prompt: 42 } }),
        10000,
      ),
    ).toBeNull();
  });
  it("returns deterministic authored assets with the requested count and media", () => {
    const job = createGuidedJob("job-1", recipe, 1000);
    expect(guidedOutputs(job)).toEqual(guidedOutputs({ ...job, id: "retry" }));
    expect(guidedOutputs(job)).toHaveLength(2);
    expect(guidedOutputs(job).every((output) => output.type === "image")).toBe(
      true,
    );
    const video = createGuidedJob(
      "job-2",
      {
        ...recipe,
        media: "video",
        modelId: "seedance",
        ratio: "16:9",
        resolution: "720p",
        quantity: 1,
        duration: 5,
      },
      1000,
    );
    expect(guidedOutputs(video)[0]?.type).toBe("video");
  });
});
