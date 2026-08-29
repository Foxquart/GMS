import { Skeleton, StickyControls } from "@/components/ui";

/**
 * Shell of the inventory hub. The title row scrolls; the location/status
 * filters and the search are drawn with the same `StickyControls` the page
 * uses, so the list below starts at the same offset once the data lands.
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

      <StickyControls className="space-y-2.5">
        {/* Location pill on the left, status filter taking the rest.
            44px target plus the 4px track = 52px. */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-[52px] w-[118px] rounded-full" />
          <Skeleton className="h-[52px] flex-1 basis-[188px] rounded-full" />
        </div>
        <Skeleton className="h-11 rounded-[var(--r-control)]" />
      </StickyControls>

      <div className="space-y-2.5">
        <Skeleton className="h-5 w-28 rounded-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px]" />
        ))}
      </div>
    </div>
  );
}
