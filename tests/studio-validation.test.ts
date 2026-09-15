import { describe, expect, it } from "vitest";
import {
  referenceDimensions,
  validateReferenceMetadata,
  validateStudioConfiguration,
  type StudioConfiguration,
} from "@/lib/studio/validation";

const config: StudioConfiguration = {
  media: "image",
  execution: "guided",
  modelId: "luma-image",
  prompt: "A quiet cinematic frame",
  preset: "None",
  ratio: "1:1",
  quality: "Standard",
  resolution: "1K",
  quantity: 1,
  duration: 0,
  referenceCount: 0,
};
describe("studio capabilities", () => {
  it("accepts a compatible configuration", () =>
    expect(validateStudioConfiguration(config)).toEqual([]));
  it("rejects incompatible media, ratios, live models, and reference counts", () => {
    expect(
      validateStudioConfiguration({ ...config, media: "video" }),
    ).not.toEqual([]);
    expect(
      validateStudioConfiguration({
        ...config,
        ratio: "99:1",
        execution: "live",
        referenceCount: 8,
      }),
    ).toHaveLength(3);
  });
  it("rejects empty prompts and unsupported quantities", () =>
    expect(
      validateStudioConfiguration({ ...config, prompt: " ", quantity: 99 }),
    ).toHaveLength(2));
});
describe("reference validation", () => {
  it("rejects unsafe types, large files, and invalid dimensions", () => {
    expect(validateReferenceMetadata("image/svg+xml", 100)).not.toBeNull();
    expect(
      validateReferenceMetadata("image/png", 5 * 1024 * 1024),
    ).not.toBeNull();
    expect(validateReferenceMetadata("image/png", 100, 20, 20)).not.toBeNull();
  });
  it("reads PNG dimensions only with a matching signature", () => {
    const bytes = new Uint8Array(24);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, 512);
    view.setUint32(20, 768);
    expect(referenceDimensions(bytes, "image/png")).toEqual({
      width: 512,
      height: 768,
    });
    expect(referenceDimensions(bytes, "image/jpeg")).toBeNull();
  });
});
