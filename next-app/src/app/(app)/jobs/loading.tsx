import { Skeleton, StickyControls } from "@/components/ui";

/**
 * Mirrors the real page: the title, "New job", search and status tabs live in
 * the pinned bar, and two day groups of job rows scroll underneath it. The
 * strapline placeholder only appears from lg, exactly as the real one does.
 */
export default function JobsLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading your jobs">
      <StickyControls className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-2.5 w-20 rounded-full" />
            <Skeleton className="h-6 w-44 rounded-full" />
            <Skeleton className="hidden h-4 w-72 max-w-full rounded-full lg:block" />
          </div>
          {/* "New job" is visible at every width now, so the shell reserves it. */}
          <Skeleton className="h-10 w-32 shrink-0 rounded-full" />
        </div>

        <div className="flex gap-2.5">
          <Skeleton className="h-11 flex-1 rounded-[var(--r-control)]" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>

        {/* The tab pill measures 40px: p-1 around a py-2 text-xs row. */}
        <Skeleton className="h-10 rounded-full" />
      </StickyControls>

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
