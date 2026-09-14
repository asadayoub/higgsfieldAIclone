import "server-only";
import { z } from "zod";
import { isOwnedPrivatePath } from "@/lib/storage/paths";
import { requireUser } from "@/server/auth/session";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const privateBucketSchema = z.enum(["generation-private", "reference-private"]);

export async function createPrivateDownloadUrl(
  bucketInput: string,
  path: string,
  expiresIn = 60,
) {
  const { user } = await requireUser();
  const bucket = privateBucketSchema.parse(bucketInput);
  if (!isOwnedPrivatePath(user.id, path)) throw new Error("Media not found");
  const ttl = Math.max(30, Math.min(expiresIn, 300));
  const { data, error } = await createSupabaseAdminClient()
    .storage.from(bucket)
    .createSignedUrl(path, ttl);
  if (error) throw new Error("Unable to create media link");
  return { url: data.signedUrl, expiresIn: ttl };
}

export async function createPrivateUploadToken(
  bucketInput: string,
  path: string,
) {
  const { user } = await requireUser();
  const bucket = privateBucketSchema.parse(bucketInput);
  if (!isOwnedPrivatePath(user.id, path)) throw new Error("Invalid media path");
  const { data, error } = await createSupabaseAdminClient()
    .storage.from(bucket)
    .createSignedUploadUrl(path);
  if (error) throw new Error("Unable to create upload token");
  return { path: data.path, token: data.token };
}
