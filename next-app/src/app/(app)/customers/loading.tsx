import { Skeleton } from "@/components/ui";

/**
 * Registry shell: heading, the outstanding tile, the search field and six
 * rows at the real row height (70px) — so the page paints in place and
 * nothing jumps when the customers arrive.
 */
export default function CustomersLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-16 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      <Skeleton className="h-[124px] rounded-[var(--r-tile)]" />
      <Skeleton className="h-11 rounded-[var(--r-control)]" />

      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[70px]" />
        ))}
      </div>
    </div>
  );
}
