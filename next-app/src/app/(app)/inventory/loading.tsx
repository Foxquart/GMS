import { Skeleton, StickyControls } from "@/components/ui";

/**
 * Shell of the inventory hub. The title row and the category panel scroll;
 * the location/status filters and the search are drawn with the same
 * `StickyControls` the page uses, so the list below starts at the same offset
 * once the data lands.
 */
export default function InventoryLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-4 w-64 rounded-full" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      </div>

      {/* The category grid, open by default, ahead of the parts controls. */}
      <Skeleton className="h-64 rounded-[var(--r-panel)]" />

      <StickyControls className="space-y-2.5">
        {/* Search on top, then the count with Filter and Sort beside it. */}
        <Skeleton className="h-11 rounded-[var(--r-control)]" />
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-16 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-[8.5rem] rounded-full" />
          </div>
        </div>
      </StickyControls>

      <div className="space-y-2.5">
        <Skeleton className="h-5 w-28 rounded-full" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[11.5rem]" />
          ))}
        </div>
      </div>
    </div>
  );
}
