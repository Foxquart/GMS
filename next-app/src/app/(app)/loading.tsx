import { Skeleton } from "@/components/ui";

/**
 * Generic route shell for any owner-facing segment that doesn't ship its
 * own loading.tsx. Neutral on purpose: a title block, a pair of tiles and
 * a short list — the rhythm every page in this app shares — so tapping a
 * nav item paints the destination's shape instead of freezing on the old
 * page. Segments with a distinctive layout override this locally.
 */
export default function AppLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading this page…</span>

      <div className="space-y-2">
        <Skeleton className="h-7 w-44 rounded-full" />
        <Skeleton className="h-4 w-60 rounded-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>

      <div className="space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[68px] rounded-[var(--r-card)]" />
        ))}
      </div>
    </div>
  );
}
