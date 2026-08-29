import { BentoGrid, Skeleton } from "@/components/ui";

/**
 * Hero panel, the six spec tiles, two line sections, notes panel, totals.
 *
 * No band for the condensed record bar: that bar sits in a zero-height sticky
 * rail and only floats in once the hero has scrolled away, so it reserves no
 * space here or on the loaded page.
 */
export default function JobDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5" role="status" aria-label="Loading this job">
      <Skeleton className="h-56 rounded-[var(--r-panel)]" />

      <BentoGrid className="grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </BentoGrid>

      {[0, 1].map((section) => (
        <div key={section} className="space-y-2">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-[3.75rem]" />
          <Skeleton className="h-[3.75rem]" />
        </div>
      ))}

      <Skeleton className="h-40 rounded-[var(--r-panel)]" />
      <Skeleton className="h-44 rounded-[var(--r-tile)]" />
    </div>
  );
}
