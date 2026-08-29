import { Skeleton, StickyControls } from "@/components/ui";

/**
 * Registry shell in the same order as the real page: the pinned bar (heading,
 * "New customer", search), then the outstanding tile and six rows at the real
 * row height (70px) — so nothing shifts when the customers arrive.
 */
export default function CustomersLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <StickyControls className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-2.5 w-16 rounded-full" />
            <Skeleton className="h-6 w-40 rounded-full" />
          </div>
          <Skeleton className="h-10 w-36 shrink-0 rounded-full" />
        </div>

        <Skeleton className="h-11 rounded-[var(--r-control)]" />
      </StickyControls>

      <Skeleton className="h-[124px] rounded-[var(--r-tile)]" />

      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[70px]" />
        ))}
      </div>
    </div>
  );
}
