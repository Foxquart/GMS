import { Skeleton, StickyControls } from "@/components/ui";

/** Mirrors activity/page.tsx: pinned title bar, strapline, audit rows. */
export default function SuperadminActivityLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading the audit log…</span>
      <StickyControls className="top-16 lg:top-16">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-36 rounded-full" />
          <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
        </div>
      </StickyControls>
      <Skeleton className="h-4 w-80 rounded-full" />
      <div className="space-y-2">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-[74px] rounded-[var(--r-tile)]" />
        ))}
      </div>
    </div>
  );
}
