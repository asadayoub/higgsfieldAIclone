import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main
      className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-5 py-10 lg:px-8"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-8 h-16 max-w-2xl" />
      <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="aspect-[3/4]" />
        <Skeleton className="aspect-square" />
        <Skeleton className="aspect-[3/4]" />
        <Skeleton className="aspect-square" />
      </div>
    </main>
  );
}
