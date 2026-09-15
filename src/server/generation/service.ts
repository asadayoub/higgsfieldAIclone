import "server-only";
import { z } from "zod";
import { getStudioModel } from "@/content/studio-models";
import {
  configurationSchema,
  submissionSchema,
  runErrors,
  type RunRecord,
} from "@/lib/generation/contracts";
import { isOwnedPrivatePath, privateObjectPath } from "@/lib/storage/paths";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { getProviderConnectionSecret } from "@/server/providers/connections";
import {
  ProviderFailure,
  type LiveOutput,
  type LiveUpdate,
} from "@/server/providers/live";
import { getLiveProvider } from "@/server/providers/registry";
import { retrieveOutput } from "@/server/providers/media";
import {
  referenceDimensions,
  validateReferenceMetadata,
  type StudioConfiguration,
} from "@/lib/studio/validation";

type JobRow = {
  id: string;
  owner_id: string;
  provider: "openai" | "replicate";
  model: string;
  media_type: "image" | "video";
  prompt: string;
  settings: Record<string, unknown>;
  status: RunRecord["status"];
  external_id: string | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
};
const jobFields =
  "id,owner_id,provider,model,media_type,prompt,settings,status,external_id,error_code,created_at,updated_at";
function configuration(job: JobRow): StudioConfiguration {
  return configurationSchema.parse(job.settings);
}
async function ownedJob(owner: string, id: string): Promise<JobRow> {
  z.uuid().parse(id);
  const { data, error } = await createSupabaseAdminClient()
    .from("generation_jobs")
    .select(jobFields)
    .eq("owner_id", owner)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new Error("Run unavailable.");
  return data as JobRow;
}
async function updateJob(job: JobRow, values: Record<string, unknown>) {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("generation_jobs")
    .update(values)
    .eq("id", job.id)
    .eq("owner_id", job.owner_id)
    .in("status", ["queued", "processing"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Could not update this run.");
  if (!data || !("status" in values || "error_code" in values)) return;
  await db.from("generation_events").insert({
    generation_id: job.id,
    owner_id: job.owner_id,
    status: values.status ?? job.status,
    error_code: values.error_code ?? null,
    metadata: { provider: job.provider },
  });
}
async function ingest(job: JobRow, outputs: LiveOutput[], secret: string) {
  const db = createSupabaseAdminClient();
  const output = outputs[0];
  if (!output) throw new ProviderFailure("output_unavailable");
  const result = await retrieveOutput(output, secret, job.media_type);
  const path = privateObjectPath(
    job.owner_id,
    job.id,
    `result.${result.extension}`,
  );
  const { error: uploadError } = await db.storage
    .from("generation-private")
    .upload(path, result.bytes, { contentType: result.mime, upsert: true });
  if (uploadError) throw new ProviderFailure("output_unavailable");
  const { error } = await db.from("assets").upsert(
    {
      owner_id: job.owner_id,
      generation_id: job.id,
      storage_bucket: "generation-private",
      storage_path: path,
      media_type: job.media_type,
      visibility: "private",
    },
    { onConflict: "generation_id,storage_path" },
  );
  if (error) throw new ProviderFailure("output_unavailable");
  await updateJob(job, { status: "complete", error_code: null });
}
async function consume(job: JobRow, update: LiveUpdate, secret: string) {
  if (update.status === "complete") {
    await updateJob(job, {
      external_id: update.externalId,
      status: "processing",
    });
    try {
      await ingest(job, update.outputs ?? [], secret);
    } catch {
      await updateJob(job, {
        status: "processing",
        error_code: "output_unavailable",
      });
    }
  } else
    await updateJob(job, {
      external_id: update.externalId,
      status: update.status,
      error_code: update.status === "failed" ? "provider_failed" : null,
    });
}

export async function submitRun(
  owner: string,
  raw: unknown,
): Promise<RunRecord> {
  const input = submissionSchema.parse(raw);
  const c = input.configuration;
  const model = getStudioModel(c.modelId)!;
  const provider = model.provider!;
  const db = createSupabaseAdminClient();
  // Idempotent retries read the original job even if a flag/key was disabled later.
  const { data: existing } = await db
    .from("generation_jobs")
    .select(jobFields)
    .eq("id", input.id)
    .eq("owner_id", owner)
    .maybeSingle();
  if (existing) {
    if (
      JSON.stringify(configuration(existing as JobRow)) !== JSON.stringify(c) ||
      existing.settings.referencePaths !== JSON.stringify(input.referencePaths)
    )
      throw new Error("This run identity belongs to another recipe.");
    return getRun(owner, input.id);
  }
  const { data: flag, error: flagError } = await db
    .from("provider_feature_flags")
    .select("image_enabled,video_enabled")
    .eq("provider", provider)
    .maybeSingle();
  if (
    flagError ||
    !flag ||
    !(c.media === "image" ? flag.image_enabled : flag.video_enabled)
  )
    throw new Error(
      "This live provider is disabled. A superadmin can enable it in provider settings.",
    );
  const secret = await getProviderConnectionSecret(owner, provider);
  if (!secret) throw new Error("Connect a valid provider key before running.");
  const referenceUrls: string[] = [];
  for (const path of input.referencePaths) {
    if (!isOwnedPrivatePath(owner, path))
      throw new Error("Reference unavailable.");
    const { data: file, error: readError } = await db.storage
      .from("reference-private")
      .download(path);
    if (readError || !file || validateReferenceMetadata(file.type, file.size))
      throw new Error("Reference unavailable.");
    const dimensions = referenceDimensions(
      new Uint8Array(await file.arrayBuffer()),
      file.type,
    );
    if (
      !dimensions ||
      validateReferenceMetadata(
        file.type,
        file.size,
        dimensions.width,
        dimensions.height,
      )
    )
      throw new Error("Reference unavailable.");
    if (
      c.modelId === "hailuo" &&
      Math.abs(dimensions.width / dimensions.height - 16 / 9) > 0.02
    )
      throw new Error("Use a 16:9 reference for this Hailuo workflow.");
    const { data, error } = await db.storage
      .from("reference-private")
      .createSignedUrl(path, 900);
    if (error || !data) throw new Error("Reference unavailable.");
    referenceUrls.push(data.signedUrl);
  }
  const settings = {
    ...c,
    referencePaths: JSON.stringify(input.referencePaths),
  };
  const { data: reserved, error } = await db.rpc("reserve_generation", {
    p_id: input.id,
    p_owner: owner,
    p_provider: provider,
    p_model: c.modelId,
    p_media: c.media,
    p_prompt: c.prompt,
    p_settings: settings,
  });
  if (error)
    throw new Error(
      "Could not reserve this run. Check the database migration and the limit of 10 runs/hour and 3 active runs.",
    );
  const job = reserved?.[0] as JobRow | undefined;
  if (
    !job ||
    JSON.stringify(configuration(job)) !== JSON.stringify(c) ||
    job.settings.referencePaths !== JSON.stringify(input.referencePaths)
  )
    throw new Error("Run identity unavailable.");
  const { data: claim, error: claimError } = await db
    .from("generation_jobs")
    .update({ status: "processing" })
    .eq("id", job.id)
    .eq("owner_id", owner)
    .eq("status", "queued")
    .is("external_id", null)
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error("Could not claim this run.");
  if (!claim) return getRun(owner, job.id);
  try {
    if (provider === "openai")
      await ingest(
        job,
        await getLiveProvider("openai", secret).submit(c),
        secret,
      );
    else
      await consume(
        job,
        await getLiveProvider("replicate", secret).submit(c, referenceUrls),
        secret,
      );
  } catch (error) {
    await updateJob(job, {
      status: "failed",
      error_code:
        error instanceof ProviderFailure ? error.code : "submission_unknown",
    });
  }
  return getRun(owner, job.id);
}

async function recordsForJobs(
  owner: string,
  jobs: JobRow[],
): Promise<RunRecord[]> {
  if (!jobs.length) return [];
  const db = createSupabaseAdminClient();
  const { data: assets, error } = await db
    .from("assets")
    .select(
      "id,generation_id,storage_bucket,storage_path,media_type,is_favorite",
    )
    .eq("owner_id", owner)
    .in(
      "generation_id",
      jobs.map((job) => job.id),
    );
  if (error) throw new Error("Results unavailable.");
  const owned = (assets ?? []).filter(
    (asset) =>
      asset.storage_bucket === "generation-private" &&
      isOwnedPrivatePath(owner, asset.storage_path),
  );
  const { data: signed } = owned.length
    ? await db.storage.from("generation-private").createSignedUrls(
        owned.map((asset) => asset.storage_path),
        600,
      )
    : { data: [] };
  const urls = new Map(
    (signed ?? []).map((item) => [item.path, item.signedUrl]),
  );
  const { data: publications } = owned.length
    ? await db
        .from("publications")
        .select("asset_id,slug")
        .eq("owner_id", owner)
        .in(
          "asset_id",
          owned.map((asset) => asset.id),
        )
        .is("revoked_at", null)
    : { data: [] };
  const slugs = new Map(
    (publications ?? []).map((item) => [item.asset_id, item.slug]),
  );
  return jobs.map((job) => ({
    id: job.id,
    provider: job.provider,
    status: job.status,
    configuration: configuration(job),
    createdAt: job.created_at,
    error:
      job.error_code === "output_unavailable" && job.provider === "openai"
        ? "The image response could not be saved. Check your provider dashboard before starting another paid run."
        : job.error_code
          ? (runErrors[job.error_code] ??
            "Run unavailable. Please reopen this result.")
          : null,
    assets: owned
      .filter((asset) => asset.generation_id === job.id)
      .map((asset) => ({
        id: asset.id,
        url: urls.get(asset.storage_path) ?? "",
        media: asset.media_type as "image" | "video",
        favorite: asset.is_favorite,
        publicSlug: slugs.get(asset.id) ?? null,
      })),
  }));
}

export async function getRun(owner: string, id: string): Promise<RunRecord> {
  return (await recordsForJobs(owner, [await ownedJob(owner, id)]))[0]!;
}

export async function refreshRun(
  owner: string,
  id: string,
): Promise<RunRecord> {
  const job = await ownedJob(owner, id);
  if (!["queued", "processing"].includes(job.status)) return getRun(owner, id);
  const elapsed = Date.now() - Date.parse(job.created_at);
  if (!job.external_id) {
    if (elapsed > 300000)
      await updateJob(job, {
        status: "failed",
        error_code: "submission_unknown",
      });
    return getRun(owner, id);
  }
  if (elapsed > 20 * 60 * 1000) {
    await updateJob(job, { status: "failed", error_code: "timed_out" });
    return getRun(owner, id);
  }
  if (
    typeof job.settings.pollLeaseUntil === "number" &&
    job.settings.pollLeaseUntil > Date.now()
  )
    return getRun(owner, id);
  const db = createSupabaseAdminClient();
  const { data: claim } = await db
    .from("generation_jobs")
    .update({
      updated_at: new Date().toISOString(),
      settings: { ...job.settings, pollLeaseUntil: Date.now() + 90000 },
    })
    .eq("id", id)
    .eq("owner_id", owner)
    .in("status", ["queued", "processing"])
    .lt("updated_at", new Date(Date.now() - 3500).toISOString())
    .eq("updated_at", job.updated_at)
    .select("id")
    .maybeSingle();
  if (!claim) return getRun(owner, id);
  const secret = await getProviderConnectionSecret(owner, job.provider);
  if (!secret) {
    await updateJob(job, { settings: { ...job.settings, pollLeaseUntil: 0 } });
    throw new Error("Reconnect this provider key to retrieve the run.");
  }
  try {
    await consume(
      job,
      await getLiveProvider("replicate", secret).poll(job.external_id),
      secret,
    );
  } catch (error) {
    // Poll errors are recoverable; never create a second provider prediction.
    await updateJob(job, {
      error_code:
        error instanceof ProviderFailure && error.code === "output_unavailable"
          ? "output_unavailable"
          : "provider_failed",
    });
  } finally {
    await updateJob(job, { settings: { ...job.settings, pollLeaseUntil: 0 } });
  }
  return getRun(owner, id);
}

export async function cancelRun(owner: string, id: string): Promise<RunRecord> {
  const job = await ownedJob(owner, id);
  if (!["queued", "processing"].includes(job.status)) return getRun(owner, id);
  if (job.provider !== "replicate" || !job.external_id)
    throw new Error(
      "This submission cannot be cancelled here. Check the provider dashboard.",
    );
  const secret = await getProviderConnectionSecret(owner, job.provider);
  if (!secret)
    throw new Error("Reconnect your provider key to cancel this run.");
  await consume(
    job,
    await getLiveProvider("replicate", secret).cancel(job.external_id),
    secret,
  );
  return getRun(owner, id);
}

export async function listRuns(owner: string): Promise<RunRecord[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("generation_jobs")
    .select(jobFields)
    .eq("owner_id", owner)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("History unavailable.");
  return recordsForJobs(owner, (data ?? []) as JobRow[]);
}

export async function favoriteAsset(
  owner: string,
  id: string,
  favorite: boolean,
) {
  z.uuid().parse(id);
  const { error } = await createSupabaseAdminClient()
    .from("assets")
    .update({ is_favorite: favorite })
    .eq("id", id)
    .eq("owner_id", owner);
  if (error) throw new Error("Could not update favorite.");
}

export async function publishAsset(owner: string, id: string) {
  z.uuid().parse(id);
  const db = createSupabaseAdminClient();
  const { data: asset, error } = await db
    .from("assets")
    .select("generation_id,storage_bucket,storage_path")
    .eq("id", id)
    .eq("owner_id", owner)
    .maybeSingle();
  if (
    error ||
    !asset ||
    asset.storage_bucket !== "generation-private" ||
    !isOwnedPrivatePath(owner, asset.storage_path)
  )
    throw new Error("Asset unavailable.");
  const job = await ownedJob(owner, asset.generation_id);
  if (job.status !== "complete")
    throw new Error("Only completed outputs can be published.");
  const { data: existing } = await db
    .from("publications")
    .select("slug,revoked_at")
    .eq("asset_id", id)
    .eq("owner_id", owner)
    .maybeSingle();
  // Stable identity prevents concurrent publish requests leaving orphan public copies.
  const slug = existing?.slug ?? id;
  const extension = asset.storage_path.split(".").pop()!;
  const { data: file, error: downloadError } = await db.storage
    .from("generation-private")
    .download(asset.storage_path);
  if (downloadError || !file) throw new Error("Asset unavailable.");
  const { error: uploadError } = await db.storage
    .from("showcase-public")
    .upload(`published/${slug}.${extension}`, file, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) throw new Error("Could not publish this asset.");
  const { error: publishError } = await db.from("publications").upsert(
    {
      asset_id: id,
      owner_id: owner,
      slug,
      revoked_at: null,
      published_at: new Date().toISOString(),
    },
    { onConflict: "asset_id" },
  );
  if (publishError) {
    await db.storage
      .from("showcase-public")
      .remove([`published/${slug}.${extension}`]);
    throw new Error("Could not publish this asset.");
  }
  return slug;
}

export async function revokePublication(owner: string, id: string) {
  z.uuid().parse(id);
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("publications")
    .select("slug")
    .eq("asset_id", id)
    .eq("owner_id", owner)
    .maybeSingle();
  if (!data) return;
  const { data: asset } = await db
    .from("assets")
    .select("storage_path")
    .eq("id", id)
    .eq("owner_id", owner)
    .maybeSingle();
  if (!asset || !isOwnedPrivatePath(owner, asset.storage_path))
    throw new Error("Asset unavailable.");
  const extension = asset.storage_path.split(".").pop()!;
  const { error } = await db.storage
    .from("showcase-public")
    .remove([`published/${data.slug}.${extension}`]);
  if (error) throw new Error("Could not remove public media. Try again.");
  const { error: revokeError } = await db
    .from("publications")
    .update({ revoked_at: new Date().toISOString() })
    .eq("asset_id", id)
    .eq("owner_id", owner);
  if (revokeError) throw new Error("Could not disable sharing. Try again.");
}

export async function publicAsset(slug: string) {
  if (!z.uuid().safeParse(slug).success) return null;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("publications")
    .select("asset_id")
    .eq("slug", slug)
    .is("revoked_at", null)
    .maybeSingle();
  if (!data) return null;
  const { data: asset } = await db
    .from("assets")
    .select("storage_path,media_type")
    .eq("id", data.asset_id)
    .maybeSingle();
  if (!asset) return null;
  const extension = asset.storage_path.split(".").pop()!;
  return {
    url: db.storage
      .from("showcase-public")
      .getPublicUrl(`published/${slug}.${extension}`).data.publicUrl,
    media: asset.media_type as "image" | "video",
  };
}
