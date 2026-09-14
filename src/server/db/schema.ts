import {
  boolean,
  integer,
  jsonb,
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
});

export const providerFeatureFlags = pgTable("provider_feature_flags", {
  provider: text("provider").primaryKey(),
  imageEnabled: boolean("image_enabled").notNull().default(false),
  videoEnabled: boolean("video_enabled").notNull().default(false),
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
