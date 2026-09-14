"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Copy, Heart, Share2, WandSparkles } from "lucide-react";
import type { Creation } from "@/content/creations";
import { useToast } from "@/components/ui/toast";
import { creationToStudioHref } from "@/lib/discovery/creation-recipe";
import { cn } from "@/lib/cn";

const favoritesKey = "lumaforge:favorite-creations";
const favoritesEvent = "lumaforge:favorites-changed";

function readFavorite(id: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(favoritesKey) ?? "[]");
    return Array.isArray(stored) && stored.includes(id);
  } catch {
    return false;
  }
}

function subscribeFavorites(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(favoritesEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(favoritesEvent, callback);
  };
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function CreationActions({ creation }: { creation: Creation }) {
  const { notify } = useToast();
  const favorite = useSyncExternalStore(
    subscribeFavorites,
    () => readFavorite(creation.id),
    () => false,
  );

  function toggleFavorite() {
    const current = new Set<string>();
    try {
      const stored = JSON.parse(localStorage.getItem(favoritesKey) ?? "[]");
      if (Array.isArray(stored)) {
        for (const id of stored) if (typeof id === "string") current.add(id);
      }
    } catch {
      // A malformed visitor cache is safely replaced below.
    }
    if (current.has(creation.id)) current.delete(creation.id);
    else current.add(creation.id);
    localStorage.setItem(favoritesKey, JSON.stringify([...current]));
    window.dispatchEvent(new Event(favoritesEvent));
    notify(
      current.has(creation.id)
        ? "Saved to favorites"
        : "Removed from favorites",
    );
  }

  async function handleCopyPrompt() {
    try {
      await copyText(creation.prompt);
      notify("Prompt copied");
    } catch {
      notify("Clipboard access is unavailable");
    }
  }

  async function handleCopyLink() {
    try {
      await copyText(`${window.location.origin}/creation/${creation.id}`);
      notify("Public creation link copied");
    } catch {
      notify("Clipboard access is unavailable");
    }
  }

  return (
    <div className="mt-7 flex flex-wrap gap-2">
      <Link
        href={creationToStudioHref(creation)}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)] transition hover:bg-[var(--action-hover)] sm:flex-none"
      >
        <WandSparkles aria-hidden="true" className="size-4" />
        <span className="sm:hidden">Recreate</span>
        <span className="hidden sm:inline">Recreate in Studio</span>
      </Link>
      <button
        type="button"
        onClick={handleCopyPrompt}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white"
        aria-label="Copy prompt"
      >
        <Copy aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white"
        aria-label="Copy public link"
      >
        <Share2 aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        onClick={toggleFavorite}
        aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={favorite}
        className={cn(
          "inline-flex size-11 cursor-pointer items-center justify-center rounded-full border transition",
          favorite
            ? "border-[var(--action)] bg-[var(--action)] text-[var(--action-ink)]"
            : "border-[var(--line)] bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white",
        )}
      >
        <Heart
          aria-hidden="true"
          className={cn("size-4", favorite && "fill-current")}
        />
      </button>
    </div>
  );
}
