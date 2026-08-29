import { Skeleton, StickyControls } from "@/components/ui";

/** Shell of the transfers page: title bar, direction, picker, move panel, history. */
export default function TransfersLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <StickyControls>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="hidden h-3 w-20 rounded-full sm:block" />
            <Skeleton className="h-7 w-40 rounded-full" />
          </div>
        </div>
      </StickyControls>

      {/* From → To */}
      <Skeleton className="h-[66px] rounded-[var(--r-tile)]" />

      {/* Search, category chips, a few results */}
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-11 rounded-[var(--r-control)]" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[62px]" />
        ))}
      </div>

      <Skeleton className="h-40 rounded-[var(--r-panel)]" />

      <div className="space-y-2">
        <Skeleton className="h-5 w-40 rounded-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px]" />
        ))}
      </div>
    </div>
  );
}
