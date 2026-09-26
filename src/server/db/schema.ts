import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("app_role", ["tester", "superadmin"]);
export const jobStatusEnum = pgEnum("generation_status", [
  "draft",
  "awaiting_confirmation",
  "queued",
  "processing",
  "saving",
  "complete",
  "failed",
  "cancelled",
]);
export const visibilityEnum = pgEnum("asset_visibility", ["private", "public"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  role: roleEnum("role").notNull().default("tester"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const providerCredentials = pgTable("provider_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  label: text("label").notNull(),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  fingerprint: text("fingerprint").notNull(),
  lastFour: text("last_four").notNull(),
  isValid: boolean("is_valid").notNull().default(false),
  keyVersion: integer("key_version").notNull().default(1),
  accountLabel: text("account_label"),
  validationError: text("validation_error"),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const providerConnectionEvents = pgTable("provider_connection_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  action: text("action").notNull(),
  outcome: text("outcome").notNull(),
  metadata: jsonb("metadata")
    .$type<Record<string, string | number | boolean | null>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => profiles.id, {
    onDelete: "cascade",
  }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  mediaType: text("media_type").notNull(),
  prompt: text("prompt").notNull(),
  settings: jsonb("settings")
    .$type<Record<string, string | number | boolean>>()
    .notNull()
    .default({}),
  status: jobStatusEnum("status").notNull().default("draft"),
  externalId: text("external_id"),
  errorCode: text("error_code"),
  fundingSource: text("funding_source"),
  quotaDate: text("quota_date"),
  quotaState: text("quota_state"),
  resolvedModel: text("resolved_model"),
  endpointTag: text("endpoint_tag"),
  actualCostUsd: numeric("actual_cost_usd", { precision: 12, scale: 6 }),
  usage: jsonb("usage").$type<Record<string, number | boolean>>(),
  capabilitySnapshot: jsonb("capability_snapshot").$type<
    Record<string, unknown>
  >(),
  reconciliationCode: text("reconciliation_code"),
  systemCredentialId: uuid("system_credential_id"),
  providerAttemptCount: integer("provider_attempt_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const systemProviderCredentials = pgTable(
  "system_provider_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    label: text("label").notNull(),
    ciphertext: text("ciphertext"),
    iv: text("iv"),
    authTag: text("auth_tag"),
    fingerprint: text("fingerprint").notNull(),
    lastFour: text("last_four").notNull(),
    providerAccountHash: text("provider_account_hash").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    status: text("status").notNull().default("active"),
    priority: integer("priority").notNull().default(100),
    maxConcurrency: integer("max_concurrency").notNull().default(1),
    activeLeases: integer("active_leases").notNull().default(0),
    cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
    allowedMedia: text("allowed_media").array().notNull(),
    allowedModels: text("allowed_models").array().notNull(),
    validationStatus: text("validation_status").notNull().default("valid"),
    validationErrorCode: text("validation_error_code"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    lastSelectedAt: timestamp("last_selected_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    requestLimitDaily: integer("request_limit_daily").notNull().default(5),
    requestsUsedToday: integer("requests_used_today").notNull().default(0),
    usageDate: date("usage_date").notNull(),
    createdBy: uuid("created_by").notNull(),
    updatedBy: uuid("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    secretErasedAt: timestamp("secret_erased_at", { withTimezone: true }),
  },
);

export const systemCredentialLeases = pgTable("system_credential_leases", {
  id: uuid("id").primaryKey().defaultRandom(),
  credentialId: uuid("credential_id")
    .notNull()
    .references(() => systemProviderCredentials.id),
  generationId: uuid("generation_id")
    .notNull()
    .references(() => generationJobs.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull(),
  state: text("state").notNull().default("active"),
  leasedAt: timestamp("leased_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  safeErrorCode: text("safe_error_code"),
});

export const providerGenerationAttempts = pgTable(
  "provider_generation_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    generationId: uuid("generation_id")
      .notNull()
      .references(() => generationJobs.id, { onDelete: "cascade" }),
    credentialId: uuid("credential_id").references(
      () => systemProviderCredentials.id,
      { onDelete: "set null" },
    ),
    leaseId: uuid("lease_id").references(() => systemCredentialLeases.id, {
      onDelete: "set null",
    }),
    attemptNumber: integer("attempt_number").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    outcome: text("outcome").notNull().default("started"),
    providerRequestId: text("provider_request_id"),
    httpStatus: integer("http_status"),
    safeErrorCode: text("safe_error_code"),
    latencyMs: integer("latency_ms"),
    usage: jsonb("usage").$type<Record<string, number | boolean>>(),
    actualCostUsd: numeric("actual_cost_usd", { precision: 12, scale: 6 }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => profiles.id, {
    onDelete: "cascade",
  }),
  generationId: uuid("generation_id")
    .notNull()
    .references(() => generationJobs.id, { onDelete: "cascade" }),
  storageBucket: text("storage_bucket").notNull(),
  storagePath: text("storage_path").notNull(),
  mediaType: text("media_type").notNull(),
  visibility: visibilityEnum("visibility").notNull().default("private"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const generationQuotaReservations = pgTable(
  "generation_quota_reservations",
  {
    generationId: uuid("generation_id")
      .primaryKey()
      .references(() => generationJobs.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id").notNull(),
    quotaDate: date("quota_date").notNull(),
    state: text("state").notNull().default("reserved"),
    reservedAt: timestamp("reserved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
);

export const generationEvents = pgTable("generation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  generationId: uuid("generation_id")
    .notNull()
    .references(() => generationJobs.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").references(() => profiles.id, {
    onDelete: "cascade",
  }),
  status: jobStatusEnum("status").notNull(),
  progress: integer("progress"),
  errorCode: text("error_code"),
  metadata: jsonb("metadata")
    .$type<Record<string, string | number | boolean | null>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assetFavorites = pgTable("asset_favorites", {
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const publications = pgTable("publications", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  isShowcaseListed: boolean("is_showcase_listed").notNull().default(false),
  publicTitle: text("public_title"),
  publicCategory: text("public_category"),
  publicAltText: text("public_alt_text"),
  showcaseStatus: text("showcase_status").notNull().default("visible"),
  showcaseListedAt: timestamp("showcase_listed_at", { withTimezone: true }),
  showcaseUpdatedAt: timestamp("showcase_updated_at", { withTimezone: true }),
});

export const providerFeatureFlags = pgTable("provider_feature_flags", {
  provider: text("provider").primaryKey(),
  imageEnabled: boolean("image_enabled").notNull().default(false),
  videoEnabled: boolean("video_enabled").notNull().default(false),
  systemImageEnabled: boolean("system_image_enabled").notNull().default(false),
  systemVideoEnabled: boolean("system_video_enabled").notNull().default(false),
  personalImageEnabled: boolean("personal_image_enabled")
    .notNull()
    .default(false),
  personalVideoEnabled: boolean("personal_video_enabled")
    .notNull()
    .default(false),
  maintenanceMessage: text("maintenance_message"),
  updatedBy: uuid("updated_by").references(() => profiles.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const adminAuditEvents = pgTable("admin_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => profiles.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  metadata: jsonb("metadata")
    .$type<Record<string, string | number | boolean | null>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
