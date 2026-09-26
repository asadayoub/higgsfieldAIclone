import { describe, expect, it } from "vitest";
import { creations } from "@/content/creations";
import {
  creationToRecipe,
  parseStudioRecipe,
  recipeToSearchParams,
} from "./creation-recipe";

describe("creation recipes", () => {
  it("round-trips every supported setting from a catalog creation", () => {
    const expected = creationToRecipe(creations[0]!);
    const values = Object.fromEntries(recipeToSearchParams(expected));
    expect(parseStudioRecipe(values)).toEqual({
      recipe: expected,
      notices: [],
    });
  });

  it("uses the catalog as the authority for a known source", () => {
    const parsed = parseStudioRecipe({
      source: "fabric-orbit",
      v: "1",
      prompt: "tampered",
      model: "tampered",
    });
    expect(parsed.recipe).toEqual(creationToRecipe(creations[0]!));
  });

  it("maps a retired model to its supported successor", () => {
    const parsed = parseStudioRecipe({
      v: "1",
      mode: "image",
      prompt: "A restrained editorial frame",
      model: "Luma Image Beta",
      preset: "Noir Frame",
      ratio: "3:4",
    });
    expect(parsed.recipe?.model).toBe("GPT Image 1 Mini");
    expect(parsed.notices).toEqual([
      "Luma Image Beta was updated to GPT Image 1 Mini.",
    ]);
  });

  it("rejects unsupported versions and malformed settings", () => {
    expect(parseStudioRecipe({ v: "9" }).recipe).toBeNull();
    expect(
      parseStudioRecipe({
        v: "1",
        mode: "video",
        prompt: "test",
        model: "unknown",
        preset: "test",
        ratio: "99:1",
      }).recipe,
    ).toBeNull();
  });
});
