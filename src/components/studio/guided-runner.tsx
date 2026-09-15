"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { guidedJobUpdate, guidedOutputs } from "@/lib/generation/guided-job";
import type { StudioConfiguration } from "@/lib/studio/validation";
import { creationDetailHref } from "@/lib/discovery/creation-recipe";
import { resultHref } from "@/lib/generation/contracts";
import {
  startLocalRun,
  cancelLocalRun,
  localHistorySnapshot,
  localHistoryServerSnapshot,
  subscribeLocalHistory,
  migrateLatestGuidedRun,
} from "@/lib/generation/local-history";

export function startGuidedRun(configuration: StudioConfiguration) {
  return startLocalRun(configuration);
}

export function GuidedRunner() {
  const history = useSyncExternalStore(
    subscribeLocalHistory,
    localHistorySnapshot,
    localHistoryServerSnapshot,
  );
  const job = history[0]?.job;
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      migrateLatestGuidedRun();
    } catch {
      /* Runs explain storage failures at submission. */
    }
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (
        !job ||
        !["queued", "processing"].includes(guidedJobUpdate(job, current).status)
      )
        clearInterval(timer);
    }, 200);
    return () => window.clearInterval(timer);
  }, [job]);
  if (!job) return null;
  const update = guidedJobUpdate(job, now || job.createdAt);
  const active = update.status === "queued" || update.status === "processing";
  return (
    <section
      aria-label="Guided generation result"
      className="mt-6 rounded-3xl border border-white/10 bg-[var(--panel)] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-[var(--action)] uppercase">
            Guided · no external model call
          </p>
          <h2 className="mt-2 text-xl font-semibold" aria-live="polite">
            {update.status === "complete"
              ? "Your study is ready."
              : update.status === "cancelled"
                ? "Study cancelled."
                : update.status === "queued"
                  ? "Study queued."
                  : "Preparing your study…"}
          </h2>
        </div>
        {active && (
          <button
            type="button"
            onClick={() => {
              try {
                cancelLocalRun(job.id);
              } catch {
                setError(
                  "Could not save cancellation. Enable browser storage and try again.",
                );
              }
            }}
            className="min-h-11 rounded-full border border-white/15 px-5 text-sm"
          >
            Cancel study
          </button>
        )}
      </div>
      <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">
        Authored{" "}
        {job.configuration.media === "video"
          ? "motion posters, not generated video clips"
          : "image studies, not AI-generated images"}
        . Prompt and preset select a study; references and output settings do
        not transform its pixels. The recipe and latest run are saved on this
        browser only.
      </p>
      {active && (
        <div
          role="progressbar"
          aria-label="Study progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={update.progress}
          className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full bg-[var(--action)] transition-[width] motion-reduce:transition-none"
            style={{ width: `${update.progress}%` }}
          />
        </div>
      )}
      {update.status === "complete" && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {guidedOutputs(job).map((output) => (
            <Link
              key={output.id}
              href={creationDetailHref(output.id)}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
            >
              <div className="relative aspect-square">
                <Image
                  src={output.src}
                  alt={`${output.title} authored guided study`}
                  fill
                  sizes="(max-width:640px) 90vw, 30vw"
                  className="object-contain"
                />
              </div>
              <p className="p-4 text-sm">
                {output.title}
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  Inspect authored study →
                </span>
              </p>
            </Link>
          ))}
        </div>
      )}
      <details className="mt-5 text-xs text-[var(--text-muted)]">
        <summary className="min-h-8 cursor-pointer">Run recipe</summary>
        <p className="mt-2 leading-6 whitespace-pre-wrap">
          {job.configuration.prompt}
        </p>
        <p className="mt-2">
          {job.configuration.modelId} · {job.configuration.ratio} ·{" "}
          {job.configuration.quantity} output(s) ·{" "}
          {job.configuration.referenceCount} local reference(s)
        </p>
      </details>
      {error && (
        <p role="alert" className="mt-3 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
      <Link
        href={resultHref(job.id)}
        className="mt-5 inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm"
      >
        Open result and actions →
      </Link>
    </section>
  );
}
