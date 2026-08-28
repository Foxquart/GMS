import { Skeleton } from "@/components/ui";

/**
 * Invoice shell: hero with the total, the four fact tiles, the line-item
 * card and the balance block — the loaded page's exact rhythm.
 */
export default function InvoiceDetailLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-[212px] rounded-[var(--r-panel)]" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-[240px] rounded-[var(--r-card)]" />
      </div>

      <Skeleton className="h-[136px] rounded-[var(--r-tile)]" />

      <div className="space-y-3">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-[62px]" />
        <Skeleton className="h-[62px]" />
      </div>
    </div>
  );
}
