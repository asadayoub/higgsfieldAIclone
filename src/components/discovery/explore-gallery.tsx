"use client";

import { useMemo, useTransition } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ImageIcon, Search, SlidersHorizontal, Video, X } from "lucide-react";
import {
  creationCategories,
  creationTypes,
  creations,
  type CreationCategory,
} from "@/content/creations";
import { CreationCard } from "@/components/discovery/creation-card";
import {
  defaultDiscoveryFilters,
  filterCreations,
  filtersToSearchParams,
  normalizeDiscoveryFilters,
  type DiscoveryFilters,
} from "@/lib/discovery/filter-creations";
import { cn } from "@/lib/cn";

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ExploreGallery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const filters = useMemo(
    () =>
      normalizeDiscoveryFilters({
        q: searchParams.get("q"),
        type: searchParams.get("type"),
        category: searchParams.get("category"),
      }),
    [searchParams],
  );
  const query = filters.q;

  const filtered = useMemo(
    () => filterCreations(creations, filters),
    [filters],
  );

  function navigate(next: DiscoveryFilters, replace = false) {
    const params = filtersToSearchParams(next);
    const href = (params.size ? `${pathname}?${params}` : pathname) as Route;
    startTransition(() => {
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  function updateQuery(value: string) {
    navigate({ ...filters, q: value.trimStart().slice(0, 120) }, true);
  }

  function clearFilters() {
    navigate(defaultDiscoveryFilters);
  }

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
            className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
          >
            Find a direction worth taking.
          </h2>
        </div>
        <div className="relative w-full xl:max-w-md">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--text-faint)]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search prompts, models, creators…"
            aria-label="Search public creations"
            className="h-12 w-full rounded-full border border-[var(--line)] bg-[var(--control)] pr-11 pl-11 text-sm text-white placeholder:text-[var(--text-faint)] hover:border-[var(--line-strong)]"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => updateQuery("")}
              className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-white/8 hover:text-white"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-6 space-y-3" aria-label="Creation filters">
        <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto pb-1">
          <SlidersHorizontal
            aria-hidden="true"
            className="mr-1 size-4 shrink-0 text-[var(--text-faint)]"
          />
          {creationTypes.map((type) => {
            const active = filters.type === type;
            const Icon = type === "video" ? Video : ImageIcon;
            return (
              <button
                type="button"
                key={type}
                aria-pressed={active}
                onClick={() => navigate({ ...filters, type })}
                className={cn(
                  "inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition",
                  active
                    ? "border-[var(--action)] bg-[var(--action)] text-[var(--action-ink)]"
                    : "border-[var(--line)] bg-white/4 text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-white",
                )}
              >
                {type !== "all" ? (
                  <Icon aria-hidden="true" className="size-3.5" />
                ) : null}
                {type === "all" ? "All media" : label(type)}
              </button>
            );
          })}
          <span
            aria-hidden="true"
            className="mx-1 h-5 w-px shrink-0 bg-white/10"
          />
          {["all", ...creationCategories].map((category) => {
            const value = category as "all" | CreationCategory;
            const active = filters.category === value;
            return (
              <button
                type="button"
                key={category}
                aria-pressed={active}
                onClick={() => navigate({ ...filters, category: value })}
                className={cn(
                  "min-h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-xs font-medium transition",
                  active
                    ? "border-white/25 bg-white text-black"
                    : "border-[var(--line)] bg-white/4 text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-white",
                )}
              >
                {category === "all" ? "All styles" : label(category)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex min-h-6 items-center justify-between gap-4 text-xs text-[var(--text-faint)]">
        <p aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "creation" : "creations"}
          {isPending ? " · updating" : ""}
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="cursor-pointer font-semibold text-[var(--text-muted)] hover:text-white"
          >
            Reset filters
          </button>
        ) : null}
      </div>

      {filtered.length ? (
        <div
          className={cn(
            "columns-1 gap-4 transition-opacity sm:columns-2 lg:columns-3 xl:columns-4",
            isPending && "opacity-65",
          )}
        >
          {filtered.map((creation) => (
            <CreationCard key={creation.id} creation={creation} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.025] px-6 py-20 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/7 text-[var(--text-muted)]">
            <Search aria-hidden="true" className="size-5" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">No direction found</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
            Try a broader phrase or clear a filter. The catalog searches
            prompts, models, presets, categories, and creator names.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 min-h-10 cursor-pointer rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)] hover:bg-[var(--action-hover)]"
          >
            Show every creation
          </button>
        </div>
      )}
    </section>
  );
}
