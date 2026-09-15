import { HistoryLibrary } from "@/components/generation/history-library";
import { getSessionUser } from "@/server/auth/session";
import { listRuns } from "@/server/generation/service";
import type { RunRecord } from "@/lib/generation/contracts";
export default async function Page() {
  const session = await getSessionUser();
  let cloud: RunRecord[] = [];
  let error: string | undefined;
  try {
    if (session) cloud = await listRuns(session.user.id);
  } catch {
    error = "Private history could not be loaded. Reopen this page to retry.";
  }
  return (
    <HistoryLibrary
      cloud={cloud}
      signedIn={Boolean(session)}
      {...(error ? { error } : {})}
    />
  );
}
