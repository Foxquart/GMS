import { Skeleton } from "@/components/ui";

/** Header, search, filter pill, then two day groups of job rows. */
export default function JobsLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading your jobs">
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-8 w-48 rounded-full" />
        <Skeleton className="h-4 w-72 rounded-full" />
      </div>

      <div className="flex gap-2.5">
        <Skeleton className="h-11 flex-1 rounded-[var(--r-control)]" />
        <Skeleton className="h-11 w-24 rounded-full" />
      </div>

      <Skeleton className="h-11 rounded-full" />

      <div className="space-y-6">
        {[3, 2].map((rows, group) => (
          <div key={group} className="space-y-2.5">
            <Skeleton className="h-4 w-full max-w-xs rounded-full" />
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
