import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export default function NotFound() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-[var(--action)] uppercase">
          404 · Outside the frame
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
          Nothing was rendered here.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          The creation may have moved, returned to private, or never existed.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--control)] px-5 text-sm font-semibold hover:bg-[var(--control-hover)]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Explore
        </Link>
      </div>
    </main>
  );
}
