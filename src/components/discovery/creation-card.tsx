import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clapperboard, WandSparkles } from "lucide-react";
import type { Creation } from "@/content/creations";
import {
  creationDetailHref,
  creationToStudioHref,
} from "@/lib/discovery/creation-recipe";

export function CreationCard({ creation }: { creation: Creation }) {
  const detailHref = creationDetailHref(creation.id);
  const studioHref = creationToStudioHref(creation);

  return (
    <article className="group mb-4 break-inside-avoid overflow-hidden rounded-[1.25rem] border border-white/8 bg-[var(--panel)] shadow-[0_16px_50px_rgba(0,0,0,0.16)] transition duration-300 focus-within:border-[var(--focus)] hover:-translate-y-0.5 hover:border-white/16">
      <div className="relative overflow-hidden bg-[#111315]">
        <Link
          href={detailHref}
          aria-label={`Open ${creation.title} creative recipe`}
          className="block"
        >
          <Image
            src={creation.src}
            alt={`${creation.title}, an original ${creation.category} ${creation.type} study`}
            width={creation.width}
            height={creation.height}
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
            className="h-auto w-full transition duration-500 group-hover:scale-[1.015]"
          />
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/70 via-black/10 to-transparent p-3 pb-10">
          <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white/85 uppercase backdrop-blur-md">
            {creation.type === "video" ? (
              <span className="inline-flex items-center gap-1.5">
                <Clapperboard aria-hidden="true" className="size-3" /> Motion
              </span>
            ) : (
              creation.category
            )}
          </span>
          <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur-md">
            {creation.ratio}
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pt-16 pb-4 opacity-0 transition duration-300 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden">
          <p className="line-clamp-3 text-xs leading-5 text-white/75">
            {creation.prompt}
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={detailHref}
              className="inline-flex max-w-full items-center gap-1.5 text-sm font-semibold tracking-[-0.01em] text-white hover:text-[var(--action)]"
            >
              <span className="truncate">{creation.title}</span>
              <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
            </Link>
            <p className="mt-1 truncate text-xs text-[var(--text-faint)]">
              {creation.author}
            </p>
          </div>
          <Link
            href={studioHref}
            aria-label={`Recreate ${creation.title}`}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/8 px-3 text-xs font-semibold text-white transition hover:bg-[var(--action)] hover:text-[var(--action-ink)]"
          >
            <WandSparkles aria-hidden="true" className="size-3.5" />
            Recreate
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-white/7 pt-3 text-[11px] text-[var(--text-muted)]">
          <span className="truncate">{creation.model}</span>
          <span aria-hidden="true" className="text-white/20">
            /
          </span>
          <span className="truncate">{creation.preset}</span>
        </div>
      </div>
    </article>
  );
}
