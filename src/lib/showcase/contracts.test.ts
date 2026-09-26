import { describe, expect, it } from "vitest";
import {
  normalizeShowcaseFilters,
  showcasePublicationSchema,
} from "./contracts";

describe("public showcase contracts", () => {
  it("requires complete public metadata only for discoverable listings", () => {
    expect(
      showcasePublicationSchema.safeParse({
        confirmed: true,
        listInShowcase: false,
      }).success,
    ).toBe(true);
    expect(
      showcasePublicationSchema.safeParse({
        confirmed: true,
        listInShowcase: true,
        title: "",
        category: "",
        alt: "",
      }).success,
    ).toBe(false);
    expect(
      showcasePublicationSchema.safeParse({
        confirmed: true,
        listInShowcase: true,
        title: "Glass signal",
        category: "graphic",
        alt: "A reflective glass letterform on a black stage.",
      }).success,
    ).toBe(true);
  });

  it("normalizes invalid public filters without widening values", () => {
    expect(
      normalizeShowcaseFilters({
        q: " cobalt ",
        type: "executable",
        category: "private",
      }),
    ).toEqual({ q: "", type: "all", category: "all" });
  });
});
