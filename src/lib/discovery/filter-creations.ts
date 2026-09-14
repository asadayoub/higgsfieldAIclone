import {
  creationCategories,
  creationTypes,
  type Creation,
  type CreationCategory,
} from "@/content/creations";

export type DiscoveryFilters = {
  q: string;
  type: (typeof creationTypes)[number];
  category: "all" | CreationCategory;
};

export const defaultDiscoveryFilters: DiscoveryFilters = {
  q: "",
  type: "all",
  category: "all",
};

function searchableText(creation: Creation) {
  return [
    creation.title,
    creation.prompt,
    creation.author,
    creation.category,
    creation.model,
    creation.preset,
  ]
    .join(" ")
    .toLocaleLowerCase();
}

export function normalizeDiscoveryFilters(
  values: Partial<Record<keyof DiscoveryFilters, string | null | undefined>>,
): DiscoveryFilters {
  const type = creationTypes.includes(values.type as DiscoveryFilters["type"])
    ? (values.type as DiscoveryFilters["type"])
    : "all";
  const category = creationCategories.includes(
    values.category as CreationCategory,
  )
    ? (values.category as CreationCategory)
    : "all";

  return {
    q: values.q?.trim().slice(0, 120) ?? "",
    type,
    category,
  };
}

export function filterCreations(
  catalog: readonly Creation[],
  filters: DiscoveryFilters,
) {
  const terms = filters.q.toLocaleLowerCase().split(/\s+/).filter(Boolean);

  return catalog.filter((creation) => {
    if (filters.type !== "all" && creation.type !== filters.type) return false;
    if (filters.category !== "all" && creation.category !== filters.category)
      return false;

    const haystack = searchableText(creation);
    return terms.every((term) => haystack.includes(term));
  });
}

export function filtersToSearchParams(filters: DiscoveryFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.category !== "all") params.set("category", filters.category);
  return params;
}
