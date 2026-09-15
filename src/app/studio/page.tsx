import { GenerationStudio } from "@/components/studio/generation-studio";
import { parseStudioRecipe } from "@/lib/discovery/creation-recipe";
import { getSessionUser } from "@/server/auth/session";
import { listProviderConnections } from "@/server/providers/connections";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, session] = await Promise.all([searchParams, getSessionUser()]);
  const connections = session
    ? await listProviderConnections(session.user.id)
    : [];
  return (
    <GenerationStudio
      parsed={parseStudioRecipe(params)}
      signedIn={Boolean(session)}
      connectedProviders={connections
        .filter((connection) => connection.isValid)
        .map((connection) => connection.provider)}
    />
  );
}
