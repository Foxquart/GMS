import { Skeleton, StickyControls } from "@/components/ui";

/** Mirrors alerts/page.tsx: pinned title bar, strapline, count tiles, rows. */
export default function SuperadminAlertsLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading system alerts…</span>
      <StickyControls className="top-16 lg:top-16">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
        </div>
      </StickyControls>
      <Skeleton className="h-4 w-80 rounded-full" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[112px] rounded-[var(--r-card)]" />
        ))}
      </div>
    </div>
  );
}
