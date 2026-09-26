import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({
  readServerEnv: () => ({ SHOWCASE_FEED_ENABLED: false }),
}));
vi.mock("@/server/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import { listShowcase, showcaseInternals } from "./service";

const filters = { q: "", type: "all", category: "all" } as const;

describe("showcase service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns deterministic editorial bento pages without private fields", async () => {
    const first = await listShowcase({ filters });
    expect(first.items).toHaveLength(12);
    expect(first.hasMore).toBe(true);
    expect(first.items[0]).toMatchObject({
      source: "editorial",
      detailHref: expect.stringMatching(/^\/creation\//),
    });
    expect(JSON.stringify(first)).not.toContain('"prompt"');
    const second = await listShowcase({
      filters,
      cursor: first.nextCursor,
    });
    expect(second.items.length).toBeGreaterThan(0);
    expect(second.hasMore).toBe(false);
    expect(
      new Set([...first.items, ...second.items].map((item) => item.id)).size,
    ).toBe(first.items.length + second.items.length);
  });

  it("rejects malformed opaque cursors", async () => {
    await expect(
      listShowcase({ filters, cursor: "not-a-valid-cursor" }),
    ).rejects.toThrow("Invalid showcase cursor");
  });

  it("composes editorial media, category, and search filters", () => {
    const results = showcaseInternals.filteredEditorial({
      q: "monolith",
      type: "image",
      category: "architecture",
    });
    expect(results.map((item) => item.slug)).toEqual(["monolith-tide"]);
  });
});
