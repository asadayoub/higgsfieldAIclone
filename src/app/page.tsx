import { Suspense } from "react";
import { ShowcaseSection } from "@/components/discovery/showcase-section";
import { ShowcaseSkeleton } from "@/components/discovery/showcase-skeleton";
import { GenerationHero } from "@/components/landing/generation-hero";
import { readServerEnv } from "@/config/env";

export default function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--page)] text-[var(--text)]">
      <GenerationHero enabled={readServerEnv().SHOWCASE_3D_ENABLED} />

      <div className="mx-auto max-w-[1600px] px-4 py-20 sm:px-5 lg:px-8 lg:py-28">
        <Suspense fallback={<ShowcaseSkeleton />}>
          <ShowcaseSection searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
