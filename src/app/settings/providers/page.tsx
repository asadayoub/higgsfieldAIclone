import { LockKeyhole } from "lucide-react";
import { ProviderConnectionCard } from "@/components/providers/provider-connection-card";
import { requireUser } from "@/server/auth/session";
import { listProviderConnections } from "@/server/providers/connections";
import { providerCatalog } from "@/server/providers/validation";
import { createSupabaseServerClient } from "@/server/supabase/client";

export default async function ProviderSettingsPage() {
  const session = await requireUser("/settings/providers");
  const supabase = await createSupabaseServerClient();
  const [connections, flagResult] = await Promise.all([
    listProviderConnections(session.user.id),
    supabase
      ? supabase
          .from("provider_feature_flags")
          .select("provider,image_enabled,video_enabled")
      : Promise.resolve({ data: [] }),
  ]);
  const flags = new Map(
    (flagResult.data ?? []).map((flag) => [
      flag.provider,
      Boolean(flag.image_enabled || flag.video_enabled),
    ]),
  );
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-5 py-12 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
        Live mode
      </p>
      <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
        Provider connections
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-[var(--text-muted)]">
        Connect a supported image or video service. Credentials are encrypted
        server-side and are never returned to this browser.
      </p>
      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/2 px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
        <LockKeyhole
          size={15}
          className="shrink-0 text-[var(--action)]"
          aria-hidden="true"
        />
        Credentials are encrypted server-side and can only be decrypted for a
        confirmed generation request.
      </div>
      <section className="mt-6 grid gap-4">
        {providerCatalog.map((provider) => (
          <ProviderConnectionCard
            key={provider.id}
            provider={provider}
            connection={connections.find(
              (connection) => connection.provider === provider.id,
            )}
            generationEnabled={flags.get(provider.id) ?? false}
          />
        ))}
      </section>
    </main>
  );
}
