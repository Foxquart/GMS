import { Skeleton, StickyControls } from "@/components/ui";

/** Mirrors admins/page.tsx: pinned title bar, strapline, count tiles, rows. */
export default function SuperadminAdminsLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading admin accounts…</span>
      <StickyControls className="top-[var(--console-sticky-top)] lg:top-[var(--console-sticky-top)]">
        <div className="flex items-center justify-between gap-3">
          {/* Narrower than the real heading below sm: at 320px a 160px title
              block plus the button block would not fit the gutters. */}
          <Skeleton className="h-7 w-32 rounded-full sm:w-48" />
          <Skeleton className="h-11 w-32 shrink-0 rounded-full sm:h-10" />
        </div>
      </StickyControls>
      <Skeleton className="h-4 w-full max-w-80 rounded-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="col-span-2 h-28 sm:col-span-1" />
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[170px] rounded-[var(--r-card)] sm:h-[104px]" />
        ))}
      </div>
    </div>
  );
}
