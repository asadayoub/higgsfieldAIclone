import type { Route } from "next";
import {
  creations,
  type Creation,
  type CreationType,
} from "@/content/creations";

export const studioRecipeVersion = "1";

const supportedRatios = new Set(["1:1", "3:4", "4:3", "14:9", "16:9", "9:16"]);
const supportedModels = new Set(creations.map(({ model }) => model));
const retiredModelAliases: Record<string, string> = {
  "Luma Image Beta": "Luma Image v1",
  "Flux Pro 1.1": "Flux 2 Pro",
  "Veo 3": "Veo 3.1",
};

export type StudioRecipe = {
  version: typeof studioRecipeVersion;
  source?: string;
  mode: CreationType;
  prompt: string;
  model: string;
  preset: string;
  ratio: string;
};

export type ParsedStudioRecipe = {
  recipe: StudioRecipe | null;
  notices: string[];
};

type SearchParamValue = string | string[] | undefined;
type SearchParamRecord = Record<string, SearchParamValue>;

function first(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function findCreation(id: string) {
  return creations.find((creation) => creation.id === id);
}

export function creationToRecipe(creation: Creation): StudioRecipe {
  return {
    version: studioRecipeVersion,
    source: creation.id,
    mode: creation.type,
    prompt: creation.prompt,
    model: creation.model,
    preset: creation.preset,
    ratio: creation.ratio,
  };
}

export function recipeToSearchParams(recipe: StudioRecipe) {
  const params = new URLSearchParams({
    v: recipe.version,
    mode: recipe.mode,
    prompt: recipe.prompt,
    model: recipe.model,
    preset: recipe.preset,
    ratio: recipe.ratio,
  });
  if (recipe.source) params.set("source", recipe.source);
  return params;
}

export function creationToStudioHref(creation: Creation) {
  return `/studio?${recipeToSearchParams(creationToRecipe(creation)).toString()}` as const;
}

export function creationDetailHref(id: string) {
  return `/creation/${encodeURIComponent(id)}` as Route;
}

export function parseStudioRecipe(
  values: SearchParamRecord,
): ParsedStudioRecipe {
  const source = first(values.source)?.slice(0, 80);
  const sourceCreation = source ? findCreation(source) : undefined;
  if (sourceCreation) {
    return { recipe: creationToRecipe(sourceCreation), notices: [] };
  }

  const suppliedVersion = first(values.v);
  if (suppliedVersion !== studioRecipeVersion) {
    return {
      recipe: null,
      notices: suppliedVersion
        ? ["This recipe version is no longer supported."]
        : [],
    };
  }

  const mode = first(values.mode);
  const prompt = first(values.prompt)?.trim().slice(0, 1200) ?? "";
  const rawModel = first(values.model)?.trim().slice(0, 80) ?? "";
  const preset = first(values.preset)?.trim().slice(0, 80) ?? "";
  const ratio = first(values.ratio)?.trim().slice(0, 12) ?? "";
  if ((mode !== "image" && mode !== "video") || !prompt || !preset) {
    return { recipe: null, notices: ["This recipe is incomplete."] };
  }

  const mappedModel = retiredModelAliases[rawModel] ?? rawModel;
  if (!supportedModels.has(mappedModel) || !supportedRatios.has(ratio)) {
    return {
      recipe: null,
      notices: ["This recipe uses settings that are not available."],
    };
  }

  return {
    recipe: {
      version: studioRecipeVersion,
      mode,
      prompt,
      model: mappedModel,
      preset,
      ratio,
    },
    notices:
      mappedModel !== rawModel
        ? [`${rawModel} was updated to ${mappedModel}.`]
        : source
          ? [
              "The original source is unavailable; compatible settings were restored.",
            ]
          : [],
  };
}
