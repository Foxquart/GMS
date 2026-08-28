import { Skeleton } from "@/components/ui";

/** Mirrors alerts/page.tsx: title block, two count tiles, alert rows. */
export default function SuperadminAlertsLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading system alerts…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-4 w-80 rounded-full" />
      </div>
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
