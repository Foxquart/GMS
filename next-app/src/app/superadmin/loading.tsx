import { Skeleton } from "@/components/ui";

/** Mirrors the overview: title block, 5-tile bento, two side-by-side panels. */
export default function SuperadminOverviewLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Running system health checks…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-52 rounded-full" />
        <Skeleton className="h-4 w-80 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="col-span-2 h-[132px]" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      {/* The activity panel no longer scrolls inside itself, so it is the
          taller of the pair and the row stretches the checks card to match
          it — the shell has to say the same thing or the card grows on paint. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-[var(--r-card)] lg:h-[26rem]" />
        <Skeleton className="h-[26rem] rounded-[var(--r-panel)]" />
      </div>
    </div>
  );
}
