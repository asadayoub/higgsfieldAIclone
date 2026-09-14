import { describe, expect, it } from "vitest";
import { creations } from "@/content/creations";
import {
  filterCreations,
  filtersToSearchParams,
  normalizeDiscoveryFilters,
} from "./filter-creations";

describe("discovery filters", () => {
  it("searches across title, prompt, author, category, model, and preset", () => {
    for (const query of [
      "Fabric Orbit",
      "windswept salt",
      "Noor Objects",
      "architecture",
      "Veo 3.1",
      "Night Passage",
    ]) {
      const filters = normalizeDiscoveryFilters({ q: query });
      expect(filterCreations(creations, filters).length).toBeGreaterThan(0);
    }
  });

  it("requires every search term and composes media and category filters", () => {
    const filters = normalizeDiscoveryFilters({
      q: "soft",
      type: "video",
      category: "fashion",
    });
    expect(filterCreations(creations, filters).map(({ id }) => id)).toEqual([
      "veil-motion",
    ]);
  });

  it("normalizes unknown values and bounds query length", () => {
    expect(
      normalizeDiscoveryFilters({
        q: `  ${"x".repeat(140)}  `,
        type: "audio",
        category: "unknown",
      }),
    ).toEqual({ q: "x".repeat(120), type: "all", category: "all" });
  });

  it("omits defaults and serializes a shareable canonical query", () => {
    expect(
      filtersToSearchParams({
        q: "blue hour",
        type: "image",
        category: "architecture",
      }).toString(),
    ).toBe("q=blue+hour&type=image&category=architecture");
    expect(
      filtersToSearchParams({ q: "", type: "all", category: "all" }).toString(),
    ).toBe("");
  });
});
