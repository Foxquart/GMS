import { Skeleton } from "@/components/ui";

/** Mirrors health/page.tsx: title, three latency tiles, two fact cards, a panel. */
export default function SuperadminHealthLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Benchmarking database and API latency…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-44 rounded-full" />
        <Skeleton className="h-4 w-80 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="col-span-2 h-[132px]" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-60 rounded-[var(--r-card)]" />
        <Skeleton className="h-60 rounded-[var(--r-card)]" />
      </div>
      <Skeleton className="h-44 rounded-[var(--r-panel)]" />
    </div>
  );
}
