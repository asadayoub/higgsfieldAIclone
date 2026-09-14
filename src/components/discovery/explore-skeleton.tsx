import { Skeleton } from "@/components/ui/skeleton";

const ratios = [
  "aspect-[3/4]",
  "aspect-[14/9]",
  "aspect-square",
  "aspect-video",
];

export function ExploreSkeleton() {
  return (
    <div aria-label="Loading creations" aria-busy="true">
      <div className="mb-7 flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-12 flex-1 rounded-full" />
        <Skeleton className="h-12 w-full rounded-full sm:w-64" />
      </div>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {Array.from({ length: 10 }, (_, index) => (
          <div
            key={index}
            className="mb-4 break-inside-avoid overflow-hidden rounded-[1.25rem] border border-white/8 bg-[var(--panel)]"
          >
            <Skeleton className={`w-full rounded-none ${ratios[index % 4]}`} />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
