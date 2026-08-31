import { Skeleton } from "@/components/ui";

/**
 * Shell of the reports page: heading with its back button, the period tabs
 * (now pinned above everything rather than sitting inside the first card),
 * then the three bands — money, work, stock.
 *
 * Heights mirror the real cards so the page does not resize under the reader
 * when the two queries land.
 */
export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-start gap-3">
        <Skeleton className="mt-1 h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-4 w-64 rounded-full" />
        </div>
      </div>

      {/* The pinned tab band. */}
      <Skeleton className="h-[46px] rounded-full" />

      {/* Band A — money: the figures card, then two breakdowns. */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="h-[15rem] rounded-[var(--r-card)]" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={`money-${i}`} className="space-y-3">
          <Skeleton className="h-5 w-44 rounded-full" />
          <Skeleton className="h-[8.5rem] rounded-[var(--r-card)]" />
        </div>
      ))}

      {/* Band B — work: the figures card, then the vehicle mix. */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="h-[12rem] rounded-[var(--r-card)]" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-[10rem] rounded-[var(--r-card)]" />
      </div>

      {/* Band C — stock: the sort chips, then the parts table. */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-40 rounded-full" />
        <Skeleton className="h-9 w-48 rounded-full" />
        <Skeleton className="h-56 rounded-[var(--r-card)]" />
      </div>
    </div>
  );
}
