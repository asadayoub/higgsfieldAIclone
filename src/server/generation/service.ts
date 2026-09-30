import "server-only";
import { z } from "zod";
import { readServerEnv } from "@/config/env";
import { getStudioModel, type FundingSource } from "@/content/studio-models";
import {
  configurationSchema,
  submissionSchema,
  runErrors,
  type FreeAllowance,
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
  showcasePublicationSchema,
  type ShowcasePublicationInput,
} from "@/lib/showcase/contracts";
import { approveOpenRouterRecipe } from "@/server/providers/openrouter-catalog";
import { approveHuggingFaceRecipe } from "@/server/providers/huggingface-catalog";
import { HuggingFaceProviderFailure } from "@/server/providers/huggingface";
import {
  acquireSystemCredential,
  hasAvailableHuggingFaceCredential,
  readSystemCredentialSecret,
  settleSystemCredential,
} from "@/server/providers/system-credentials";
import {
  referenceDimensions,
  validateReferenceMetadata,
  type StudioConfiguration,
} from "@/lib/studio/validation";

type JobRow = {
  id: string;
  owner_id: string;
  provider: string;
  model: string;
  media_type: "image" | "video";
  prompt: string;
  settings: Record<string, unknown>;
  status: RunRecord["status"];
  external_id: string | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
  funding_source: FundingSource | null;
  quota_date: string | null;
  quota_state: "reserved" | "consumed" | "released" | null;
  resolved_model: string | null;
  endpoint_tag: string | null;
  actual_cost_usd: number | string | null;
  usage: Record<string, unknown> | null;
  capability_snapshot: Record<string, unknown> | null;
  reconciliation_code: string | null;
  system_credential_id: string | null;
  provider_attempt_count: number;
};

const jobFields =
  "id,owner_id,provider,model,media_type,prompt,settings,status,external_id,error_code,created_at,updated_at,funding_source,quota_date,quota_state,resolved_model,endpoint_tag,actual_cost_usd,usage,capability_snapshot,reconciliation_code,system_credential_id,provider_attempt_count";

function configuration(job: JobRow): StudioConfiguration {
  return configurationSchema.parse(job.settings);
}

function nextUtcReset() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
}

function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getFreeAllowance(owner: string): Promise<FreeAllowance> {
  const db = createSupabaseAdminClient();
  const [{ count, error }, huggingFaceAvailable] = await Promise.all([
    db
      .from("generation_quota_reservations")
      .select("generation_id", { count: "exact", head: true })
      .eq("owner_id", owner)
      .eq("quota_date", utcDate())
      .in("state", ["reserved", "consumed"]),
    hasAvailableHuggingFaceCredential().catch(() => false),
  ]);
  if (error) throw new Error("Free allowance unavailable.");
  const used = Math.min(3, Math.max(0, count ?? 0));
  return {
    limit: 3,
    used,
    remaining: 3 - used,
    resetsAt: nextUtcReset(),
    available:
      Boolean(readServerEnv().OPENROUTER_SYSTEM_API_KEY) ||
      huggingFaceAvailable,
  };
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
    .in("status", ["queued", "processing", "saving"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Could not update this run.");
  if (!data || !("status" in values || "error_code" in values)) return;
  await db.from("generation_events").insert({
    generation_id: job.id,
    owner_id: job.owner_id,
    status: values.status ?? job.status,
    error_code: values.error_code ?? null,
    metadata: {
      provider: job.provider,
      fundingSource: job.funding_source ?? "legacy",
    },
  });
}

async function quotaMutation(
  operation: "consume_generation_quota" | "release_generation_quota",
  job: JobRow,
) {
  if (job.funding_source !== "system_free") return;
  const { error } = await createSupabaseAdminClient().rpc(operation, {
    p_owner: job.owner_id,
    p_generation: job.id,
  });
  if (error) throw new Error("Could not update the daily allowance.");
}

function isDefinitePreAcceptanceRejection(code: ProviderFailure["code"]) {
  return [
    "provider_rejected",
    "credential_rejected",
    "model_unavailable",
    "payment_required",
    "rate_limited",
  ].includes(code);
}

async function secretFor(job: JobRow) {
  if (job.funding_source === "system_free")
    return readServerEnv().OPENROUTER_SYSTEM_API_KEY ?? null;
  if (job.funding_source === "personal_key")
    return getProviderConnectionSecret(job.owner_id, "openrouter");
  return getProviderConnectionSecret(
    job.owner_id,
    job.provider as "openai" | "replicate" | "openrouter",
  );
}

async function persistUsage(job: JobRow, update: LiveUpdate) {
  if (!update.usage) return;
  await updateJob(job, {
    usage: update.usage,
    actual_cost_usd: update.usage.cost ?? null,
  });
}

class OutputIngestionFailure extends ProviderFailure {
  constructor(public readonly reconciliationCode: string) {
    super("output_unavailable");
  }
}

async function ingest(job: JobRow, outputs: LiveOutput[], secret: string) {
  const db = createSupabaseAdminClient();
  const output = outputs[0];
  if (!output) throw new OutputIngestionFailure("output_missing");
  let result: Awaited<ReturnType<typeof retrieveOutput>>;
  try {
    result = await retrieveOutput(output, secret, job.media_type);
  } catch {
    throw new OutputIngestionFailure("output_validation_failed");
  }
  if (job.media_type === "image") {
    const dimensions = referenceDimensions(result.bytes, result.mime);
    if (
      !dimensions ||
      dimensions.width < 256 ||
      dimensions.height < 256 ||
      dimensions.width > 4096 ||
      dimensions.height > 4096
    )
      throw new OutputIngestionFailure("output_dimensions_invalid");
  }
  await updateJob(job, { status: "saving", error_code: null });
  const path = privateObjectPath(
    job.owner_id,
    job.id,
    `result.${result.extension}`,
  );
  const { error: uploadError } = await db.storage
    .from("generation-private")
    .upload(path, result.bytes, { contentType: result.mime, upsert: true });
  if (uploadError) throw new OutputIngestionFailure("storage_upload_failed");
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
  if (error) throw new OutputIngestionFailure("asset_persist_failed");
  await updateJob(job, { status: "complete", error_code: null });
}

async function consume(job: JobRow, update: LiveUpdate, secret: string) {
  await persistUsage(job, update);
  if (update.status === "complete") {
    await updateJob(job, {
      external_id: update.externalId,
      status: "processing",
    });
    try {
      await ingest(job, update.outputs ?? [], secret);
    } catch (caught) {
      await updateJob(job, {
        status: job.media_type === "video" ? "processing" : "failed",
        error_code: "output_unavailable",
        reconciliation_code:
          caught instanceof OutputIngestionFailure
            ? caught.reconciliationCode
            : "output_ingestion_failed",
      });
    }
  } else {
    await updateJob(job, {
      external_id: update.externalId,
      status: update.status,
      error_code: update.status === "failed" ? "provider_failed" : null,
    });
  }
}

async function referenceUrls(owner: string, input: string[]) {
  const db = createSupabaseAdminClient();
  const urls: string[] = [];
  for (const path of input) {
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
    const { data, error } = await db.storage
      .from("reference-private")
      .createSignedUrl(path, 900);
    if (error || !data) throw new Error("Reference unavailable.");
    urls.push(data.signedUrl);
  }
  return urls;
}

async function updateProviderAttempt(
  generationId: string,
  attemptNumber: number,
  values: Record<string, unknown>,
) {
  const { error } = await createSupabaseAdminClient()
    .from("provider_generation_attempts")
    .update(values)
    .eq("generation_id", generationId)
    .eq("attempt_number", attemptNumber);
  if (error) throw new Error("Could not update provider diagnostics.");
}

function huggingFaceCredentialState(code: ProviderFailure["code"]) {
  if (code === "credential_rejected") return "invalid" as const;
  if (code === "payment_required") return "exhausted" as const;
  if (code === "rate_limited" || code === "provider_failed")
    return "cooldown" as const;
  return "active" as const;
}

function huggingFaceRetryable(code: ProviderFailure["code"]) {
  return [
    "credential_rejected",
    "model_unavailable",
    "payment_required",
    "rate_limited",
    "provider_failed",
  ].includes(code);
}

function huggingFaceDefiniteRejection(code: ProviderFailure["code"]) {
  return !["submission_unknown", "output_unavailable"].includes(code);
}

type HuggingFaceExecution =
  { update: LiveUpdate; secret: string } | { error: ProviderFailure["code"] };

async function executeHuggingFaceImage(
  job: JobRow,
): Promise<HuggingFaceExecution> {
  let lastCode: ProviderFailure["code"] = "provider_rejected";
  let hadAttempt = false;
  for (let index = 0; index < 2; index += 1) {
    const lease = await acquireSystemCredential({
      generationId: job.id,
      model: job.model,
    });
    if (!lease) {
      lastCode = hadAttempt ? lastCode : "credential_rejected";
      break;
    }
    hadAttempt = true;
    const secret = await readSystemCredentialSecret(lease.credentialId);
    if (!secret) {
      lastCode = "credential_rejected";
      await settleSystemCredential({
        leaseId: lease.leaseId,
        leaseState: "failed",
        safeErrorCode: lastCode,
      });
      if (index === 0) continue;
      break;
    }
    const started = Date.now();
    const { error: attemptError } = await createSupabaseAdminClient()
      .from("provider_generation_attempts")
      .insert({
        generation_id: job.id,
        credential_id: lease.credentialId,
        lease_id: lease.leaseId,
        attempt_number: lease.attemptNumber,
        provider: "huggingface",
        model: job.model,
        outcome: "started",
      });
    if (attemptError) {
      await settleSystemCredential({
        leaseId: lease.leaseId,
        leaseState: "failed",
        credentialStatus: "active",
        safeErrorCode: "diagnostic_write_failed",
      });
      throw new Error("Could not start provider diagnostics.");
    }
    try {
      const update = await getLiveProvider("huggingface", secret).submitImage(
        configuration(job),
      );
      await updateProviderAttempt(job.id, lease.attemptNumber, {
        outcome: "complete",
        provider_request_id: update.externalId,
        http_status: 200,
        latency_ms: Date.now() - started,
        accepted_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      await settleSystemCredential({
        leaseId: lease.leaseId,
        leaseState: "completed",
        credentialStatus: "active",
        success: true,
      });
      return { update, secret };
    } catch (caught) {
      const failure =
        caught instanceof ProviderFailure
          ? caught
          : new HuggingFaceProviderFailure("submission_unknown");
      lastCode = failure.code;
      const ambiguous = failure.code === "submission_unknown";
      await updateProviderAttempt(job.id, lease.attemptNumber, {
        outcome: ambiguous
          ? "ambiguous"
          : huggingFaceDefiniteRejection(failure.code)
            ? "rejected"
            : "failed",
        http_status:
          failure instanceof HuggingFaceProviderFailure
            ? (failure.httpStatus ?? null)
            : null,
        safe_error_code: failure.code,
        latency_ms: Date.now() - started,
        completed_at: new Date().toISOString(),
      });
      await settleSystemCredential({
        leaseId: lease.leaseId,
        leaseState: ambiguous ? "ambiguous" : "failed",
        credentialStatus: huggingFaceCredentialState(failure.code),
        ...(failure.code === "rate_limited"
          ? { cooldownSeconds: 300 }
          : failure.code === "provider_failed"
            ? { cooldownSeconds: 60 }
            : {}),
        safeErrorCode: failure.code,
        success: huggingFaceCredentialState(failure.code) === "active",
      });
      if (index === 0 && huggingFaceRetryable(failure.code)) continue;
      break;
    }
  }
  return { error: hadAttempt ? lastCode : ("credential_rejected" as const) };
}

export async function submitRun(
  owner: string,
  emailVerified: boolean,
  raw: unknown,
): Promise<RunRecord> {
  const input = submissionSchema.parse(raw);
  const c = input.configuration;
  const model = getStudioModel(c.modelId);
  if (
    !model ||
    !["openrouter", "huggingface"].includes(model.provider) ||
    !model.fundingSources.includes(input.fundingSource)
  )
    throw new Error("Choose a model available for this funding method.");
  if (input.fundingSource === "system_free" && !emailVerified)
    throw new Error("Verify your email before using the free daily allowance.");
  if (model.provider === "huggingface" && input.fundingSource !== "system_free")
    throw new Error(
      "Hugging Face is available only through the free allowance.",
    );

  const db = createSupabaseAdminClient();
  const { data: existing } = await db
    .from("generation_jobs")
    .select(jobFields)
    .eq("id", input.id)
    .eq("owner_id", owner)
    .maybeSingle();
  if (existing) {
    const original = existing as JobRow;
    if (
      JSON.stringify(configuration(original)) !== JSON.stringify(c) ||
      original.settings.referencePaths !==
        JSON.stringify(input.referencePaths) ||
      original.funding_source !== input.fundingSource
    )
      throw new Error("This run identity belongs to another recipe.");
    return getRun(owner, input.id);
  }

  const { data: flag, error: flagError } = await db
    .from("provider_feature_flags")
    .select(
      "system_image_enabled,system_video_enabled,personal_image_enabled,personal_video_enabled",
    )
    .eq("provider", model.provider)
    .maybeSingle();
  const enabled =
    input.fundingSource === "system_free"
      ? c.media === "image"
        ? flag?.system_image_enabled
        : flag?.system_video_enabled
      : c.media === "image"
        ? flag?.personal_image_enabled
        : flag?.personal_video_enabled;
  if (flagError || !enabled)
    throw new Error(`This ${model.provider} workflow is currently disabled.`);

  const secret =
    model.provider === "huggingface"
      ? null
      : input.fundingSource === "system_free"
        ? readServerEnv().OPENROUTER_SYSTEM_API_KEY
        : await getProviderConnectionSecret(owner, "openrouter");
  const huggingFaceAvailable =
    model.provider === "huggingface"
      ? await hasAvailableHuggingFaceCredential(c.modelId)
      : false;
  if (model.provider === "huggingface" ? !huggingFaceAvailable : !secret)
    throw new Error(
      model.provider === "huggingface"
        ? "Hugging Face capacity is temporarily unavailable."
        : input.fundingSource === "system_free"
          ? "The free daily allowance is temporarily unavailable."
          : "Connect a valid OpenRouter key before using personal billing.",
    );

  const snapshot =
    model.provider === "huggingface"
      ? approveHuggingFaceRecipe(c)
      : await approveOpenRouterRecipe(c, input.fundingSource);
  const references = await referenceUrls(owner, input.referencePaths);
  const settings = {
    ...c,
    referencePaths: JSON.stringify(input.referencePaths),
  };
  const reservation =
    model.provider === "huggingface"
      ? {
          name: "reserve_system_generation",
          args: {
            p_id: input.id,
            p_owner: owner,
            p_provider: "huggingface",
            p_model: model.id,
            p_media: c.media,
            p_prompt: c.prompt,
            p_settings: settings,
            p_capability_snapshot: snapshot,
            p_global_daily_limit:
              readServerEnv().HUGGINGFACE_SYSTEM_DAILY_JOB_LIMIT,
          },
        }
      : {
          name: "reserve_openrouter_generation",
          args: {
            p_id: input.id,
            p_owner: owner,
            p_model: model.openRouterModel,
            p_media: c.media,
            p_prompt: c.prompt,
            p_settings: settings,
            p_funding_source: input.fundingSource,
            p_capability_snapshot: snapshot,
            p_global_daily_limit:
              readServerEnv().OPENROUTER_SYSTEM_DAILY_JOB_LIMIT,
          },
        };
  const { data: reserved, error } = await db.rpc(
    reservation.name,
    reservation.args,
  );
  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("daily_allowance_exhausted"))
      throw new Error("Your three free generations are used for today.");
    if (message.includes("system_daily_limit"))
      throw new Error("The platform-funded daily budget is currently used.");
    throw new Error(
      "Could not reserve this run. Check the database migration and generation limits.",
    );
  }
  const job = reserved?.[0] as JobRow | undefined;
  if (
    !job ||
    JSON.stringify(configuration(job)) !== JSON.stringify(c) ||
    job.settings.referencePaths !== JSON.stringify(input.referencePaths) ||
    job.funding_source !== input.fundingSource
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

  if (model.provider === "huggingface") {
    let execution: Awaited<ReturnType<typeof executeHuggingFaceImage>>;
    try {
      execution = await executeHuggingFaceImage(job);
    } catch {
      try {
        await quotaMutation("release_generation_quota", job);
      } catch {
        await updateJob(job, {
          reconciliation_code: "quota_settlement_failed",
        });
      }
      await updateJob(job, {
        status: "failed",
        error_code: "provider_failed",
      });
      return getRun(owner, job.id);
    }
    if ("error" in execution) {
      const definite = huggingFaceDefiniteRejection(execution.error);
      try {
        await quotaMutation(
          definite ? "release_generation_quota" : "consume_generation_quota",
          job,
        );
      } catch {
        await updateJob(job, {
          reconciliation_code: "quota_settlement_failed",
        });
      }
      if (!definite)
        await updateJob(job, { reconciliation_code: "submission_review" });
      await updateJob(job, { status: "failed", error_code: execution.error });
      return getRun(owner, job.id);
    }
    try {
      await quotaMutation("consume_generation_quota", job);
    } catch {
      await updateJob(job, { reconciliation_code: "quota_settlement_failed" });
    }
    await consume(job, execution.update, execution.secret);
    return getRun(owner, job.id);
  }

  const adapter = getLiveProvider("openrouter", secret!);
  let update: LiveUpdate;
  try {
    update =
      c.media === "image"
        ? await adapter.submitImage(c, references)
        : await adapter.submitVideo(c, references);
  } catch (caught) {
    const code =
      caught instanceof ProviderFailure ? caught.code : "submission_unknown";
    try {
      await quotaMutation(
        isDefinitePreAcceptanceRejection(code)
          ? "release_generation_quota"
          : "consume_generation_quota",
        job,
      );
    } catch {
      await updateJob(job, { reconciliation_code: "quota_settlement_failed" });
    }
    if (!isDefinitePreAcceptanceRejection(code))
      await updateJob(job, { reconciliation_code: "submission_review" });
    await updateJob(job, { status: "failed", error_code: code });
    return getRun(owner, job.id);
  }

  if (c.media === "video")
    await updateJob(job, {
      external_id: update.externalId,
      status: update.status === "complete" ? "processing" : update.status,
    });
  try {
    await quotaMutation("consume_generation_quota", job);
  } catch {
    await updateJob(job, { reconciliation_code: "quota_settlement_failed" });
  }
  await consume(job, update, secret!);
  return getRun(owner, job.id);
}

async function recordsForJobs(
  owner: string,
  jobs: JobRow[],
): Promise<RunRecord[]> {
  if (!jobs.length) return [];
  const db = createSupabaseAdminClient();
  const [{ data: assets, error }, allowance] = await Promise.all([
    db
      .from("assets")
      .select(
        "id,generation_id,storage_bucket,storage_path,media_type,is_favorite",
      )
      .eq("owner_id", owner)
      .in(
        "generation_id",
        jobs.map((job) => job.id),
      ),
    getFreeAllowance(owner).catch(() => null),
  ]);
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
        .select(
          "asset_id,slug,is_showcase_listed,public_title,public_category,public_alt_text",
        )
        .eq("owner_id", owner)
        .in(
          "asset_id",
          owned.map((asset) => asset.id),
        )
        .is("revoked_at", null)
    : { data: [] };
  const publicationMap = new Map(
    (publications ?? []).map((item) => [item.asset_id, item]),
  );
  return jobs.map((job) => ({
    id: job.id,
    provider: job.provider,
    status: job.status,
    configuration: configuration(job),
    createdAt: job.created_at,
    fundingSource: job.funding_source ?? "legacy",
    resolvedModel: job.resolved_model ?? job.model,
    actualCostUsd:
      job.actual_cost_usd === null ? null : Number(job.actual_cost_usd),
    allowance,
    error: job.error_code
      ? (runErrors[job.error_code] ??
        "Run unavailable. Please reopen this result.")
      : null,
    assets: owned
      .filter((asset) => asset.generation_id === job.id)
      .map((asset) => {
        const publication = publicationMap.get(asset.id);
        return {
          id: asset.id,
          url: urls.get(asset.storage_path) ?? "",
          media: asset.media_type as "image" | "video",
          favorite: asset.is_favorite,
          publicSlug: publication?.slug ?? null,
          showcaseListed: publication?.is_showcase_listed ?? false,
          publicTitle: publication?.public_title ?? null,
          publicCategory: publication?.public_category ?? null,
          publicAltText: publication?.public_alt_text ?? null,
        };
      }),
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
  if (!["queued", "processing", "saving"].includes(job.status))
    return getRun(owner, id);
  const elapsed = Date.now() - Date.parse(job.created_at);
  if (
    ["openrouter", "huggingface"].includes(job.provider) &&
    job.media_type === "image"
  ) {
    const { data: savedAsset } = await createSupabaseAdminClient()
      .from("assets")
      .select("id")
      .eq("owner_id", owner)
      .eq("generation_id", id)
      .maybeSingle();
    if (savedAsset)
      await updateJob(job, { status: "complete", error_code: null });
    else if (job.error_code === "output_unavailable" || elapsed > 300000)
      await updateJob(job, {
        status: "failed",
        error_code:
          job.error_code === "output_unavailable"
            ? "output_unavailable"
            : "submission_unknown",
      });
    return getRun(owner, id);
  }
  if (!job.external_id) {
    if (elapsed > 300000)
      await updateJob(job, {
        status: "failed",
        error_code: "submission_unknown",
      });
    return getRun(owner, id);
  }
  if (elapsed > 30 * 60 * 1000) {
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
  const secret = await secretFor(job);
  if (!secret) {
    await updateJob(job, { settings: { ...job.settings, pollLeaseUntil: 0 } });
    throw new Error(
      job.funding_source === "personal_key"
        ? "Reconnect your OpenRouter key to retrieve this run."
        : "System-funded retrieval is temporarily unavailable.",
    );
  }
  try {
    if (job.provider === "openrouter")
      await consume(
        job,
        await getLiveProvider("openrouter", secret).pollVideo(job.external_id),
        secret,
      );
    else if (job.provider === "replicate")
      await consume(
        job,
        await getLiveProvider("replicate", secret).poll(job.external_id),
        secret,
      );
  } catch (caught) {
    await updateJob(job, {
      error_code:
        caught instanceof ProviderFailure &&
        caught.code === "output_unavailable"
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
  throw new Error(
    "This OpenRouter submission cannot be cancelled here. Closing the page does not cancel provider billing.",
  );
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

function showcaseValues(input: ShowcasePublicationInput) {
  return input.listInShowcase
    ? {
        is_showcase_listed: true,
        public_title: input.title,
        public_category: input.category,
        public_alt_text: input.alt,
      }
    : {
        is_showcase_listed: false,
        public_title: null,
        public_category: null,
        public_alt_text: null,
      };
}

export async function publishAsset(owner: string, id: string, raw: unknown) {
  z.uuid().parse(id);
  const input = showcasePublicationSchema.parse(raw);
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
      ...showcaseValues(input),
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

export async function updatePublicationShowcase(
  owner: string,
  id: string,
  raw: unknown,
) {
  z.uuid().parse(id);
  const input = showcasePublicationSchema.parse(raw);
  const db = createSupabaseAdminClient();
  const values = input.listInShowcase
    ? showcaseValues(input)
    : { is_showcase_listed: false };
  const { data, error } = await db
    .from("publications")
    .update(values)
    .eq("asset_id", id)
    .eq("owner_id", owner)
    .is("revoked_at", null)
    .select("slug")
    .maybeSingle();
  if (error || !data) throw new Error("Public showcase settings unavailable.");
  return data.slug;
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
    .update({
      revoked_at: new Date().toISOString(),
      is_showcase_listed: false,
    })
    .eq("asset_id", id)
    .eq("owner_id", owner);
  if (revokeError) throw new Error("Could not disable sharing. Try again.");
}

export async function publicAsset(slug: string) {
  if (!z.uuid().safeParse(slug).success) return null;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("publications")
    .select("asset_id,public_title,public_alt_text,is_showcase_listed")
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
    title: data.public_title ?? "A frame worth sharing.",
    alt: data.public_alt_text ?? "Publicly shared generated output",
    showcaseListed: data.is_showcase_listed,
  };
}
