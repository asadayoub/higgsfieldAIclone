"use client";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]">
          <AlertTriangle aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
          The frame slipped.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Your work is safe. Try loading this view once more.
        </p>
        <Button variant="primary" onClick={reset} className="mt-6">
          <RotateCcw size={16} aria-hidden="true" />
          Try again
        </Button>
      </div>
    </main>
  );
}
