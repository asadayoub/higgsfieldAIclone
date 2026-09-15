import { GenerationStudio } from "@/components/studio/generation-studio";
import { parseStudioRecipe } from "@/lib/discovery/creation-recipe";
import { getSessionUser } from "@/server/auth/session";
import { listProviderConnections } from "@/server/providers/connections";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { studioModels } from "@/content/studio-models";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, session] = await Promise.all([searchParams, getSessionUser()]);
  const connections = session
    ? await listProviderConnections(session.user.id)
    : [];
  const db = session ? await createSupabaseServerClient() : null;
  const { data: flags } = db
    ? await db
        .from("provider_feature_flags")
        .select("provider,image_enabled,video_enabled")
    : { data: [] };
  const enabledLiveModels = studioModels
    .filter((model) =>
      flags?.some(
        (flag) =>
          flag.provider === model.provider &&
          (model.media === "image" ? flag.image_enabled : flag.video_enabled),
      ),
    )
    .map((model) => model.id);
  return (
    <GenerationStudio
      key={JSON.stringify(params)}
      parsed={parseStudioRecipe(params)}
      signedIn={Boolean(session)}
      enabledLiveModels={enabledLiveModels}
      connectedProviders={connections
        .filter((connection) => connection.isValid)
        .map((connection) => connection.provider)}
    />
  );
}
