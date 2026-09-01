import { Skeleton } from "@/components/ui";

/** Mirrors the overview: title block, 5-tile bento, two side-by-side panels. */
export default function SuperadminOverviewLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Running system health checks…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-full max-w-52 rounded-full" />
        {/* A fixed w-80 is wider than the 288px content column on a 320px
            phone, so the shell itself scrolled the document sideways. */}
        <Skeleton className="h-4 w-full max-w-80 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Skeleton className="col-span-2 h-[132px] lg:col-span-4" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      {/* The activity panel no longer scrolls inside itself, so it is the
          taller of the pair and the row stretches the checks card to match
          it — the shell has to say the same thing or the card grows on paint.
          Both rows stack their meta below phone width, so both run taller
          there than they do once the columns split. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-[var(--r-card)] sm:h-52 lg:h-[26rem]" />
        <Skeleton className="h-[32rem] rounded-[var(--r-panel)] sm:h-[26rem]" />
      </div>
    </div>
  );
}
