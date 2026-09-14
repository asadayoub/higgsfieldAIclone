import Image from "next/image";
import Link from "next/link";

export default function AssetsPage() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5 py-12">
      <section className="max-w-xl text-center">
        <Image
          src="/media/system/empty-library.svg"
          alt="Empty media cards waiting for new work"
          width={800}
          height={560}
          className="rounded-3xl border border-[var(--line)]"
        />
        <p className="mt-7 text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
          Your library
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          A home for every finished frame.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          Guided and private live generations will appear here with their full
          creative recipe intact.
        </p>
        <Link
          href={{ pathname: "/studio", query: { mode: "image" } }}
          className="mt-7 inline-flex min-h-11 items-center rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)]"
        >
          Create your first image
        </Link>
      </section>
    </main>
  );
}
