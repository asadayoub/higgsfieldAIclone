import Link from "next/link";
import { ShieldX } from "lucide-react";
export default function ForbiddenPage() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5">
      <section className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
          <ShieldX aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-[var(--danger)] uppercase">
          Restricted workspace
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          You do not have access to this view.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          Your account is working. This area requires a different workspace
          role.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center rounded-full border border-[var(--line)] bg-[var(--control)] px-5 text-sm font-semibold"
        >
          Return to Explore
        </Link>
      </section>
    </main>
  );
}
