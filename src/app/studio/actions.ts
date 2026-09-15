"use server";

import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { privateObjectPath } from "@/lib/storage/paths";
import {
  referenceDimensions,
  validateReferenceMetadata,
} from "@/lib/studio/validation";

export async function uploadStudioReference(
  form: FormData,
): Promise<{ path?: string; error?: string }> {
  const session = await getSessionUser();
  if (!session)
    return { error: "Sign in before uploading a private reference." };
  const file = form.get("reference");
  if (!(file instanceof File)) return { error: "Choose a reference image." };
  const metadataError = validateReferenceMetadata(file.type, file.size);
  if (metadataError) return { error: metadataError };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dimensions = referenceDimensions(bytes, file.type);
  if (!dimensions)
    return { error: "The file contents do not match a supported image." };
  const dimensionError = validateReferenceMetadata(
    file.type,
    file.size,
    dimensions.width,
    dimensions.height,
  );
  if (dimensionError) return { error: dimensionError };
  const extension =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";
  const path = privateObjectPath(
    session.user.id,
    randomUUID(),
    `reference.${extension}`,
  );
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Private storage is unavailable." };
  const { error } = await supabase.storage
    .from("reference-private")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return { error: "Unable to upload this reference. Please retry." };
  return { path };
}
