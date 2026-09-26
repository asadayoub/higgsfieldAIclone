import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  secret: vi.fn(),
  approve: vi.fn(),
  submitImage: vi.fn(),
  submitVideo: vi.fn(),
  pollVideo: vi.fn(),
  retrieve: vi.fn(),
}));
vi.mock("@/config/env", () => ({
  readServerEnv: () => ({
    OPENROUTER_SYSTEM_API_KEY: "system-secret",
    OPENROUTER_SYSTEM_DAILY_JOB_LIMIT: 30,
  }),
}));
vi.mock("@/server/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.admin,
}));
vi.mock("@/server/providers/connections", () => ({
  getProviderConnectionSecret: mocks.secret,
}));
vi.mock("@/server/providers/openrouter-catalog", () => ({
  approveOpenRouterRecipe: mocks.approve,
}));
vi.mock("@/server/providers/registry", () => ({
  getLiveProvider: () => ({
    submitImage: mocks.submitImage,
    submitVideo: mocks.submitVideo,
    pollVideo: mocks.pollVideo,
  }),
}));
vi.mock("@/server/providers/media", () => ({
  retrieveOutput: mocks.retrieve,
}));

import { getRun, refreshRun, submitRun } from "@/server/generation/service";
import { ProviderFailure } from "@/server/providers/live";
import { publicGenerationError } from "@/lib/security/public-error";
import { boundedText } from "@/lib/security/bounded-body";

type Row = Record<string, unknown>;
const owner = "00000000-0000-4000-8000-000000000001";
const stranger = "00000000-0000-4000-8000-000000000002";
const imageId = "00000000-0000-4000-8000-000000000003";
const videoId = "00000000-0000-4000-8000-000000000004";
const png = new Uint8Array(24);
png.set([137, 80, 78, 71, 13, 10, 26, 10]);
new DataView(png.buffer).setUint32(16, 512);
new DataView(png.buffer).setUint32(20, 512);

const imageInput = {
  id: imageId,
  configuration: {
    media: "image" as const,
    execution: "live" as const,
    modelId: "openai/gpt-image-1-mini",
    prompt: "A cobalt vessel",
    preset: "None",
    ratio: "1:1",
    quality: "Standard",
    resolution: "Provider default",
    quantity: 1,
    duration: 0,
    referenceCount: 0,
  },
  referencePaths: [],
  fundingSource: "system_free" as const,
  confirmedAllowance: true,
  confirmedExternalCost: false,
};

let tables: Record<string, Row[]>;
let uploads: string[];

class Query implements PromiseLike<{
  data: Row[];
  error: null;
  count: number;
}> {
  private filters: ((row: Row) => boolean)[] = [];
  private operation: "select" | "update" | "insert" | "upsert" = "select";
  private values: Row = {};
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
      const existing =
        this.operation === "upsert" && this.table === "assets"
          ? rows.find(
              (row) =>
                row.generation_id === this.values.generation_id &&
                row.storage_path === this.values.storage_path,
            )
          : undefined;
      if (existing) Object.assign(existing, this.values);
      else
        rows.push({
          id: crypto.randomUUID(),
          is_favorite: false,
          ...this.values,
        });
      selected = existing ? [existing] : [rows.at(-1)!];
    }
    return {
      data: structuredClone(selected),
      error: null,
      count: selected.length,
    };
  }
  async maybeSingle() {
    const result = this.execute();
    return { ...result, data: result.data[0] ?? null };
  }
  then<
    TResult1 = { data: Row[]; error: null; count: number },
    TResult2 = never,
  >(
    onfulfilled?:
      | ((value: {
          data: Row[];
          error: null;
          count: number;
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
    generation_quota_reservations: [],
    generation_events: [],
    assets: [],
    publications: [],
    provider_feature_flags: [
      {
        provider: "openrouter",
        system_image_enabled: true,
        system_video_enabled: true,
        personal_image_enabled: true,
        personal_video_enabled: true,
      },
    ],
  };
  uploads = [];
  vi.clearAllMocks();
  mocks.secret.mockResolvedValue("personal-secret");
  mocks.approve.mockResolvedValue({
    source: "openrouter",
    model: "openai/gpt-image-1-mini",
    media: "image",
  });
  mocks.submitImage.mockResolvedValue({
    status: "complete",
    externalId: "image_external",
    outputs: [{ bytes: png, mime: "image/png" }],
    usage: { cost: 0.01 },
  });
  mocks.submitVideo.mockResolvedValue({
    status: "queued",
    externalId: "video_external",
  });
  mocks.pollVideo.mockResolvedValue({
    status: "complete",
    externalId: "video_external",
    outputs: [
      {
        source: "openrouter",
        url: "https://openrouter.ai/api/v1/videos/video_external/content?index=0",
      },
    ],
    usage: { cost: 0.04 },
  });
  mocks.retrieve.mockImplementation(async (_output, _secret, media) =>
    media === "image"
      ? { bytes: png, mime: "image/png", extension: "png" }
      : {
          bytes: new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]),
          mime: "video/mp4",
          extension: "mp4",
        },
  );
  mocks.admin.mockReturnValue({
    from: (table: string) => new Query(table),
    rpc: async (name: string, args: Row) => {
      const jobs = tables.generation_jobs!;
      if (name === "reserve_openrouter_generation") {
        let job = jobs.find((item) => item.id === args.p_id);
        if (!job) {
          job = {
            id: args.p_id,
            owner_id: args.p_owner,
            provider: "openrouter",
            model: args.p_model,
            media_type: args.p_media,
            prompt: args.p_prompt,
            settings: args.p_settings,
            status: "queued",
            external_id: null,
            error_code: null,
            funding_source: args.p_funding_source,
            quota_date:
              args.p_funding_source === "system_free" ? "2026-09-26" : null,
            quota_state:
              args.p_funding_source === "system_free" ? "reserved" : null,
            resolved_model: args.p_model,
            endpoint_tag:
              args.p_media === "image"
                ? "openrouter.images.create"
                : "openrouter.videos.create",
            actual_cost_usd: null,
            usage: null,
            capability_snapshot: args.p_capability_snapshot,
            reconciliation_code: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          jobs.push(job);
          if (args.p_funding_source === "system_free")
            tables.generation_quota_reservations!.push({
              generation_id: args.p_id,
              owner_id: args.p_owner,
              quota_date: "2026-09-26",
              state: "reserved",
            });
        }
        return { data: [structuredClone(job)], error: null };
      }
      const reservation = tables.generation_quota_reservations!.find(
        (item) =>
          item.generation_id === args.p_generation &&
          item.owner_id === args.p_owner,
      );
      if (reservation) {
        reservation.state =
          name === "consume_generation_quota" ? "consumed" : "released";
        const job = jobs.find((item) => item.id === args.p_generation);
        if (job) job.quota_state = reservation.state;
      }
      return { data: true, error: null };
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string) => {
          uploads.push(`${bucket}/${path}`);
          return { error: null };
        },
        download: async () => ({ data: null, error: null }),
        createSignedUrls: async (paths: string[]) => ({
          data: paths.map((path) => ({
            path,
            signedUrl: `https://storage.test/${bucket}/${path}`,
          })),
          error: null,
        }),
      }),
    },
  });
});

afterEach(() => vi.restoreAllMocks());

describe("OpenRouter generation service", () => {
  it("consumes one free slot, saves privately, and reuses a duplicate UUID", async () => {
    const result = await submitRun(owner, true, imageInput);
    expect(result.status).toBe("complete");
    expect(result.fundingSource).toBe("system_free");
    expect(result.actualCostUsd).toBe(0.01);
    expect(result.allowance?.remaining).toBe(2);
    expect(uploads[0]).toContain(
      `generation-private/users/${owner}/${imageId}`,
    );
    expect(tables.generation_quota_reservations![0]?.state).toBe("consumed");
    await submitRun(owner, true, imageInput);
    expect(mocks.submitImage).toHaveBeenCalledTimes(1);
  });

  it("releases a definite rejection but consumes an ambiguous submission", async () => {
    mocks.submitImage.mockRejectedValueOnce(
      new ProviderFailure("provider_rejected"),
    );
    expect((await submitRun(owner, true, imageInput)).status).toBe("failed");
    expect(tables.generation_quota_reservations![0]?.state).toBe("released");

    const second = { ...imageInput, id: crypto.randomUUID() };
    mocks.submitImage.mockRejectedValueOnce(
      new Error("private transport detail"),
    );
    const ambiguous = await submitRun(owner, true, second);
    expect(ambiguous.status).toBe("failed");
    expect(ambiguous.error).toContain("could not be confirmed");
    expect(tables.generation_quota_reservations![1]?.state).toBe("consumed");
    expect(tables.generation_jobs![1]?.reconciliation_code).toBe(
      "submission_review",
    );
  });

  it("releases payment failures and returns a safe funding message", async () => {
    mocks.submitImage.mockRejectedValueOnce(
      new ProviderFailure("payment_required"),
    );
    const result = await submitRun(owner, true, imageInput);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("no available credits");
    expect(tables.generation_quota_reservations![0]?.state).toBe("released");
    expect(result.allowance?.remaining).toBe(3);
  });

  it("uses only the personal key and leaves the free allowance unchanged", async () => {
    const personal = {
      ...imageInput,
      id: crypto.randomUUID(),
      fundingSource: "personal_key" as const,
      confirmedAllowance: false,
      confirmedExternalCost: true,
    };
    const result = await submitRun(owner, true, personal);
    expect(result.fundingSource).toBe("personal_key");
    expect(mocks.secret).toHaveBeenCalledWith(owner, "openrouter");
    expect(tables.generation_quota_reservations).toHaveLength(0);
    expect(result.allowance?.remaining).toBe(3);
  });

  it("blocks disabled execution and cross-owner references before submission", async () => {
    tables.provider_feature_flags![0]!.system_image_enabled = false;
    await expect(submitRun(owner, true, imageInput)).rejects.toThrow(
      "disabled",
    );
    expect(mocks.submitImage).not.toHaveBeenCalled();

    tables.provider_feature_flags![0]!.system_image_enabled = true;
    await expect(
      submitRun(owner, true, {
        ...imageInput,
        configuration: { ...imageInput.configuration, referenceCount: 1 },
        referencePaths: [`users/${stranger}/reference.png`],
      }),
    ).rejects.toThrow("Reference unavailable");
    expect(mocks.submitImage).not.toHaveBeenCalled();
  });

  it("persists a video identity, resumes polling, and ingests without resubmission", async () => {
    const input = {
      ...imageInput,
      id: videoId,
      configuration: {
        ...imageInput.configuration,
        media: "video" as const,
        modelId: "bytedance/seedance-2.0-mini",
        ratio: "16:9",
        resolution: "480p",
        duration: 4,
      },
    };
    mocks.approve.mockResolvedValueOnce({
      source: "openrouter",
      model: "bytedance/seedance-2.0-mini",
      media: "video",
    });
    expect((await submitRun(owner, true, input)).status).toBe("queued");
    const job = tables.generation_jobs![0]!;
    expect(job.external_id).toBe("video_external");
    job.updated_at = new Date(Date.now() - 5000).toISOString();
    const result = await refreshRun(owner, videoId);
    expect(result.status).toBe("complete");
    expect(mocks.pollVideo).toHaveBeenCalledWith("video_external");
    expect(mocks.submitVideo).toHaveBeenCalledTimes(1);
    expect(mocks.retrieve).toHaveBeenCalledWith(
      expect.objectContaining({ source: "openrouter" }),
      "system-secret",
      "video",
    );
  });

  it("does not expose another owner's private run", async () => {
    await submitRun(owner, true, imageInput);
    await expect(getRun(stranger, imageId)).rejects.toThrow("Run unavailable");
  });
});

it("hardens atomic quota functions and client permissions", () => {
  const sql = readFileSync(
    new URL("../drizzle/0004_openrouter_funding.sql", import.meta.url),
    "utf8",
  );
  expect(sql).toContain("pg_advisory_xact_lock");
  expect(sql).toContain("daily_allowance_exhausted");
  expect(sql).toContain("system_daily_limit");
  expect(sql).toContain("from public,anon,authenticated");
  expect(sql).toContain("protect_generation_execution_identity");
});

it("hardens the Hugging Face system credential pool", () => {
  const sql = readFileSync(
    new URL("../drizzle/0005_huggingface_system_pool.sql", import.meta.url),
    "utf8",
  );
  expect(sql).toContain("for update skip locked");
  expect(sql).toContain("system_credential_unavailable");
  expect(sql).toContain("provider_attempt_limit");
  expect(sql).toContain("from public,anon,authenticated");
  expect(sql).toContain("reserve_system_generation");
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
