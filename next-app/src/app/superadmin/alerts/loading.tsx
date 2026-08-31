import { Skeleton, StickyControls } from "@/components/ui";

/** Mirrors alerts/page.tsx: pinned title bar, strapline, count tiles, rows. */
export default function SuperadminAlertsLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading system alerts…</span>
      {/* Same offset as the page: `top-16` cleared the operator bar but not the
          opaque tab strip that sits below it and a z-layer above. */}
      <StickyControls className="top-[var(--console-sticky-top,121px)] lg:top-[var(--console-sticky-top,121px)]">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-11 w-28 shrink-0 rounded-full sm:h-8" />
        </div>
      </StickyControls>
      {/* A fixed w-80 overflows the 288px content column on a 320px phone. */}
      <Skeleton className="h-4 w-full max-w-80 rounded-full" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-[var(--r-card)] sm:h-[112px]" />
        ))}
      </div>
    </div>
  );
}
