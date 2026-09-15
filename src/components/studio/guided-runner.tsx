"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  cancelGuidedJob,
  createGuidedJob,
  guidedJobUpdate,
  guidedOutputs,
  readGuidedJob,
  type GuidedJob,
} from "@/lib/generation/guided-job";
import type { StudioConfiguration } from "@/lib/studio/validation";
import { creationDetailHref } from "@/lib/discovery/creation-recipe";

const storageKey = "lumaforge:guided-job:v1";
const changeEvent = "lumaforge:guided-job-change";
let cachedRaw: string | null | undefined;
let cachedJob: GuidedJob | null = null;

function snapshot() {
  let raw: string | null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    return cachedJob;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedJob = readGuidedJob(raw, Date.now());
  }
  return cachedJob;
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(changeEvent, listener);
  };
}
function persist(job: GuidedJob) {
  localStorage.setItem(storageKey, JSON.stringify(job));
  window.dispatchEvent(new Event(changeEvent));
}

export function startGuidedRun(configuration: StudioConfiguration) {
  // A second click reuses the active record instead of starting another run.
  const current = snapshot();
  if (
    current &&
    ["queued", "processing"].includes(
      guidedJobUpdate(current, Date.now()).status,
    )
  )
    return current;
  const job = createGuidedJob(crypto.randomUUID(), configuration, Date.now());
  persist(job);
  return job;
}

export function GuidedRunner() {
  const job = useSyncExternalStore(subscribe, snapshot, () => null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);
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
                persist(cancelGuidedJob(job, Date.now()));
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
    </section>
  );
}
