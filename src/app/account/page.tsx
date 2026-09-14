export default function AccountPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-5 py-12 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
        Workspace
      </p>
      <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
        Account
      </h1>
      <section className="mt-10 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <h2 className="text-lg font-semibold">Guided mode is active</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
          Explore the product without connecting a service. Authentication and
          encrypted live-provider connections are introduced in the next secure
          account phase.
        </p>
      </section>
    </main>
  );
}
