import { KeyRound, LockKeyhole } from "lucide-react";
import { requireUser } from "@/server/auth/session";
export default async function ProviderSettingsPage() {
  await requireUser("/settings/providers");
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
      <section className="mt-10 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/6 text-[var(--action)]">
            <KeyRound size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">
              Connections arrive in the next data phase
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              This route is already session-protected. Secure encrypted
              creation, validation, replacement, and deletion are implemented
              with the provider registry in Task 04.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-[var(--text-faint)]">
              <LockKeyhole size={14} aria-hidden="true" />
              Private by default · owner-scoped access
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
