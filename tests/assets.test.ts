import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type ManifestAsset = {
  id: string;
  path: string;
  source: string;
  dimensions: [number, number];
  kind: string;
};

const manifestPath = resolve(process.cwd(), "public/media/asset-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  assets: ManifestAsset[];
};

describe("asset manifest", () => {
  it("references an existing runtime file for every asset", () => {
    for (const asset of manifest.assets) {
      expect(
        existsSync(resolve(process.cwd(), "public", asset.path.slice(1))),
        asset.path,
      ).toBe(true);
    }
  });

  it("has unique identifiers and complete provenance", () => {
    expect(new Set(manifest.assets.map((asset) => asset.id)).size).toBe(
      manifest.assets.length,
    );
    for (const asset of manifest.assets) {
      expect(asset.source.length).toBeGreaterThan(5);
      expect(asset.dimensions[0]).toBeGreaterThan(0);
      expect(asset.dimensions[1]).toBeGreaterThan(0);
    }
  });

  it("contains the complete foundation kit", () => {
    const count = (kind: string) =>
      manifest.assets.filter((asset) => asset.kind === kind).length;
    expect(count("showcase")).toBe(12);
    expect(count("preset")).toBe(6);
    expect(count("video-poster")).toBe(3);
    expect(count("system")).toBeGreaterThanOrEqual(4);
    expect(count("brand")).toBeGreaterThanOrEqual(1);
  });
});
