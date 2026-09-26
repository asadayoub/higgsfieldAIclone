import { ShowcaseFeed } from "./showcase-feed";
import { normalizeShowcaseFilters } from "@/lib/showcase/contracts";
import { listShowcase, showcaseInternals } from "@/server/showcase/service";

export async function ShowcaseSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const filters = normalizeShowcaseFilters(values);
  let initialError = "";
  let page;
  try {
    page = await listShowcase({ filters });
  } catch {
    initialError =
      "Live community work is temporarily unavailable. Editorial studies are still available.";
    const editorial = showcaseInternals.filteredEditorial(filters).slice(0, 12);
    page = { items: editorial, nextCursor: null, hasMore: false };
  }
  const key = `${filters.q}:${filters.type}:${filters.category}`;
  return (
    <ShowcaseFeed
      key={key}
      initialPage={page}
      filters={filters}
      initialError={initialError}
    />
  );
}
