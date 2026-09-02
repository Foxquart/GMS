import { BentoGrid, Skeleton } from "@/components/ui";

/**
 * Paints the shape of the dashboard the instant the nav item is tapped.
 *
 * Every height here mirrors a real one in `page.tsx`, because the whole point
 * of the shell is that nothing moves when the data lands. It had drifted badly:
 * it painted a six-tile grid the page no longer has, missed the "Today"
 * heading entirely, drew the outstanding total as a plain row, and gave the
 * two card-shaped sections stacks of loose rows. Every one of those was a jump
 * on every visit.
 *
 * Unlike the list routes there is no `StickyControls` band to mirror — the
 * dashboard pins nothing on purpose (see the note in `page.tsx`), so this stays
 * a plain scrolling column or the real page would jump by the height of a
 * divider that never arrives.
 */

/**
 * A section heading: title left, "see all" link right.
 *
 * Every section on this page has both, so drawing only the title left a gap on
 * the right that filled in on load.
 */
function HeaderBar() {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <Skeleton className="h-5 w-36 rounded-full" />
      <Skeleton className="h-4 w-20 rounded-full" />
    </div>
  );
}

/** The row height shared by every feed on the dashboard. */
const ROW_H = "h-[4.75rem]";
const ROWS = 4;

export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading the dashboard">
      {/* Greeting and date. */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-52 rounded-full" />
        </div>
        <Skeleton className="mt-1 h-3 w-20 rounded-full" />
      </div>

      {/* "Today" heading — a real element on the page, above the grid. */}
      <HeaderBar />

      {/* The hero pair, the two small tiles, then stock across both columns. */}
      <BentoGrid>
        <Skeleton className="h-[9.5rem]" />
        <Skeleton className="h-[9.5rem]" />
        <Skeleton className="h-[6.25rem]" />
        <Skeleton className="h-[6.25rem]" />
        <Skeleton className="col-span-2 h-[11rem]" />
      </BentoGrid>

      {/* Outstanding credit: the total block leads, then named debtors, then
          the link to the rest. */}
      <section>
        <HeaderBar />
        <div className="space-y-2.5">
          <Skeleton className={ROW_H} />
          {Array.from({ length: ROWS }).map((_, i) => (
            <Skeleton key={i} className={ROW_H} />
          ))}
          <Skeleton className="h-11 rounded-[var(--r-tile)]" />
        </div>
      </section>

      {/* Active jobs and low shop stock: four rows and a "N more" foot each. */}
      {["jobs", "stock"].map((key) => (
        <section key={key}>
          <HeaderBar />
          <div className="space-y-2.5">
            {Array.from({ length: ROWS }).map((_, i) => (
              <Skeleton key={i} className={ROW_H} />
            ))}
            <Skeleton className="h-11 rounded-[var(--r-tile)]" />
          </div>
        </section>
      ))}

      {/* Parts used today: one bordered card — caption, four rows, total. */}
      <section>
        <HeaderBar />
        <Skeleton className="h-[17rem] rounded-[var(--r-card)]" />
      </section>

      {/* Recent invoices: one bordered list of four compact rows. */}
      <section>
        <HeaderBar />
        <Skeleton className="h-[13rem] rounded-[var(--r-card)]" />
      </section>
    </div>
  );
}
