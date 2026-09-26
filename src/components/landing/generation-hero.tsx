import Link from "next/link";
import { ArrowDown, ArrowUpRight, Film, ImageIcon, Lock } from "lucide-react";
import { GenerationSceneLoader } from "./generation-scene-loader";

export function GenerationHero({ enabled }: { enabled: boolean }) {
  return (
    <section className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-5 lg:px-8 lg:pt-6">
      <div className="relative isolate min-h-[42rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#07090b] shadow-[0_32px_120px_rgba(0,0,0,0.42)] lg:min-h-[46rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_44%,rgba(64,105,255,0.2),transparent_31%),radial-gradient(circle_at_82%_72%,rgba(182,255,68,0.1),transparent_25%),linear-gradient(135deg,#08090b_0%,#0c1017_52%,#070809_100%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [mask-image:linear-gradient(to_right,black,transparent_68%)] [background-size:64px_64px] opacity-30" />

        <div className="relative grid min-h-[42rem] items-center lg:min-h-[46rem] lg:grid-cols-[0.82fr_1.18fr]">
          <div className="relative z-20 flex h-full flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase">
              <span className="size-1.5 rounded-full bg-[var(--action)] shadow-[0_0_20px_var(--action)]" />
              Image + motion generation studio
            </div>

            <div className="my-14 lg:my-0">
              <p className="mb-5 text-xs font-semibold tracking-[0.2em] text-[var(--action)] uppercase">
                Creative systems, directed by you
              </p>
              <h1 className="max-w-2xl text-5xl leading-[0.92] font-semibold tracking-[-0.065em] text-balance text-white sm:text-7xl lg:text-[5.2rem]">
                Turn a thought into a world.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-pretty text-white/64 sm:text-lg">
                Shape stills and motion with real generative models, inspect
                every decision, and keep your work private until you choose to
                share it.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/studio"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--action)] px-5 text-sm font-semibold text-[var(--action-ink)] transition hover:bg-[var(--action-hover)]"
                >
                  Enter the studio
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
                <a
                  href="#explore"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/14 bg-white/[0.045] px-5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
                >
                  Explore public work
                  <ArrowDown aria-hidden="true" className="size-4" />
                </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium tracking-[0.08em] text-white/45 uppercase">
              <span className="inline-flex items-center gap-1.5">
                <ImageIcon aria-hidden="true" className="size-3.5" /> Image
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Film aria-hidden="true" className="size-3.5" /> Video
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock aria-hidden="true" className="size-3.5" /> Private by
                default
              </span>
            </div>
          </div>

          <GenerationSceneLoader enabled={enabled} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--action)]/50 to-transparent" />
      </div>
    </section>
  );
}
