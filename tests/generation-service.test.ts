import { beforeEach, describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ admin: vi.fn(), secret: vi.fn() }));
vi.mock("@/server/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.admin,
}));
vi.mock("@/server/providers/connections", () => ({
  getProviderConnectionSecret: mocks.secret,
}));
import {
  submitRun,
  getRun,
  refreshRun,
  publishAsset,
  revokePublication,
  publicAsset,
  cancelRun,
} from "@/server/generation/service";
import { publicGenerationError } from "@/lib/security/public-error";
import { boundedText } from "@/lib/security/bounded-body";
import type { StudioConfiguration } from "@/lib/studio/validation";

type Row = Record<string, unknown>; // Test-only in-memory PostgREST fixture.
const owner = "00000000-0000-4000-8000-000000000001";
const stranger = "00000000-0000-4000-8000-000000000002";
const id = "00000000-0000-4000-8000-000000000003";
const assetId = "00000000-0000-4000-8000-000000000004";
const recipe: StudioConfiguration = {
  media: "image",
  execution: "live",
  modelId: "flux-pro",
  prompt: "A cobalt vessel",
  preset: "None",
  ratio: "1:1",
  quality: "Standard",
  resolution: "1 MP",
  quantity: 1,
  duration: 0,
  referenceCount: 0,
};
const input = {
  id,
  configuration: recipe,
  referencePaths: [],
  confirmedCost: true,
};
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
let tables: Record<string, Row[]>;
let files: Map<string, Blob>;
let transport: ReturnType<typeof vi.fn<typeof fetch>>;
let uploads: string[];
class Query implements PromiseLike<{ data: Row[]; error: null }> {
  private filters: ((row: Row) => boolean)[] = [];
  private operation = "select";
  private values: Row | Row[] = {};
  private maximum = Infinity;
  constructor(private table: string) {}
  select() {
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push((row) => row[key] === value);
    return this;
  }
  is(key: string, value: unknown) {
    this.filters.push((row) => (row[key] ?? null) === value);
    return this;
  }
  in(key: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[key]));
    return this;
  }
  lt(key: string, value: string) {
    this.filters.push((row) => String(row[key]) < value);
    return this;
  }
  order() {
    return this;
  }
  limit(value: number) {
    this.maximum = value;
    return this;
  }
  update(values: Row) {
    this.operation = "update";
    this.values = values;
    return this;
  }
  insert(values: Row) {
    this.operation = "insert";
    this.values = values;
    return this;
  }
  upsert(values: Row) {
    this.operation = "upsert";
    this.values = values;
    return this;
  }
  private execute() {
    const rows = (tables[this.table] ??= []);
    let selected = rows
      .filter((row) => this.filters.every((filter) => filter(row)))
      .slice(0, this.maximum);
    if (this.operation === "update")
      for (const row of selected)
        Object.assign(row, this.values, {
          updated_at: new Date().toISOString(),
        });
    if (this.operation === "insert" || this.operation === "upsert") {
      const value = this.values as Row;
      const existing =
        this.operation === "upsert"
          ? rows.find((row) =>
              this.table === "assets"
                ? row.generation_id === value.generation_id &&
                  row.storage_path === value.storage_path
                : row.asset_id === value.asset_id,
            )
          : undefined;
      if (existing) {
        Object.assign(existing, value);
        selected = [existing];
      } else {
        const row = { id: assetId, is_favorite: false, ...value };
        rows.push(row);
        selected = [row];
      }
    }
    return { data: structuredClone(selected), error: null };
  }
  async maybeSingle() {
    const result = this.execute();
    return { ...result, data: result.data[0] ?? null };
  }
  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: Row[];
          error: null;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}
beforeEach(() => {
  tables = {
    generation_jobs: [],
    assets: [],
    publications: [],
    generation_events: [],
    provider_feature_flags: [
      { provider: "replicate", image_enabled: true, video_enabled: true },
      { provider: "openai", image_enabled: true, video_enabled: false },
    ],
  };
  files = new Map();
  uploads = [];
  transport = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", transport);
  mocks.secret.mockResolvedValue("fixture-key");
  mocks.admin.mockReturnValue({
    from: (table: string) => new Query(table),
    rpc: async (_name: string, args: Row) => {
      let job = tables.generation_jobs!.find((job) => job.id === args.p_id);
      if (!job) {
        job = {
          id: args.p_id,
          owner_id: args.p_owner,
          provider: args.p_provider,
          model: args.p_model,
          media_type: args.p_media,
          prompt: args.p_prompt,
          settings: args.p_settings,
          status: "queued",
          external_id: null,
          error_code: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        tables.generation_jobs!.push(job);
      }
      return { data: [structuredClone(job)], error: null };
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (
          path: string,
          bytes: Blob | Uint8Array,
          options: { contentType: string },
        ) => {
          uploads.push(`${bucket}/${path}`);
          files.set(
            `${bucket}/${path}`,
            bytes instanceof Blob
              ? bytes
              : new Blob([new Uint8Array(bytes)], {
                  type: options.contentType,
                }),
          );
          return { error: null };
        },
        download: async (path: string) => ({
          data: files.get(`${bucket}/${path}`) ?? null,
          error: null,
        }),
        createSignedUrl: async (path: string) => ({
          data: {
            signedUrl: `https://storage.example.test/${bucket}/${path}?signed=fixture`,
          },
          error: null,
        }),
        createSignedUrls: async (paths: string[]) => ({
          data: paths.map((path) => ({
            path,
            signedUrl: `https://storage.example.test/${bucket}/${path}?signed=fixture`,
          })),
          error: null,
        }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.example.test/${bucket}/${path}` },
        }),
        remove: async (paths: string[]) => {
          for (const path of paths) files.delete(`${bucket}/${path}`);
          return { error: null };
        },
      }),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
function json(body: unknown) {
  return new Response(JSON.stringify(body));
}
describe("generation service with mocked persistence and transport", () => {
  it("recovers an interrupted submission as ambiguous without another paid call", async () => {
    transport.mockResolvedValueOnce(
      json({ id: "prediction_1", status: "processing" }),
    );
    await submitRun(owner, input);
    const job = tables.generation_jobs![0]!;
    job.external_id = null;
    job.status = "processing";
    job.created_at = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const result = await refreshRun(owner, id);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Submission could not be confirmed");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("retries output retrieval, not generation, after an ingestion failure", async () => {
    transport.mockResolvedValueOnce(
      json({ id: "prediction_1", status: "starting" }),
    );
    await submitRun(owner, input);
    tables.generation_jobs![0]!.updated_at = new Date(
      Date.now() - 5000,
    ).toISOString();
    transport.mockResolvedValueOnce(
      json({
        id: "prediction_1",
        status: "succeeded",
        output: "https://unapproved.test/result.png",
      }),
    );
    const failed = await refreshRun(owner, id);
    expect(failed.status).toBe("processing");
    expect(failed.error).toContain("retry retrieval");
    tables.generation_jobs![0]!.updated_at = new Date(
      Date.now() - 5000,
    ).toISOString();
    transport
      .mockResolvedValueOnce(
        json({
          id: "prediction_1",
          status: "succeeded",
          output: "https://replicate.delivery/result.png",
        }),
      )
      .mockResolvedValueOnce(
        new Response(png, { headers: { "Content-Type": "image/png" } }),
      );
    expect((await refreshRun(owner, id)).status).toBe("complete");
    expect(
      transport.mock.calls.filter((call) => call[1]?.method === "POST"),
    ).toHaveLength(1);
  });
  it("bounds stale external jobs and honors another poller's lease", async () => {
    transport.mockResolvedValueOnce(
      json({ id: "prediction_1", status: "processing" }),
    );
    await submitRun(owner, input);
    const job = tables.generation_jobs![0]!;
    const settings = job.settings as Record<string, unknown>;
    settings.pollLeaseUntil = Date.now() + 60000;
    job.updated_at = new Date(Date.now() - 5000).toISOString();
    await refreshRun(owner, id);
    expect(transport).toHaveBeenCalledTimes(1);
    job.created_at = new Date(Date.now() - 21 * 60 * 1000).toISOString();
    expect((await refreshRun(owner, id)).status).toBe("failed");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("submits once, resumes polling and ingests an owner-only private output", async () => {
    transport.mockResolvedValueOnce(
      json({ id: "prediction_1", status: "starting" }),
    );
    expect((await submitRun(owner, input)).status).toBe("queued");
    await submitRun(owner, input);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(tables.generation_jobs).toHaveLength(1);
    tables.generation_jobs![0]!.updated_at = new Date(
      Date.now() - 5000,
    ).toISOString();
    transport
      .mockResolvedValueOnce(
        json({
          id: "prediction_1",
          status: "succeeded",
          output: "https://replicate.delivery/result.png",
        }),
      )
      .mockResolvedValueOnce(
        new Response(png, { headers: { "Content-Type": "image/png" } }),
      );
    const result = await refreshRun(owner, id);
    expect(result.status).toBe("complete");
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]?.url).toContain("generation-private");
    expect(JSON.stringify(result)).not.toContain("replicate.delivery");
    expect(JSON.stringify(result)).not.toContain("fixture-key");
    await expect(getRun(stranger, id)).rejects.toThrow("Run unavailable");
    await expect(publishAsset(stranger, assetId)).rejects.toThrow(
      "Asset unavailable",
    );
    expect(uploads).toHaveLength(1);
  });
  it("blocks disabled providers and cross-owner references before a paid call", async () => {
    tables.provider_feature_flags![0]!.image_enabled = false;
    await expect(submitRun(owner, input)).rejects.toThrow("disabled");
    expect(transport).not.toHaveBeenCalled();
    tables.provider_feature_flags![0]!.image_enabled = true;
    await expect(
      submitRun(owner, {
        ...input,
        configuration: { ...recipe, referenceCount: 1 },
        referencePaths: [`users/${stranger}/reference.png`],
      }),
    ).rejects.toThrow("Reference unavailable");
    expect(transport).not.toHaveBeenCalled();
  });
  it("records ambiguous submission and never resubmits it automatically", async () => {
    transport.mockRejectedValueOnce(
      new Error("fixture timeout with sensitive response"),
    );
    const result = await submitRun(owner, input);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("may have incurred charges");
    await submitRun(owner, input);
    await refreshRun(owner, id);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("publishes only a completed output and revokes its public copy", async () => {
    transport
      .mockResolvedValueOnce(
        json({
          id: "prediction_1",
          status: "succeeded",
          output: "https://replicate.delivery/result.png",
        }),
      )
      .mockResolvedValueOnce(
        new Response(png, { headers: { "Content-Type": "image/png" } }),
      );
    await submitRun(owner, input);
    const slug = await publishAsset(owner, assetId);
    const publication = await publicAsset(slug);
    expect(publication?.url).toContain(`showcase-public/published/${slug}.png`);
    expect(publication).not.toHaveProperty("prompt");
    await revokePublication(owner, assetId);
    expect(await publicAsset(slug)).toBeNull();
    expect(files.has(`showcase-public/published/${slug}.png`)).toBe(false);
  });
  it("refuses changing a recipe under an existing identity", async () => {
    transport.mockResolvedValueOnce(
      json({ id: "prediction_1", status: "processing" }),
    );
    await submitRun(owner, input);
    await expect(
      submitRun(owner, {
        ...input,
        configuration: { ...recipe, prompt: "Different" },
      }),
    ).rejects.toThrow("another recipe");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("supports provider cancellation without a new submission", async () => {
    transport
      .mockResolvedValueOnce(json({ id: "prediction_1", status: "processing" }))
      .mockResolvedValueOnce(json({ id: "prediction_1", status: "canceled" }));
    await submitRun(owner, input);
    expect((await cancelRun(owner, id)).status).toBe("cancelled");
    expect(transport.mock.calls[1]?.[0]).toContain("/prediction_1/cancel");
  });
});
it("hardens server mutations and serializes reservations per owner", () => {
  const sql = readFileSync(
    new URL("../drizzle/0003_generation_runtime.sql", import.meta.url),
    "utf8",
  );
  expect(sql).toContain("pg_advisory_xact_lock");
  expect(sql).toContain("from public, anon, authenticated");
  expect(sql).toContain('drop policy if exists "jobs_owner_insert"');
});
it("returns only allowlisted public errors", () => {
  expect(
    publicGenerationError(new Error("private provider response fixture-key")),
  ).not.toContain("fixture-key");
  expect(publicGenerationError(new Error("Run unavailable."))).toBe(
    "Run unavailable.",
  );
});
it("bounds streamed bodies even when content-length is absent", async () => {
  await expect(boundedText(new Response("abcdef"), 3)).rejects.toThrow(
    "body_limit",
  );
  expect(await boundedText(new Response("abc"), 3)).toBe("abc");
});
