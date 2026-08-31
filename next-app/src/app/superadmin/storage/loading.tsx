import { Skeleton } from "@/components/ui";

/** Mirrors storage/page.tsx: title, three size tiles, headroom, composition, table list. */
export default function SuperadminStorageLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Measuring database storage…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-4 w-96 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Skeleton className="col-span-2 h-[132px]" />
        <Skeleton className="h-[132px]" />
        <Skeleton className="h-[132px]" />
      </div>
      <Skeleton className="h-32 rounded-[var(--r-card)]" />
      <Skeleton className="h-64 rounded-[var(--r-card)]" />
      <Skeleton className="h-80 rounded-[var(--r-card)]" />
    </div>
  );
}
