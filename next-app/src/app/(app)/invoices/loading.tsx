import { Skeleton, StickyControls } from "@/components/ui";

/**
 * Invoice book shell in the same order as the real page: the pinned bar
 * (heading, jobs link, search, status chips), then the awaiting-payment tile
 * and six rows at the real 78px row height.
 */
export default function InvoicesLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <StickyControls className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-2.5 w-14 rounded-full" />
            <Skeleton className="h-6 w-36 rounded-full" />
          </div>
          <Skeleton className="h-10 w-24 shrink-0 rounded-full" />
        </div>

        <Skeleton className="h-11 rounded-[var(--r-control)]" />

        <div className="flex gap-2 pb-1">
          {["w-14", "w-20", "w-24", "w-16", "w-20"].map((w, i) => (
            <Skeleton key={i} className={`h-8 shrink-0 rounded-full ${w}`} />
          ))}
        </div>
      </StickyControls>

      <Skeleton className="h-[124px] rounded-[var(--r-tile)]" />

      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[78px]" />
        ))}
      </div>
    </div>
  );
}
