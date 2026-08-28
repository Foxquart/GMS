import { Skeleton } from "@/components/ui";

/** Mirrors activity/page.tsx: title block over a stack of audit rows. */
export default function SuperadminActivityLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading the audit log…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-36 rounded-full" />
        <Skeleton className="h-4 w-80 rounded-full" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-[74px] rounded-[var(--r-tile)]" />
        ))}
      </div>
    </div>
  );
}
