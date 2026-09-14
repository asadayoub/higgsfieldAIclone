import { cn } from "@/lib/cn";
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-pulse rounded-xl bg-white/8", className)}
    />
  );
}
