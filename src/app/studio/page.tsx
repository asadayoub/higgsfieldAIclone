import { GenerationStudio } from "@/components/studio/generation-studio";
import { parseStudioRecipe } from "@/lib/discovery/creation-recipe";
import { getSessionUser } from "@/server/auth/session";
import { listProviderConnections } from "@/server/providers/connections";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { getFreeAllowance } from "@/server/generation/service";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, session] = await Promise.all([searchParams, getSessionUser()]);
  const [connections, allowance] = session
    ? await Promise.all([
        listProviderConnections(session.user.id),
        getFreeAllowance(session.user.id).catch(() => null),
      ])
    : [[], null];
  const db = session ? await createSupabaseServerClient() : null;
  const flagResult = db
    ? await db
        .from("provider_feature_flags")
        .select(
          "provider,system_image_enabled,system_video_enabled,personal_image_enabled,personal_video_enabled",
        )
        .in("provider", ["openrouter", "huggingface"])
    : null;
  const flags = flagResult?.data ?? [];
  const openRouter = flags.find((flag) => flag.provider === "openrouter");
  const huggingFace = flags.find((flag) => flag.provider === "huggingface");
  return (
    <GenerationStudio
      key={JSON.stringify(params)}
      parsed={parseStudioRecipe(params)}
      signedIn={Boolean(session)}
      emailVerified={Boolean(session?.user.email_confirmed_at)}
      personalKeyConnected={connections.some(
        (connection) =>
          connection.provider === "openrouter" && connection.isValid,
      )}
      allowance={allowance}
      availability={{
        openrouter: {
          system_free: {
            image: Boolean(openRouter?.system_image_enabled),
            video: Boolean(openRouter?.system_video_enabled),
          },
          personal_key: {
            image: Boolean(openRouter?.personal_image_enabled),
            video: Boolean(openRouter?.personal_video_enabled),
          },
        },
        huggingface: {
          system_free: {
            image: Boolean(huggingFace?.system_image_enabled),
            video: false,
          },
          personal_key: { image: false, video: false },
        },
      }}
    />
  );
}
