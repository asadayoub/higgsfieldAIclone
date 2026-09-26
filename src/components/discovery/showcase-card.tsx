import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, Clapperboard, WandSparkles } from "lucide-react";
import type { ShowcaseItem } from "@/lib/showcase/contracts";
import { ShowcaseVideo } from "./showcase-video";

export function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  return (
    <article className="group relative size-full min-h-[18rem] overflow-hidden rounded-[1.35rem] border border-white/9 bg-[#101216] shadow-[0_22px_60px_rgba(0,0,0,0.2)] transition duration-300 focus-within:border-[var(--focus)] hover:-translate-y-0.5 hover:border-white/18 sm:min-h-[20rem] lg:min-h-0">
      <Link
        href={item.detailHref as Route}
        aria-label={`Open ${item.title}`}
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">Open {item.title}</span>
      </Link>
      <div className="absolute inset-0">
        {item.media === "video" && item.source === "community" ? (
          <ShowcaseVideo src={item.publicUrl} />
        ) : (
          <Image
            src={item.publicUrl}
            alt={item.alt}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            unoptimized={item.source === "community"}
            className="object-cover transition duration-700 group-hover:scale-[1.025]"
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/38" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
        <span className="rounded-full border border-white/15 bg-black/38 px-2.5 py-1 text-[10px] font-semibold tracking-[0.13em] text-white/85 uppercase backdrop-blur-md">
          {item.media === "video" ? (
            <span className="inline-flex items-center gap-1.5">
              <Clapperboard aria-hidden="true" className="size-3" /> Motion
            </span>
          ) : (
            item.category
          )}
        </span>
        <span className="rounded-full border border-white/10 bg-black/38 px-2.5 py-1 text-[10px] text-white/65 backdrop-blur-md">
          {item.source === "editorial" ? "Editorial" : "Community"}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-white sm:text-lg">
              {item.title}
            </h3>
            <p className="mt-1 truncate text-[11px] text-white/55">
              {item.modelLabel ?? "Live generation"} · {item.ratio}
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition group-hover:bg-[var(--action)] group-hover:text-[var(--action-ink)]">
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </span>
        </div>
      </div>
      {item.recreateHref ? (
        <Link
          href={item.recreateHref as Route}
          aria-label={`Recreate ${item.title}`}
          className="absolute right-4 bottom-[4.8rem] z-20 hidden min-h-9 items-center gap-1.5 rounded-full border border-white/12 bg-black/55 px-3 text-xs font-semibold text-white backdrop-blur-md transition group-focus-within:flex group-hover:flex hover:bg-[var(--action)] hover:text-[var(--action-ink)] sm:flex sm:translate-y-2 sm:opacity-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
        >
          <WandSparkles aria-hidden="true" className="size-3.5" />
          Recreate
        </Link>
      ) : null}
    </article>
  );
}
