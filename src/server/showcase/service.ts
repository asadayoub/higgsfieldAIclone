import "server-only";
import { z } from "zod";
import { creations, type Creation } from "@/content/creations";
import { creationToStudioHref } from "@/lib/discovery/creation-recipe";
import {
  showcaseCategorySchema,
  type ShowcaseFilters,
  type ShowcaseItem,
  type ShowcasePage,
} from "@/lib/showcase/contracts";
import { readServerEnv } from "@/config/env";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const pageSize = 12;
const scanSize = 36;
const allowedExtensions = new Set(["png", "jpg", "jpeg", "webp", "mp4"]);

const cursorSchema = z.discriminatedUnion("phase", [
  z.object({
    version: z.literal(1),
    phase: z.literal("editorial"),
    offset: z.number().int().min(0).max(1000),
  }),
  z.object({
    version: z.literal(1),
    phase: z.literal("community"),
    listedAt: z.iso.datetime().nullable(),
    id: z.uuid().nullable(),
  }),
]);
type ShowcaseCursor = z.infer<typeof cursorSchema>;

type PublicationRow = {
  id: string;
  asset_id: string;
  slug: string;
  public_title: string;
  public_category: string;
  public_alt_text: string;
  showcase_listed_at: string;
};

type AssetRow = {
  id: string;
  generation_id: string;
  storage_bucket: string;
  storage_path: string;
  media_type: string;
};

type JobRow = {
  id: string;
  status: string;
  model: string;
  resolved_model: string | null;
  settings: Record<string, unknown> | null;
};

function encodeCursor(cursor: ShowcaseCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value?: string | null): ShowcaseCursor {
  if (!value) return { version: 1, phase: "editorial", offset: 0 } as const;
  if (value.length > 1000) throw new Error("Invalid showcase cursor.");
  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
  } catch {
    throw new Error("Invalid showcase cursor.");
  }
}

function editorialItem(creation: Creation, index: number): ShowcaseItem {
  return {
    id: `editorial:${creation.id}`,
    slug: creation.id,
    title: creation.title,
    category: creation.category,
    media: creation.type,
    publicUrl: creation.src,
    alt: `${creation.title}, an original ${creation.category} ${creation.type} study`,
    width: creation.width,
    height: creation.height,
    ratio: creation.ratio,
    modelLabel: creation.model,
    publishedAt: new Date(
      Date.UTC(2026, 7, Math.max(1, 31 - index), 12),
    ).toISOString(),
    source: "editorial",
    detailHref: `/creation/${encodeURIComponent(creation.id)}`,
    recreateHref: creationToStudioHref(creation),
  };
}

function filteredEditorial(filters: ShowcaseFilters) {
  const query = filters.q.toLowerCase();
  return creations
    .filter((creation) => {
      if (filters.type !== "all" && creation.type !== filters.type)
        return false;
      if (filters.category !== "all" && creation.category !== filters.category)
        return false;
      if (!query) return true;
      return [
        creation.title,
        creation.author,
        creation.category,
        creation.model,
        creation.preset,
        creation.prompt,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .map(editorialItem);
}

function ratioDimensions(value: unknown) {
  const ratio = typeof value === "string" ? value : "1:1";
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(ratio);
  if (!match) return { ratio: "1:1", width: 1200, height: 1200 };
  const horizontal = Number(match[1]);
  const vertical = Number(match[2]);
  if (!horizontal || !vertical)
    return { ratio: "1:1", width: 1200, height: 1200 };
  return {
    ratio,
    width: 1200,
    height: Math.max(320, Math.round((1200 * vertical) / horizontal)),
  };
}

function safeSearchTerm(value: string) {
  return value
    .replace(/[%_,().]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function hydrateCommunityRows(
  rows: PublicationRow[],
  filters: ShowcaseFilters,
) {
  if (!rows.length) return [];
  const db = createSupabaseAdminClient();
  const { data: assets, error: assetError } = await db
    .from("assets")
    .select("id,generation_id,storage_bucket,storage_path,media_type")
    .in(
      "id",
      rows.map((row) => row.asset_id),
    );
  if (assetError) throw new Error("Public showcase assets are unavailable.");
  const safeAssets = (assets ?? []) as AssetRow[];
  const { data: jobs, error: jobError } = safeAssets.length
    ? await db
        .from("generation_jobs")
        .select("id,status,model,resolved_model,settings")
        .in(
          "id",
          safeAssets.map((asset) => asset.generation_id),
        )
    : { data: [], error: null };
  if (jobError) throw new Error("Public showcase metadata is unavailable.");
  const assetMap = new Map(safeAssets.map((asset) => [asset.id, asset]));
  const jobMap = new Map(
    ((jobs ?? []) as JobRow[]).map((job) => [job.id, job]),
  );
  const output: Array<{ item: ShowcaseItem; row: PublicationRow }> = [];
  for (const row of rows) {
    const asset = assetMap.get(row.asset_id);
    const job = asset ? jobMap.get(asset.generation_id) : undefined;
    const category = showcaseCategorySchema.safeParse(row.public_category);
    const media = asset?.media_type;
    if (
      !asset ||
      !job ||
      job.status !== "complete" ||
      asset.storage_bucket !== "generation-private" ||
      !category.success ||
      (media !== "image" && media !== "video") ||
      (filters.type !== "all" && media !== filters.type)
    )
      continue;
    const extension = asset.storage_path.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExtensions.has(extension)) continue;
    const dimensions = ratioDimensions(job.settings?.ratio);
    const publicUrl = db.storage
      .from("showcase-public")
      .getPublicUrl(`published/${row.slug}.${extension}`).data.publicUrl;
    output.push({
      row,
      item: {
        id: `community:${row.id}`,
        slug: row.slug,
        title: row.public_title,
        category: category.data,
        media,
        publicUrl,
        alt: row.public_alt_text,
        width: dimensions.width,
        height: dimensions.height,
        ratio: dimensions.ratio,
        modelLabel: (job.resolved_model ?? job.model).slice(0, 100),
        publishedAt: row.showcase_listed_at,
        source: "community",
        detailHref: `/share/${encodeURIComponent(row.slug)}`,
        recreateHref: null,
      },
    });
  }
  return output;
}

async function communityPage(
  filters: ShowcaseFilters,
  start: Extract<ShowcaseCursor, { phase: "community" }>,
  limit: number,
) {
  const db = createSupabaseAdminClient();
  let seek = start.listedAt && start.id ? start : null;
  const found: Array<{ item: ShowcaseItem; row: PublicationRow }> = [];
  let moreRows = true;
  let scans = 0;
  while (found.length <= limit && moreRows && scans < 20) {
    scans += 1;
    let query = db
      .from("publications")
      .select(
        "id,asset_id,slug,public_title,public_category,public_alt_text,showcase_listed_at",
      )
      .eq("is_showcase_listed", true)
      .eq("showcase_status", "visible")
      .is("revoked_at", null)
      .not("showcase_listed_at", "is", null)
      .order("showcase_listed_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(scanSize);
    if (filters.category !== "all")
      query = query.eq("public_category", filters.category);
    const term = safeSearchTerm(filters.q);
    if (term)
      query = query.or(
        `public_title.ilike.%${term}%,public_category.ilike.%${term}%`,
      );
    if (seek)
      query = query.or(
        `showcase_listed_at.lt.${seek.listedAt},and(showcase_listed_at.eq.${seek.listedAt},id.lt.${seek.id})`,
      );
    const { data, error } = await query;
    if (error) throw new Error("Public showcase is temporarily unavailable.");
    const rows = (data ?? []) as PublicationRow[];
    if (!rows.length) {
      moreRows = false;
      break;
    }
    const last = rows.at(-1)!;
    seek = {
      version: 1,
      phase: "community",
      listedAt: last.showcase_listed_at,
      id: last.id,
    };
    found.push(...(await hydrateCommunityRows(rows, filters)));
    moreRows = rows.length === scanSize;
  }
  const items = found.slice(0, limit);
  const lastReturned = found[Math.min(found.length, limit) - 1]?.row;
  const hasMore = found.length > limit || moreRows;
  return {
    items: items.map(({ item }) => item),
    nextCursor:
      hasMore && lastReturned
        ? encodeCursor({
            version: 1,
            phase: "community",
            listedAt: lastReturned.showcase_listed_at,
            id: lastReturned.id,
          })
        : null,
    hasMore: Boolean(hasMore && lastReturned),
  } satisfies ShowcasePage;
}

export async function listShowcase(input: {
  filters: ShowcaseFilters;
  cursor?: string | null;
}): Promise<ShowcasePage> {
  const cursor = decodeCursor(input.cursor);
  const editorial = filteredEditorial(input.filters);
  const feedEnabled = readServerEnv().SHOWCASE_FEED_ENABLED;
  if (cursor.phase === "editorial") {
    const items = editorial.slice(cursor.offset, cursor.offset + pageSize);
    const nextOffset = cursor.offset + items.length;
    if (nextOffset < editorial.length)
      return {
        items,
        nextCursor: encodeCursor({
          version: 1,
          phase: "editorial",
          offset: nextOffset,
        }),
        hasMore: true,
      };
    if (!feedEnabled) return { items, nextCursor: null, hasMore: false };
    if (items.length === pageSize)
      return {
        items,
        nextCursor: encodeCursor({
          version: 1,
          phase: "community",
          listedAt: null,
          id: null,
        }),
        hasMore: true,
      };
    const community = await communityPage(
      input.filters,
      { version: 1, phase: "community", listedAt: null, id: null },
      pageSize - items.length,
    );
    return {
      items: [...items, ...community.items],
      nextCursor: community.nextCursor,
      hasMore: community.hasMore,
    };
  }
  if (!feedEnabled) return { items: [], nextCursor: null, hasMore: false };
  return communityPage(input.filters, cursor, pageSize);
}

export const showcaseInternals = {
  decodeCursor,
  encodeCursor,
  filteredEditorial,
};
