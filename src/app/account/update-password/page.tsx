import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { getSessionUser } from "@/server/auth/session";

export default async function UpdatePasswordPage() {
  const session = await getSessionUser();

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-2xl bg-[var(--action)] text-[var(--action-ink)]">
          <LockKeyhole size={20} aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
          Secure account
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          Choose a new password.
        </h1>
        {!session ? (
          <div className="mt-6">
            <p role="alert" className="text-sm leading-6 text-[var(--danger)]">
              This recovery session is missing or expired. Request a new link to
              continue.
            </p>
            <Link
              href="/account/recover"
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)] hover:bg-[var(--action-hover)]"
            >
              Request another link
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Set a strong password for {session.user.email}. You’ll remain
              signed in after the update.
            </p>
            <UpdatePasswordForm />
          </>
        )}
      </section>
    </main>
  );
}
