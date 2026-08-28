import { BentoGrid, Skeleton } from "@/components/ui";

/**
 * Paints the shape of the dashboard the instant the nav item is tapped:
 * greeting block, the hero bento, the report card, then three list sections.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading the dashboard">
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-8 w-52 rounded-full" />
        <Skeleton className="h-4 w-64 rounded-full" />
      </div>

      <BentoGrid>
        <Skeleton className="col-span-2 h-44" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </BentoGrid>

      <div className="space-y-3">
        <Skeleton className="h-5 w-40 rounded-full" />
        <Skeleton className="h-12 rounded-full" />
        <Skeleton className="h-[19.5rem] rounded-[var(--r-card)]" />
      </div>

      {[0, 1, 2].map((section) => (
        <div key={section} className="space-y-2.5">
          <Skeleton className="h-5 w-36 rounded-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.75rem]" />
          ))}
        </div>
      ))}
    </div>
  );
}
