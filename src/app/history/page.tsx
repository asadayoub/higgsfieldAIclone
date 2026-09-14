import Image from "next/image";
import { requireUser } from "@/server/auth/session";
export default async function HistoryPage() {
  await requireUser("/history");
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-5 py-12 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
        Private workspace
      </p>
      <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
        History
      </h1>
      <section className="mt-10 grid place-items-center rounded-3xl border border-dashed border-[var(--line-strong)] px-6 py-14 text-center">
        <Image
          src="/media/system/empty-library.svg"
          alt=""
          width={320}
          height={224}
          className="rounded-2xl"
        />
        <h2 className="mt-6 text-2xl font-semibold">
          Your first run will land here.
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
          Every job keeps its prompt, model, settings, status, and private
          result together.
        </p>
      </section>
    </main>
  );
}
