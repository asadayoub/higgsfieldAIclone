import Link from "next/link";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { Button } from "@/components/ui/button";
import { safeReturnPath } from "@/server/auth/return-path";
import { getSessionUser } from "@/server/auth/session";

type AccountPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  const next = safeReturnPath(params.next, "/assets");
  if (!session)
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5 py-12">
        <section className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--action)] text-[var(--action-ink)]">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
            Private workspace
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            Sign in to keep your work.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Guided creation stays open to everyone. Sign in only when you want
            private history or a live provider connection.
          </p>
          {params.error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-3 text-sm text-[var(--danger)]"
            >
              That sign-in link is invalid or expired. Request a fresh one
              below.
            </p>
          ) : null}
          <MagicLinkForm next={next} />
        </section>
      </main>
    );

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-5 py-12 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
        Workspace
      </p>
      <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
        Account
      </h1>
      <section className="mt-10 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 py-1.5 text-xs text-[var(--success)]">
              <ShieldCheck size={14} aria-hidden="true" />
              Signed in · {session.role}
            </span>
            <h2 className="mt-5 text-xl font-semibold">
              {session.user.email ?? "Authenticated workspace"}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Your private generations and provider settings are protected by
              this account.
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/history"
            className="rounded-2xl border border-[var(--line)] bg-white/3 p-4 text-sm font-medium hover:bg-white/6"
          >
            Generation history
          </Link>
          <Link
            href="/settings/providers"
            className="rounded-2xl border border-[var(--line)] bg-white/3 p-4 text-sm font-medium hover:bg-white/6"
          >
            Provider connections
          </Link>
          {session.role === "superadmin" ? (
            <Link
              href="/admin"
              className="rounded-2xl border border-[var(--action)] bg-[color-mix(in_srgb,var(--action)_8%,transparent)] p-4 text-sm font-medium text-[var(--action)] sm:col-span-2"
            >
              Open superadmin controls
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
