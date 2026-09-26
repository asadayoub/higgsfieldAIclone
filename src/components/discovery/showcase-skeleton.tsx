const placements = [
  "sm:col-span-2 lg:col-span-6 lg:row-span-2",
  "lg:col-span-3 lg:row-span-2",
  "lg:col-span-3 lg:row-span-1",
  "lg:col-span-3 lg:row-span-1",
  "lg:col-span-4 lg:row-span-2",
  "sm:col-span-2 lg:col-span-5 lg:row-span-1",
];

export function ShowcaseSkeleton() {
  return (
    <div aria-label="Loading public showcase" aria-busy="true">
      <div className="mb-8 h-24 max-w-xl animate-pulse rounded-2xl bg-white/5" />
      <div className="grid grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-[13rem] lg:grid-cols-12">
        {placements.map((placement, index) => (
          <div
            key={`${placement}-${index}`}
            className={`${placement} min-h-[18rem] animate-pulse rounded-[1.35rem] border border-white/6 bg-white/[0.035] lg:min-h-0`}
          />
        ))}
      </div>
    </div>
  );
}
