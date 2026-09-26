import { cn } from "@/lib/cn";
import type { ShowcaseItem } from "@/lib/showcase/contracts";
import { ShowcaseCard } from "./showcase-card";

function placement(item: ShowcaseItem, index: number) {
  const portrait = item.height > item.width * 1.12;
  const landscape = item.width > item.height * 1.25;
  if (portrait) return "lg:col-span-3 lg:row-span-2";
  if (landscape && index % 7 === 0)
    return "sm:col-span-2 lg:col-span-6 lg:row-span-2";
  const cycle = index % 8;
  if (cycle === 3) return "sm:col-span-2 lg:col-span-5 lg:row-span-1";
  if (cycle === 5) return "lg:col-span-4 lg:row-span-2";
  if (cycle === 6) return "sm:col-span-2 lg:col-span-5 lg:row-span-1";
  return "lg:col-span-3 lg:row-span-1";
}

export function ShowcaseGrid({ items }: { items: ShowcaseItem[] }) {
  return (
    <div className="grid grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-[13rem] lg:grid-cols-12">
      {items.map((item, index) => (
        <div key={item.id} className={cn("min-w-0", placement(item, index))}>
          <ShowcaseCard item={item} />
        </div>
      ))}
    </div>
  );
}
