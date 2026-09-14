import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import { Suspense } from "react";
import { ExploreGallery } from "@/components/discovery/explore-gallery";
import { ExploreSkeleton } from "@/components/discovery/explore-skeleton";

export default function ExplorePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--page)] text-[var(--text)]">
      <section className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-5 lg:px-8 lg:pt-6">
        <div className="relative min-h-[34rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101214] sm:min-h-[38rem] lg:min-h-[43rem]">
          <Image
            src="/brand/lumaforge-cover.png"
            alt="A cinematic LumaForge composition of cobalt glass, windswept fashion, and desert architecture"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[66%_center] sm:object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,7,0.94)_0%,rgba(5,6,7,0.68)_40%,rgba(5,6,7,0.08)_76%),linear-gradient(0deg,rgba(5,6,7,0.72)_0%,transparent_45%)]" />

          <div className="relative flex min-h-[34rem] max-w-2xl flex-col justify-between p-6 sm:min-h-[38rem] sm:p-10 lg:min-h-[43rem] lg:p-14">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-white/65 uppercase">
              <span className="size-1.5 rounded-full bg-[var(--action)] shadow-[0_0_18px_var(--action)]" />
              Original systems for image + motion
            </div>

            <div>
              <p className="mb-5 text-xs font-semibold tracking-[0.2em] text-[var(--action)] uppercase">
                Creative intelligence, directed by you
              </p>
              <h1 className="max-w-xl text-5xl leading-[0.92] font-semibold tracking-[-0.06em] text-balance sm:text-7xl lg:text-[5.7rem]">
                Start with a feeling. Leave with a frame.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-pretty text-white/68 sm:text-lg">
                Inspect the recipe behind remarkable visuals, reshape the
                direction, and carry it into one focused studio.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/studio"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)] transition hover:bg-[var(--action-hover)]"
                >
                  Create from scratch
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
                <a
                  href="#explore"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/16 bg-black/25 px-5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
                >
                  Explore directions
                  <ArrowDown aria-hidden="true" className="size-4" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-white/55">
              <span className="flex size-8 items-center justify-center rounded-full border border-white/14 bg-black/30">
                <Play
                  aria-hidden="true"
                  className="ml-0.5 size-3 fill-current"
                />
              </span>
              <span>Featured direction · Cobalt / Ember</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1600px] px-4 py-20 sm:px-5 lg:px-8 lg:py-28">
        <Suspense fallback={<ExploreSkeleton />}>
          <ExploreGallery />
        </Suspense>
      </div>
    </main>
  );
}
