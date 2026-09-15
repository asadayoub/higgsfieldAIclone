"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  localHistorySnapshot,
  localHistoryServerSnapshot,
  subscribeLocalHistory,
  migrateLatestGuidedRun,
  cancelLocalRun,
  favoriteLocalRun,
} from "@/lib/generation/local-history";
import { guidedJobUpdate, guidedOutputs } from "@/lib/generation/guided-job";
import { configurationHref } from "@/lib/generation/contracts";
export function LocalResult({ id }: { id: string }) {
  const history = useSyncExternalStore(
    subscribeLocalHistory,
    localHistorySnapshot,
    localHistoryServerSnapshot,
  );
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      migrateLatestGuidedRun();
    } catch {
      /* Explain unavailable history below. */
    }
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      const job = localHistorySnapshot().find(
        (record) => record.job.id === id,
      )?.job;
      if (
        !job ||
        !["queued", "processing"].includes(guidedJobUpdate(job, current).status)
      )
        clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [id, history]);
  const record = history.find((record) => record.job.id === id);
  if (!record)
    return (
      <section className="rounded-3xl border border-white/10 p-8">
        <h1 className="text-3xl font-semibold">Result unavailable here.</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
          Guided runs belong to the browser where they were created. For a
          private live result, sign in with the account that created it.
        </p>
        <Link
          href={
            `/account?next=${encodeURIComponent(`/results/${id}`)}` as never
          }
          className="mt-5 inline-flex min-h-11 items-center text-[var(--action)]"
        >
          Sign in →
        </Link>
        <Link href="/history" className="ml-5 text-sm">
          Open history
        </Link>
      </section>
    );
  const { job } = record;
  const update = guidedJobUpdate(job, now || job.createdAt);
  const active = ["queued", "processing"].includes(update.status);
  function action(operation: () => void) {
    try {
      operation();
      setError("");
    } catch {
      setError("Browser storage is unavailable. Enable it to save changes.");
    }
  }
  return (
    <section className="rounded-3xl border border-white/10 bg-[var(--panel)] p-5 sm:p-8">
      <p className="text-xs tracking-widest text-[var(--action)] uppercase">
        Guided · authored · browser-local
      </p>
      <h1 className="mt-3 text-3xl font-semibold" aria-live="polite">
        {update.status === "complete"
          ? "Your study is ready."
          : update.status === "cancelled"
            ? "Study cancelled."
            : "Preparing your study…"}
      </h1>
      <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
        These are authored{" "}
        {job.configuration.media === "video"
          ? "motion posters, not generated video clips"
          : "image studies, not live AI outputs"}
        . References, quality, resolution, and duration do not transform the
        assets.
      </p>
      {active && (
        <div
          role="progressbar"
          aria-label="Study progress"
          aria-valuenow={update.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full bg-[var(--action)]"
            style={{ width: `${update.progress}%` }}
          />
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/history"
          className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm"
        >
          History
        </Link>
        <Link
          href={configurationHref(job.configuration)}
          className="inline-flex min-h-11 items-center rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)]"
        >
          Reuse recipe
        </Link>
        <button
          type="button"
          onClick={() => action(() => favoriteLocalRun(id, !record.favorite))}
          className="min-h-11 rounded-full border border-white/15 px-5 text-sm"
        >
          {record.favorite ? "Remove favorite" : "Favorite study"}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => action(() => cancelLocalRun(id))}
            className="min-h-11 rounded-full border border-white/15 px-5 text-sm"
          >
            Cancel study
          </button>
        )}
      </div>
      {update.status === "complete" && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {guidedOutputs(job).map((output) => (
            <article key={output.id}>
              <Image
                src={output.src}
                alt={`${output.title} authored study`}
                width={output.width}
                height={output.height}
                className="max-h-[600px] w-full rounded-2xl border border-white/10 object-contain"
              />
              <h2 className="mt-3 text-lg">{output.title}</h2>
              <a
                href={output.src}
                download={`lumaforge-study-${output.id}.svg`}
                className="mt-2 inline-flex min-h-11 items-center text-sm text-[var(--action)]"
              >
                Download authored SVG →
              </a>
            </article>
          ))}
        </div>
      )}
      <details className="mt-6 text-sm">
        <summary className="min-h-10 cursor-pointer">Run recipe</summary>
        <p className="mt-3 leading-7 whitespace-pre-wrap text-[var(--text-muted)]">
          {job.configuration.prompt}
        </p>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          {job.configuration.modelId} · {job.configuration.preset} ·{" "}
          {job.configuration.ratio} · {job.configuration.quality} ·{" "}
          {job.configuration.resolution} · {job.configuration.quantity}{" "}
          output(s) · {job.configuration.referenceCount} reference(s)
        </p>
      </details>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
    </section>
  );
}
