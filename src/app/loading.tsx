import { ExploreSkeleton } from "@/components/discovery/explore-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main
      className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1600px] px-4 py-4 sm:px-5 lg:px-8 lg:py-6"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="min-h-[34rem] overflow-hidden rounded-[1.75rem] border border-white/8 bg-[var(--panel)] p-7 sm:min-h-[38rem] lg:min-h-[43rem] lg:p-14">
        <Skeleton className="h-3 w-52" />
        <div className="mt-52 space-y-4 lg:mt-64">
          <Skeleton className="h-16 max-w-2xl" />
          <Skeleton className="h-16 max-w-xl" />
          <Skeleton className="h-5 max-w-md" />
        </div>
      </div>
      <div className="py-20 lg:py-28">
        <ExploreSkeleton />
      </div>
    </main>
  );
}
