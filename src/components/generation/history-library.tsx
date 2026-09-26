"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  localHistorySnapshot,
  localHistoryServerSnapshot,
  subscribeLocalHistory,
  migrateLatestGuidedRun,
} from "@/lib/generation/local-history";
import { guidedJobUpdate, guidedOutputs } from "@/lib/generation/guided-job";
import { filterHistory, type HistoryEntry } from "@/lib/generation/history";
import { resultHref, type RunRecord } from "@/lib/generation/contracts";
import { getStudioModel } from "@/content/studio-models";

export function HistoryLibrary({
  cloud,
  signedIn,
  library = false,
  error,
}: {
  cloud: RunRecord[];
  signedIn: boolean;
  library?: boolean;
  error?: string;
}) {
  const local = useSyncExternalStore(
    subscribeLocalHistory,
    localHistorySnapshot,
    localHistoryServerSnapshot,
  );
  const router = useRouter();
  useEffect(() => {
    if (!signedIn) return;
    const timer = setInterval(() => router.refresh(), 8 * 60 * 1000);
    return () => clearInterval(timer);
  }, [signedIn, router]);
  const [query, setQuery] = useState("");
  const [media, setMedia] = useState("all");
  const [status, setStatus] = useState("all");
  const [favorites, setFavorites] = useState(false);
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(0);
  useEffect(() => {
    try {
      migrateLatestGuidedRun();
    } catch {
      /* Empty history stays usable if storage is blocked. */
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const legacyEntries: HistoryEntry[] = local.map((record) => ({
    id: record.job.id,
    execution: "guided" as const,
    media: record.job.configuration.media,
    status: guidedJobUpdate(record.job, now || record.job.createdAt).status,
    prompt: record.job.configuration.prompt,
    modelId: record.job.configuration.modelId,
    createdAt: record.job.createdAt,
    favorite: record.favorite,
    preview: guidedOutputs(record.job)[0]?.src ?? "",
  }));
  const entries: HistoryEntry[] = [
    ...(library ? [] : legacyEntries),
    ...cloud.map((run) => ({
      id: run.id,
      execution: "live" as const,
      media: run.configuration.media,
      status: run.status,
      prompt: run.configuration.prompt,
      modelId: run.configuration.modelId,
      createdAt: Date.parse(run.createdAt),
      favorite: run.assets.some((asset) => asset.favorite),
      preview: run.assets[0]?.media === "image" ? run.assets[0].url : "",
      fundingSource: run.fundingSource,
      resolvedModel: run.resolvedModel,
      actualCostUsd: run.actualCostUsd,
      provider: run.provider,
    })),
  ];
  const filtered = filterHistory(entries, {
    query,
    media,
    status,
    favorites,
    completedOnly: library,
    page,
  });
  const control =
    "min-h-11 rounded-xl border border-white/10 bg-[var(--control)] px-3 text-sm";
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-widest text-[var(--action)] uppercase">
        {library ? "Your asset library" : "Creative history"}
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        {library ? "Every finished frame." : "Every run. Every direction."}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
        {library
          ? "Only private generated outputs are included in Assets. "
          : "Legacy authored studies remain readable in this browser but are not AI outputs. "}
        {signedIn
          ? "Your latest 100 private provider runs are loaded from your account."
          : "Sign in to view private generated runs across devices."}
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <div className="mt-7 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-2 text-xs text-[var(--text-muted)]">
          Search history
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Prompt or model"
            className={control}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs text-[var(--text-muted)]">
          Media
          <select
            value={media}
            onChange={(e) => {
              setMedia(e.target.value);
              setPage(1);
            }}
            className={control}
          >
            <option value="all">All media</option>
            <option value="image">Images</option>
            <option value="video">Video</option>
          </select>
        </label>
        {!library && (
          <label className="flex flex-col gap-2 text-xs text-[var(--text-muted)]">
            Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={control}
            >
              {[
                "all",
                "queued",
                "processing",
                "saving",
                "complete",
                "failed",
                "cancelled",
              ].map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All statuses" : item}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          aria-pressed={favorites}
          onClick={() => {
            setFavorites(!favorites);
            setPage(1);
          }}
          className={`${control} ${favorites ? "text-[var(--action)]" : "text-[var(--text-muted)]"}`}
        >
          Favorites only
        </button>
        <Link
          href="/studio"
          className="inline-flex min-h-11 items-center rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)]"
        >
          New creation
        </Link>
      </div>
      <p role="status" className="mt-6 text-xs text-[var(--text-muted)]">
        {filtered.total} {library ? "finished runs" : "runs"}
      </p>
      {filtered.entries.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.entries.map((entry) => (
            <Link
              key={`${entry.execution}:${entry.id}`}
              href={resultHref(entry.id)}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-[var(--panel)] hover:border-white/25"
            >
              <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-black/25">
                {entry.preview && entry.status === "complete" ? (
                  <Image
                    src={entry.preview}
                    alt={
                      entry.execution === "guided"
                        ? "Legacy authored study"
                        : "Private AI result"
                    }
                    fill
                    sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 25vw"
                    unoptimized={entry.execution === "live"}
                    className="object-contain transition-transform group-hover:scale-105 motion-reduce:transition-none"
                  />
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">
                    {entry.media === "video" && entry.status === "complete"
                      ? "Video · open to play"
                      : entry.status}
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-[10px] tracking-widest text-[var(--action)] uppercase">
                  {entry.execution === "guided"
                    ? "Legacy authored study"
                    : `${entry.provider === "huggingface" ? "Hugging Face" : "OpenRouter"} · private`}
                  {entry.favorite ? " · ★" : ""}
                </p>
                <h2 className="mt-2 line-clamp-2 text-sm leading-6">
                  {entry.prompt}
                </h2>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  {entry.resolvedModel ??
                    getStudioModel(entry.modelId)?.name ??
                    entry.modelId}{" "}
                  · {entry.status}
                </p>
                {entry.execution === "live" ? (
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                    {entry.fundingSource === "system_free"
                      ? "Free allowance"
                      : entry.fundingSource === "personal_key"
                        ? "Personal key"
                        : "Legacy"}
                    {entry.actualCostUsd !== null &&
                    entry.actualCostUsd !== undefined
                      ? ` · $${entry.actualCostUsd.toFixed(6)}`
                      : " · Cost not reported"}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="mt-6 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold">
            {entries.length
              ? "No matching runs."
              : "Your next creation starts here."}
          </h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {entries.length
              ? "Try another prompt, model, or filter."
              : library
                ? "Complete a real generation to add it to your private Assets."
                : "Start a real provider generation from the studio."}
          </p>
        </section>
      )}
      <nav
        aria-label="History pages"
        className="mt-7 flex items-center justify-center gap-5 text-sm"
      >
        <button
          disabled={filtered.page === 1}
          type="button"
          onClick={() => setPage(filtered.page - 1)}
          className="min-h-11 rounded-full border border-white/15 px-5 disabled:opacity-40"
        >
          Previous
        </button>
        <span>
          {filtered.page} / {filtered.pages}
        </span>
        <button
          disabled={filtered.page === filtered.pages}
          type="button"
          onClick={() => setPage(filtered.page + 1)}
          className="min-h-11 rounded-full border border-white/15 px-5 disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </main>
  );
}
