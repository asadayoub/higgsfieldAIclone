import Link from "next/link";
import { KeyRound } from "lucide-react";
import { RecoveryForm } from "@/components/auth/recovery-form";

export default function RecoverAccountPage() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-2xl bg-[var(--action)] text-[var(--action-ink)]">
          <KeyRound size={20} aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
          Account recovery
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          Reset your password.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Enter your account email. If it matches an account, we’ll send a
          secure recovery link.
        </p>
        <RecoveryForm />
        <Link
          href="/account"
          className="mt-6 block text-center text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
