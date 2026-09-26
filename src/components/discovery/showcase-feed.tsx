"use client";

import type { Route } from "next";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ImageIcon, Search, SlidersHorizontal, Video, X } from "lucide-react";
import { creationCategories } from "@/content/creations";
import { cn } from "@/lib/cn";
import {
  showcaseFiltersToSearchParams,
  showcasePageSchema,
  type ShowcaseFilters,
  type ShowcasePage,
} from "@/lib/showcase/contracts";
import { ShowcaseGrid } from "./showcase-grid";

export function ShowcaseFeed({
  initialPage,
  filters,
  initialError = "",
}: {
  initialPage: ShowcasePage;
  filters: ShowcaseFilters;
  initialError?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sentinel = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [isPending, startTransition] = useTransition();

  function navigate(next: ShowcaseFilters, replace = false) {
    const params = showcaseFiltersToSearchParams(next);
    const href = (params.size ? `${pathname}?${params}` : pathname) as Route;
    startTransition(() => {
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  const loadMore = useCallback(async () => {
    if (!page.hasMore || !page.nextCursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const params = showcaseFiltersToSearchParams(filters);
      params.set("cursor", page.nextCursor);
      const response = await fetch(`/api/showcase?${params}`, {
        headers: { Accept: "application/json" },
      });
      const parsed = showcasePageSchema.safeParse(await response.json());
      if (!response.ok || !parsed.success) throw new Error("showcase_failed");
      setPage((current) => {
        const known = new Set(current.items.map((item) => item.id));
        return {
          ...parsed.data,
          items: [
            ...current.items,
            ...parsed.data.items.filter((item) => !known.has(item.id)),
          ],
        };
      });
    } catch {
      setError("More public work could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  }, [filters, loading, page.hasMore, page.nextCursor]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !page.hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [loadMore, page.hasMore]);

  const hasFilters =
    Boolean(filters.q) || filters.type !== "all" || filters.category !== "all";

  return (
    <section
      id="explore"
      aria-labelledby="explore-title"
      className="scroll-mt-24"
    >
      <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--action)] uppercase">
            Public showcase
          </p>
          <h2
            id="explore-title"
            className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.045em] sm:text-5xl"
          >
            Made here. Shared by choice.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Original editorial studies and opt-in community generations,
            arranged as a living wall of image and motion.
          </p>
        </div>
        <div className="relative w-full xl:max-w-md">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--text-faint)]"
          />
          <input
            type="search"
            value={filters.q}
            onChange={(event) =>
              navigate({ ...filters, q: event.target.value.slice(0, 80) }, true)
            }
            placeholder="Search public titles and styles…"
            aria-label="Search public showcase"
            className="h-12 w-full rounded-full border border-[var(--line)] bg-[var(--control)] pr-11 pl-11 text-sm text-white placeholder:text-[var(--text-faint)] hover:border-[var(--line-strong)]"
          />
          {filters.q ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => navigate({ ...filters, q: "" }, true)}
              className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-white/8 hover:text-white"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-6 flex [scrollbar-width:none] items-center gap-2 overflow-x-auto pb-1">
        <SlidersHorizontal
          aria-hidden="true"
          className="mr-1 size-4 shrink-0 text-[var(--text-faint)]"
        />
        {(["all", "image", "video"] as const).map((type) => {
          const Icon = type === "video" ? Video : ImageIcon;
          const active = filters.type === type;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={active}
              onClick={() => navigate({ ...filters, type })}
              className={cn(
                "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition",
                active
                  ? "border-[var(--action)] bg-[var(--action)] text-[var(--action-ink)]"
                  : "border-[var(--line)] bg-white/4 text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-white",
              )}
            >
              {type !== "all" ? (
                <Icon aria-hidden="true" className="size-3.5" />
              ) : null}
              {type === "all"
                ? "All media"
                : type === "image"
                  ? "Images"
                  : "Videos"}
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="mx-1 h-5 w-px shrink-0 bg-white/10"
        />
        {(["all", ...creationCategories] as const).map((category) => {
          const active = filters.category === category;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => navigate({ ...filters, category })}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium capitalize transition",
                active
                  ? "border-white/25 bg-white text-black"
                  : "border-[var(--line)] bg-white/4 text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-white",
              )}
            >
              {category === "all" ? "All styles" : category}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex min-h-6 items-center justify-between gap-4 text-xs text-[var(--text-faint)]">
        <p aria-live="polite">
          {page.items.length} loaded
          {loading ? " · loading more" : isPending ? " · updating" : ""}
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => navigate({ q: "", type: "all", category: "all" })}
            className="font-semibold text-[var(--text-muted)] hover:text-white"
          >
            Reset filters
          </button>
        ) : null}
      </div>

      {page.items.length ? (
        <ShowcaseGrid items={page.items} />
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.025] px-6 py-20 text-center">
          <Search
            aria-hidden="true"
            className="mx-auto size-6 text-[var(--text-muted)]"
          />
          <h3 className="mt-4 text-lg font-semibold">No public work found</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Try a broader title, media type, or category.
          </p>
        </div>
      )}

      <div
        ref={sentinel}
        className="mt-8 flex min-h-16 flex-col items-center justify-center gap-3"
      >
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        {page.hasMore ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadMore()}
            className="min-h-11 rounded-full border border-white/14 bg-white/[0.04] px-6 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Loading public work…" : error ? "Retry" : "Load more"}
          </button>
        ) : page.items.length ? (
          <p className="text-xs text-[var(--text-faint)]">
            You reached the end of the public wall.
          </p>
        ) : null}
      </div>
    </section>
  );
}
