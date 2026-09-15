import { getSessionUser } from "@/server/auth/session";
import { getRun } from "@/server/generation/service";
import { LiveResult } from "@/components/generation/live-result";
import { LocalResult } from "@/components/generation/local-result";
import { z } from "zod";
import { notFound } from "next/navigation";
export const metadata = {
  title: "Generation result",
  robots: { index: false, follow: false },
};
export const maxDuration = 120;
export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const session = await getSessionUser();
  let run;
  try {
    if (session) run = await getRun(session.user.id, id);
  } catch {
    /* Missing and unowned records use the same unavailable state. */
  }
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-8 sm:px-6">
      {run ? (
        <LiveResult key={run.id} initial={run} />
      ) : (
        <LocalResult id={id} />
      )}
    </main>
  );
}
