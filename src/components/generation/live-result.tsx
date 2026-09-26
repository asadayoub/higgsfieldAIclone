"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  pollGeneration,
  readGeneration,
  setAssetFavorite,
  shareAsset,
  unshareAsset,
  updateAssetShowcase,
} from "@/app/results/actions";
import {
  configurationHref,
  shareHref,
  type RunRecord,
} from "@/lib/generation/contracts";
import { Dialog } from "@/components/ui/dialog";
import { creationCategories } from "@/content/creations";

export function LiveResult({ initial }: { initial: RunRecord }) {
  const [run, setRun] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareId, setShareId] = useState<string | null>(null);
  const [listInShowcase, setListInShowcase] = useState(false);
  const [publicTitle, setPublicTitle] = useState("");
  const [publicCategory, setPublicCategory] = useState("");
  const [publicAlt, setPublicAlt] = useState("");
  const active = ["queued", "processing", "saving"].includes(run.status);
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
  const selectedAsset = run.assets.find((asset) => asset.id === shareId);
  function openPublication(asset: RunRecord["assets"][number]) {
    setShareId(asset.id);
    setListInShowcase(asset.showcaseListed);
    setPublicTitle(asset.publicTitle ?? "");
    setPublicCategory(asset.publicCategory ?? "");
    setPublicAlt(asset.publicAltText ?? "");
  }
  return (
    <section className="rounded-3xl border border-white/10 bg-[var(--panel)] p-5 sm:p-8">
      <p className="text-xs font-semibold tracking-widest text-[var(--action)] uppercase">
        {run.fundingSource === "system_free"
          ? "Free daily allowance"
          : run.fundingSource === "personal_key"
            ? "Personal OpenRouter key"
            : "Legacy provider run"}{" "}
        · Private workspace
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
              : run.status === "saving"
                ? "Saving to your private workspace…"
                : "Generation in progress…"}
      </h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        {run.provider === "huggingface" ? "Hugging Face" : "OpenRouter"} ·{" "}
        {run.status} · {run.resolvedModel} · {run.configuration.ratio} ·{" "}
        {new Date(run.createdAt).toLocaleString()}
      </p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Safe provider status: {run.status}
        {run.actualCostUsd !== null
          ? ` · Provider cost: $${run.actualCostUsd.toFixed(6)}`
          : " · Cost not reported"}
        {run.fundingSource === "system_free" && run.allowance
          ? ` · ${run.allowance.remaining} of ${run.allowance.limit} free runs remain · resets ${new Date(run.allowance.resetsAt).toLocaleString()}`
          : ""}
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
                    onClick={() => openPublication(asset)}
                    className="min-h-11 rounded-full border border-white/15 px-5 text-sm"
                  >
                    {asset.showcaseListed
                      ? "Edit Explore listing"
                      : "List in Explore"}
                  </button>
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
                  onClick={() => openPublication(asset)}
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
          <h2 className="text-2xl font-semibold">
            {selectedAsset?.publicSlug
              ? "Public showcase settings"
              : "Make this output public?"}
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Anyone with the link can view and download a public copy. Your
            references, prompt, and private storage location are not shared.
            Revoking cannot retract downloaded copies.
          </p>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <input
              type="checkbox"
              checked={listInShowcase}
              onChange={(event) => setListInShowcase(event.target.checked)}
              className="mt-1 size-4 accent-[var(--action)]"
            />
            <span>
              <span className="block text-sm font-semibold">
                List this work in Explore
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                This makes the media and the public details below discoverable
                in the landing-page showcase. Your private prompt stays hidden.
              </span>
            </span>
          </label>
          {listInShowcase ? (
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Public title
                <input
                  value={publicTitle}
                  onChange={(event) =>
                    setPublicTitle(event.target.value.slice(0, 100))
                  }
                  required
                  maxLength={100}
                  placeholder="Give this work a title"
                  className="h-11 rounded-xl border border-[var(--line)] bg-[var(--control)] px-3 text-white"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Category
                <select
                  value={publicCategory}
                  onChange={(event) => setPublicCategory(event.target.value)}
                  required
                  className="h-11 rounded-xl border border-[var(--line)] bg-[var(--control)] px-3 text-white"
                >
                  <option value="">Choose a category</option>
                  {creationCategories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Public description
                <textarea
                  value={publicAlt}
                  onChange={(event) =>
                    setPublicAlt(event.target.value.slice(0, 240))
                  }
                  required
                  minLength={3}
                  maxLength={240}
                  rows={3}
                  placeholder="Describe what is visible without copying your private prompt"
                  className="rounded-xl border border-[var(--line)] bg-[var(--control)] px-3 py-2.5 text-white"
                />
              </label>
            </div>
          ) : null}
          <button
            type="button"
            disabled={
              busy ||
              (listInShowcase &&
                (!publicTitle.trim() ||
                  !publicCategory ||
                  publicAlt.trim().length < 3))
            }
            onClick={() => {
              const id = shareId;
              if (!id) return;
              const input = {
                confirmed: true as const,
                listInShowcase,
                title: publicTitle,
                category: publicCategory,
                alt: publicAlt,
              };
              const existing = Boolean(selectedAsset?.publicSlug);
              setShareId(null);
              void action(() =>
                existing
                  ? updateAssetShowcase(id, input)
                  : shareAsset(id, input),
              );
            }}
            className="mt-6 min-h-11 w-full rounded-full bg-[var(--action)] text-sm font-semibold text-[var(--action-ink)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {selectedAsset?.publicSlug
              ? "Save public settings"
              : listInShowcase
                ? "Publish and list in Explore"
                : "Publish link only"}
          </button>
        </div>
      </Dialog>
    </section>
  );
}
