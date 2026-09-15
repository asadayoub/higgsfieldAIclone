import { getSessionUser } from "@/server/auth/session";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { isOwnedPrivatePath } from "@/lib/storage/paths";
import { z } from "zod";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return new Response("Sign in required", { status: 401 });
  if (!z.uuid().safeParse(id).success)
    return new Response("Not found", { status: 404 });
  const db = createSupabaseAdminClient();
  const { data: asset } = await db
    .from("assets")
    .select("generation_id,storage_bucket,storage_path,media_type")
    .eq("id", id)
    .eq("owner_id", session.user.id)
    .maybeSingle();
  if (
    !asset ||
    asset.storage_bucket !== "generation-private" ||
    !isOwnedPrivatePath(session.user.id, asset.storage_path)
  )
    return new Response("Not found", { status: 404 });
  const extension = asset.storage_path.split(".").pop()!;
  const { data, error } = await db.storage
    .from("generation-private")
    .createSignedUrl(asset.storage_path, 60, {
      download: `lumaforge-${asset.media_type}-${asset.generation_id.slice(0, 8)}.${extension}`,
    });
  if (error || !data)
    return new Response("Download unavailable", { status: 503 });
  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, "Cache-Control": "private, no-store" },
  });
}
