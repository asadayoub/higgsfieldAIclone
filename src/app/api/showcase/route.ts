import { normalizeShowcaseFilters } from "@/lib/showcase/contracts";
import { listShowcase } from "@/server/showcase/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = normalizeShowcaseFilters({
    q: url.searchParams.get("q"),
    type: url.searchParams.get("type"),
    category: url.searchParams.get("category"),
  });
  try {
    const page = await listShowcase({
      filters,
      cursor: url.searchParams.get("cursor"),
    });
    return Response.json(page, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    const invalidCursor =
      error instanceof Error && error.message === "Invalid showcase cursor.";
    return Response.json(
      {
        error: invalidCursor
          ? "Invalid showcase cursor."
          : "Public showcase is temporarily unavailable.",
      },
      {
        status: invalidCursor ? 400 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
