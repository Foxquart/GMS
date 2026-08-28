import { Skeleton } from "@/components/ui";

/** Mirrors system/page.tsx: title block, four spec tiles, a runtime card. */
export default function SuperadminSystemLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Reading the runtime environment…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 rounded-full" />
        <Skeleton className="h-4 w-80 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-[var(--r-card)]" />
    </div>
  );
}
