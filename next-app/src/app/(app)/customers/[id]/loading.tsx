import { Skeleton } from "@/components/ui";

/**
 * Customer file shell: hero panel, the three billing figures, a vehicle
 * grid and the first rows of the jobs list — the same rhythm the loaded
 * page uses, so arriving content slots in rather than shifting.
 *
 * No band for the condensed record bar: that bar sits in a zero-height sticky
 * rail and only floats in once the hero has scrolled away, so it reserves no
 * space here or on the loaded page.
 */
export default function CustomerDetailLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-[176px] rounded-[var(--r-panel)]" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Skeleton className="h-[116px]" />
        <Skeleton className="h-[116px]" />
        <Skeleton className="col-span-2 h-[116px] sm:col-span-1" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-24 rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Skeleton className="h-[108px]" />
          <Skeleton className="h-[108px]" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-32 rounded-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[70px]" />
        ))}
      </div>
    </div>
  );
}
