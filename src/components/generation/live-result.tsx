"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  cancelGeneration,
  pollGeneration,
  readGeneration,
  setAssetFavorite,
  shareAsset,
  unshareAsset,
} from "@/app/results/actions";
import {
  configurationHref,
  shareHref,
  type RunRecord,
} from "@/lib/generation/contracts";
import { Dialog } from "@/components/ui/dialog";

export function LiveResult({ initial }: { initial: RunRecord }) {
  const [run, setRun] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareId, setShareId] = useState<string | null>(null);
  const active = run.status === "queued" || run.status === "processing";
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await (active
          ? pollGeneration(run.id)
          : readGeneration(run.id));
        if (disposed) return;
        if (response.run) setRun(response.run);
        setError(response.error ?? "");
      } catch {
        if (!disposed)
          setError(
            "Connection interrupted. Retrying private result access shortly.",
          );
      } finally {
        if (!disposed) timer = setTimeout(poll, active ? 5000 : 8 * 60 * 1000);
      }
    }
    timer = setTimeout(poll, active ? 1000 : 8 * 60 * 1000);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [run.id, active]);
  async function action(operation: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError("");
    try {
      const response = await operation();
      if (response.error) setError(response.error);
      else {
        const next = await readGeneration(run.id);
        if (next.run) setRun(next.run);
      }
    } catch {
      setError("Connection interrupted. Reopen the result to recover.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-3xl border border-white/10 bg-[var(--panel)] p-5 sm:p-8">
      <p className="text-xs font-semibold tracking-widest text-[var(--action)] uppercase">
        Live AI · {run.provider} · Private workspace
      </p>
      <h1
        className="mt-3 text-3xl font-semibold tracking-tight"
        aria-live="polite"
      >
        {run.status === "complete"
          ? "Your result is ready."
          : run.status === "failed"
            ? "This run needs attention."
            : run.status === "cancelled"
              ? "Run cancelled."
              : "Generation in progress…"}
      </h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        {run.status} · {run.configuration.modelId} · {run.configuration.ratio} ·{" "}
        {new Date(run.createdAt).toLocaleString()}
      </p>
      {active && (
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          Provider progress is checked automatically. You can leave and reopen
          this result; no new generation is submitted.
        </p>
      )}
      {(run.error || error) && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-[var(--danger)]/10 p-4 text-sm leading-6 text-[var(--danger)]"
        >
          {error || run.error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/history"
          className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm"
        >
          History
        </Link>
        <Link
          href={configurationHref(run.configuration)}
          className="inline-flex min-h-11 items-center rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)]"
        >
          {run.status === "failed" ? "Review recipe to retry" : "Reuse recipe"}
        </Link>
        {active && run.provider === "replicate" && (
          <button
            disabled={busy}
            type="button"
            onClick={() =>
              action(async () => {
                const result = await cancelGeneration(run.id);
                if (result.run) setRun(result.run);
                return result;
              })
            }
            className="min-h-11 rounded-full border border-white/15 px-5 text-sm disabled:opacity-50"
          >
            Cancel run
          </button>
        )}
      </div>
      <div className="mt-6 grid gap-6">
        {run.assets.map((asset) => (
          <article key={asset.id}>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              {asset.url ? (
                asset.media === "video" ? (
                  <video
                    src={asset.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-[650px] w-full"
                  />
                ) : (
                  <Image
                    src={asset.url}
                    alt="Private generated image"
                    width={1536}
                    height={1536}
                    unoptimized
                    className="max-h-[650px] w-full object-contain"
                  />
                )
              ) : (
                <p className="p-8 text-sm">
                  Preview unavailable. Reopen this result to refresh private
                  access.
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={`/api/assets/${asset.id}/download`}
                className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm"
              >
                Download
              </a>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  action(() => setAssetFavorite(asset.id, !asset.favorite))
                }
                className="min-h-11 rounded-full border border-white/15 px-5 text-sm disabled:opacity-50"
              >
                {asset.favorite ? "Remove favorite" : "Favorite"}
              </button>
              {asset.publicSlug ? (
                <>
                  <Link
                    href={shareHref(asset.publicSlug)}
                    className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm"
                  >
                    Open public link
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => action(() => unshareAsset(asset.id))}
                    className="min-h-11 rounded-full border border-white/15 px-5 text-sm"
                  >
                    Revoke sharing
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShareId(asset.id)}
                  className="min-h-11 rounded-full border border-white/15 px-5 text-sm"
                >
                  Publish output
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <details className="mt-7 text-sm">
        <summary className="min-h-10 cursor-pointer">
          Prompt and configuration
        </summary>
        <p className="mt-3 leading-7 whitespace-pre-wrap text-[var(--text-muted)]">
          {run.configuration.prompt}
        </p>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Preset: {run.configuration.preset} · Quality:{" "}
          {run.configuration.quality} · Resolution:{" "}
          {run.configuration.resolution} · References:{" "}
          {run.configuration.referenceCount}
          {run.configuration.media === "video"
            ? ` · Duration: ${run.configuration.duration}s`
            : ""}
        </p>
      </details>
      <Dialog
        open={shareId !== null}
        onClose={() => setShareId(null)}
        label="Publish output"
      >
        <div className="p-7">
          <h2 className="text-2xl font-semibold">Make this output public?</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Anyone with the link can view and download a public copy. Your
            references, prompt, and private storage location are not shared.
            Revoking cannot retract downloaded copies.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const id = shareId;
              if (!id) return;
              setShareId(null);
              void action(() => shareAsset(id, true));
            }}
            className="mt-6 min-h-11 w-full rounded-full bg-[var(--action)] text-sm font-semibold text-[var(--action-ink)]"
          >
            Publish public copy
          </button>
        </div>
      </Dialog>
    </section>
  );
}
