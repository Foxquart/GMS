import { BentoGrid, Skeleton } from "@/components/ui";

/**
 * Paints the shape of the dashboard the instant the nav item is tapped:
 * greeting block, the hero bento, then the list sections.
 *
 * Every height here mirrors the real one in `page.tsx` — the hero pair at
 * `min-h-[9.5rem]`, the two small tiles at the `size="sm"` height, the stock
 * tile spanning both columns, and five list sections. It had drifted: it was
 * painting a 44-height hero, four equal tiles and a report card that moved to
 * /reports, so every dashboard load visibly jumped as the real layout
 * replaced it.
 *
 * Unlike the list routes there is no `StickyControls` band to mirror here —
 * the dashboard pins nothing on purpose (see the note in `page.tsx`), so this
 * shell must stay a plain scrolling column or the real page would jump on
 * paint by the height of a divider that never arrives.
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
        <Skeleton className="h-[9.5rem]" />
        <Skeleton className="h-[9.5rem]" />
        <Skeleton className="h-[6.25rem]" />
        <Skeleton className="h-[6.25rem]" />
        {/* Stock on hand: one tile across both columns, taller than the pair
            above it because it carries a total, a unit line and two split
            rows. */}
        <Skeleton className="col-span-2 h-[11rem]" />
      </BentoGrid>

      {/* Five sections: outstanding credit, active jobs, low shop stock, parts
          used today and recent invoices. Row counts and heights match the
          in-page skeletons so the shell does not resize when data lands —
          parts-used rows are shorter than the rest. */}
      {[
        { rows: 3, height: "h-[4.75rem]" },
        { rows: 3, height: "h-[4.75rem]" },
        { rows: 3, height: "h-[4.75rem]" },
        { rows: 3, height: "h-[3.25rem]" },
      ].map((section, i) => (
        <div key={i} className="space-y-2.5">
          <Skeleton className="h-5 w-36 rounded-full" />
          {Array.from({ length: section.rows }).map((_, row) => (
            <Skeleton key={row} className={section.height} />
          ))}
        </div>
      ))}

      {/* Recent invoices is one bordered list rather than separate cards. */}
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="h-[11rem] rounded-[var(--r-card)]" />
      </div>
    </div>
  );
}
